"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  readSpreadsheet,
  headerSignature,
  autoDetectMapping,
  normalizeRows,
  computeDedupeHash,
  type ColumnMapping,
  type ColumnKey,
} from "@/lib/statements/parse";
import { extractTableFromPdf, ScannedPdfError } from "@/lib/statements/pdf";
import { createStatementUpload } from "@/lib/actions/statements";
import { createClient } from "@/lib/supabase/client";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
  amount: "Amount (signed)",
  reference: "Reference",
  balance: "Balance",
};

type Step = "pick" | "extracting" | "map" | "uploading" | "done";

export function UploadWizard({ accounts }: { accounts: { id: string; label: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);
  const [allRows, setAllRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number; uploadId: string } | null>(null);

  async function handleFileSelected(selected: File) {
    setError(null);

    let h: string[];
    let rows: unknown[][];

    try {
      if (/\.pdf$/i.test(selected.name)) {
        setStep("extracting");
        const extracted = await extractTableFromPdf(selected);
        h = extracted.headers;
        rows = extracted.rows;
      } else {
        const parsed = await readSpreadsheet(selected);
        h = parsed.headers;
        rows = parsed.rows;
      }
    } catch (err) {
      setError(err instanceof ScannedPdfError ? err.message : "Couldn't read that file — try a CSV or XLSX export instead.");
      setStep("pick");
      return;
    }

    setFile(selected);
    setHeaders(h);
    setAllRows(rows);
    setPreviewRows(rows.slice(0, 10));

    const supabase = createClient();
    const sig = headerSignature(h);
    const { data: saved } = await supabase
      .from("column_mappings")
      .select("mapping")
      .eq("account_id", accountId)
      .eq("header_signature", sig)
      .maybeSingle();

    setMapping((saved?.mapping as ColumnMapping | undefined) ?? autoDetectMapping(h));
    setStep("map");
  }

  async function handleConfirmMapping() {
    if (!file) return;
    setStep("uploading");
    setError(null);

    try {
      const normalized = normalizeRows(headers, allRows, mapping);
      const withHashes = await Promise.all(
        normalized.map(async (r) => ({ ...r, dedupeHash: await computeDedupeHash(accountId, r) })),
      );

      const res = await createStatementUpload(accountId, file.name, headerSignature(headers), mapping, withHashes);

      if (res.error) {
        console.error("createStatementUpload error:", res.error);
        setError(res.error);
        setStep("map");
        return;
      }

      setResult({ inserted: res.insertedCount, skipped: res.skippedCount, uploadId: res.uploadId! });
      setStep("done");
    } catch (err) {
      console.error("handleConfirmMapping threw:", err);
      setError(err instanceof Error ? err.message : String(err));
      setStep("map");
    }
  }

  if (step === "pick") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-paper-raised p-5">
        <div>
          <p className="mb-1 text-xs text-slate">Account</p>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate">Statement file (.csv, .xlsx, or .pdf)</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            className="text-sm text-ink"
          />
        </div>
        {error && <p className="text-sm text-maroon">{error}</p>}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-paper-raised p-5">
        <p className="text-sm text-slate">
          Match each column. First {previewRows.length} rows shown for reference.
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
            <div key={key}>
              <p className="mb-1 text-xs text-slate">{COLUMN_LABELS[key]}</p>
              <select
                value={mapping[key] ?? ""}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))
                }
                className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink"
              >
                <option value="">—</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-paper">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-slate">
                    {h || `Column ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className="border-t border-border">
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-ink">
                      {String(row[ci] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-maroon">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmMapping}
            disabled={mapping.date === undefined || (mapping.debit === undefined && mapping.amount === undefined)}
            className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised disabled:opacity-50"
          >
            Import {allRows.length} rows
          </button>
          <button type="button" onClick={() => setStep("pick")} className="min-h-11 rounded-lg px-4 text-sm text-slate">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "extracting") {
    return <p className="text-sm text-slate">Reading the PDF and pulling out the transaction table…</p>;
  }

  if (step === "uploading") {
    return <p className="text-sm text-slate">Uploading…</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-paper-raised p-5">
      <p className="text-ink">
        {result?.inserted} new rows imported
        {result && result.skipped > 0 ? `, ${result.skipped} already-imported rows skipped.` : "."}
      </p>
      <button
        type="button"
        onClick={() => router.push(`/business/import/${result?.uploadId}`)}
        className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised"
      >
        Review now
      </button>
    </div>
  );
}
