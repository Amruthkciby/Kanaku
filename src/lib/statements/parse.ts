// Client-side statement parsing (brief section 4: files never leave the household's device, and
// section 9.3: Indian bank exports have wildly inconsistent headers). Everything here runs in
// the browser — the server only ever receives already-normalised rows.

import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: unknown[][];
}

export async function readSpreadsheet(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  // No cellDates: true -- SheetJS's own date coercion assumes MM/DD/YYYY for ambiguous text
  // dates, which silently misreads the DD/MM/YYYY format every Indian bank export uses. Leaving
  // dates as raw numbers (real .xlsx serials) or strings (CSV) and parsing them ourselves via
  // parseFlexibleDate (below) is what actually gets DD/MM/YYYY right.
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });

  // Bank exports often have a title/blank row or two before the real header row — use the first
  // row that looks like a header (mostly non-numeric cells, at least 3 columns).
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? [];
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "");
    const looksLikeHeader = nonEmpty.length >= 3 && nonEmpty.every((c) => typeof c !== "number");
    if (looksLikeHeader) {
      headerIndex = i;
      break;
    }
  }

  const headers = (rows[headerIndex] ?? []).map((h) => String(h ?? "").trim());
  const dataRows = rows.slice(headerIndex + 1);

  return { headers, rows: dataRows };
}

/** Deterministic signature for a header row, used to look up a saved column mapping. */
export function headerSignature(headers: string[]): string {
  return headers.map((h) => h.trim().toLowerCase()).join("|");
}

export type ColumnKey = "date" | "narration" | "debit" | "credit" | "amount" | "reference" | "balance";

export type ColumnMapping = Partial<Record<ColumnKey, number>>;

const KEYWORDS: Record<ColumnKey, string[]> = {
  date: ["date", "txn date", "transaction date", "value date"],
  narration: ["narration", "description", "particulars", "details", "remarks", "transaction remarks"],
  // No bare "dr"/"cr" here -- as short substrings they false-match unrelated headers (e.g.
  // "Description" contains "cr"). Bank exports almost always spell out Debit/Credit/Withdrawal/
  // Deposit in full; a header that truly only says "Dr"/"Cr" falls back to manual mapping.
  debit: ["debit", "withdrawal", "withdrawal amt"],
  credit: ["credit", "deposit", "deposit amt"],
  amount: ["amount"],
  reference: ["ref", "reference", "cheque no", "chq/ref no", "utr", "txn id"],
  balance: ["balance", "closing balance", "available balance"],
};

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lower = headers.map((h) => h.toLowerCase());

  for (const key of Object.keys(KEYWORDS) as ColumnKey[]) {
    const idx = lower.findIndex((h) => KEYWORDS[key].some((kw) => h.includes(kw)));
    if (idx !== -1) mapping[key] = idx;
  }

  // If both debit/credit are missing but a generic "amount" column exists, don't also guess
  // debit/credit from it — the review step lets a human resolve ambiguity either way.
  return mapping;
}

function excelSerialToISODate(serial: number): string {
  // Excel's epoch is 1899-12-30 (accounting for the historical leap-year bug).
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + serial * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parses a variety of date formats Indian bank exports actually use. */
export function parseFlexibleDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return excelSerialToISODate(value);

  const text = String(value).trim();

  // ISO: 2026-01-31
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (the common Indian bank formats)
  const match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (match) {
    const [, d, m, yRaw] = match;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

function parseAmountToPaise(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const text = String(value).replace(/,/g, "").replace(/[₹\s]/g, "").trim();
  if (!text || text === "-") return 0;
  const num = Number(text);
  return Number.isFinite(num) ? Math.round(Math.abs(num) * 100) : 0;
}

export interface NormalizedRow {
  txnDate: string | null;
  narration: string;
  refNo: string | null;
  debitAmountPaise: number;
  creditAmountPaise: number;
  balanceAfterPaise: number | null;
  rawRow: Record<string, unknown>;
}

export function normalizeRows(headers: string[], rows: unknown[][], mapping: ColumnMapping): NormalizedRow[] {
  return rows
    .filter((row) => row.some((c) => c !== null && c !== undefined && String(c).trim() !== ""))
    .map((row) => {
      const rawRow: Record<string, unknown> = {};
      headers.forEach((h, i) => (rawRow[h || `col_${i}`] = row[i]));

      const txnDate = mapping.date !== undefined ? parseFlexibleDate(row[mapping.date]) : null;
      const narration = mapping.narration !== undefined ? String(row[mapping.narration] ?? "").trim() : "";
      const refNo = mapping.reference !== undefined ? String(row[mapping.reference] ?? "").trim() || null : null;
      const balanceRaw = mapping.balance !== undefined ? row[mapping.balance] : undefined;
      const balanceAfterPaise = balanceRaw !== undefined && balanceRaw !== "" ? parseAmountToPaise(balanceRaw) : null;

      let debitAmountPaise = 0;
      let creditAmountPaise = 0;

      if (mapping.debit !== undefined || mapping.credit !== undefined) {
        debitAmountPaise = mapping.debit !== undefined ? parseAmountToPaise(row[mapping.debit]) : 0;
        creditAmountPaise = mapping.credit !== undefined ? parseAmountToPaise(row[mapping.credit]) : 0;
      } else if (mapping.amount !== undefined) {
        const raw = row[mapping.amount];
        const text = String(raw ?? "").replace(/,/g, "").trim();
        const num = Number(text.replace(/[₹\s]/g, ""));
        if (Number.isFinite(num)) {
          if (num < 0) debitAmountPaise = Math.round(Math.abs(num) * 100);
          else creditAmountPaise = Math.round(num * 100);
        }
      }

      return { txnDate, narration, refNo, debitAmountPaise, creditAmountPaise, balanceAfterPaise, rawRow };
    });
}

export async function computeDedupeHash(
  accountId: string,
  row: Pick<NormalizedRow, "txnDate" | "narration" | "refNo" | "debitAmountPaise" | "creditAmountPaise">,
): Promise<string> {
  const material = `${accountId}|${row.txnDate ?? ""}|${row.debitAmountPaise}|${row.creditAmountPaise}|${row.narration}|${row.refNo ?? ""}`;
  const bytes = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
