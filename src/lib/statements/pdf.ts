// Client-side PDF bank statement extraction (brief section 9.3: "Accept .pdf with a
// text-extraction attempt, failing with a clear message asking for a CSV or XLSX export when the
// PDF is a scan"). Runs entirely in the browser, same as the CSV/XLSX path — the file never
// reaches the server.
//
// PDF text extraction loses table structure (a PDF has no concept of "rows" or "columns", only
// positioned glyphs), so this reconstructs a grid the standard way: group items into lines by Y
// position, then work out fixed column bands from the X-positions used *across the whole table*
// and slot each row's text into those bands. The result is fed through the exact same
// headerSignature/autoDetectMapping/normalizeRows pipeline as CSV/XLSX (see parse.ts).
//
// A naive per-row "split on X-gaps" approach breaks the moment a row has an empty cell — and a
// bank statement row almost always has an empty Debit or Credit cell (every real transaction is
// one or the other, never both). A blank cell simply has no text item at that position, so
// sequential gap-splitting silently drops it and every later column on that row shifts left.
// Deriving fixed bands first avoids that: an empty cell in a row just means nothing lands in
// that band, not that the row has fewer cells than expected.

import type { ParsedSheet } from "./parse";

const ROW_Y_TOLERANCE = 3;
const WORD_GAP_THRESHOLD = 10; // gap within a row that still counts as "same cell"
const COLUMN_BAND_TOLERANCE = 15; // how close two cell x-starts must be to count as the same column

interface PositionedItem {
  text: string;
  x: number;
  y: number;
  endX: number;
}

interface CellCandidate {
  text: string;
  x: number;
}

export class ScannedPdfError extends Error {
  constructor() {
    super("This looks like a scanned PDF (no extractable text) — export a CSV or XLSX from your bank instead.");
  }
}

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}

function groupIntoLines(items: PositionedItem[]): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedItem[][] = [];
  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= ROW_Y_TOLERANCE);
    if (line) line.push(item);
    else lines.push([item]);
  }
  return lines;
}

/** Merges adjacent same-line items into cell candidates (still variable-length per row). */
function lineToCellCandidates(line: PositionedItem[]): CellCandidate[] {
  const sortedLine = [...line].sort((a, b) => a.x - b.x);
  const cells: CellCandidate[] = [];
  let current = "";
  let cellStartX = 0;
  let lastEndX: number | null = null;

  for (const item of sortedLine) {
    if (lastEndX !== null && item.x - lastEndX > WORD_GAP_THRESHOLD) {
      cells.push({ text: current.trim(), x: cellStartX });
      current = "";
    }
    if (current === "") cellStartX = item.x;
    current += (current && !current.endsWith(" ") ? " " : "") + item.text;
    lastEndX = item.endX;
  }
  if (current.trim()) cells.push({ text: current.trim(), x: cellStartX });
  return cells;
}

/** Clusters cell x-starts (from every row) into a fixed, left-to-right list of column bands. */
function deriveColumnBands(allCells: CellCandidate[][]): number[] {
  const xs = allCells.flat().map((c) => c.x).sort((a, b) => a - b);
  const bands: number[] = [];
  for (const x of xs) {
    if (bands.length === 0 || x - bands[bands.length - 1] > COLUMN_BAND_TOLERANCE) {
      bands.push(x);
    }
  }
  return bands;
}

function bandIndexFor(x: number, bands: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  bands.forEach((b, i) => {
    const d = Math.abs(x - b);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export async function extractTableFromPdf(file: File): Promise<ParsedSheet> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const perLineCells: CellCandidate[][] = [];
  let totalTextLength = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PositionedItem[] = content.items
      .filter((it): it is typeof it & { str: string; transform: number[]; width: number } => "str" in it && it.str.trim() !== "")
      .map((it) => ({
        text: it.str,
        x: it.transform[4],
        y: it.transform[5],
        endX: it.transform[4] + it.width,
      }));

    totalTextLength += items.reduce((s, it) => s + it.text.length, 0);
    for (const line of groupIntoLines(items)) {
      perLineCells.push(lineToCellCandidates(line));
    }
  }

  if (totalTextLength < 20) {
    throw new ScannedPdfError();
  }

  // Column bands are derived from every line's cells combined, so a band still exists for a
  // column even on the (common) rows where that particular cell is blank.
  const bands = deriveColumnBands(perLineCells);
  const allRows: string[][] = perLineCells.map((cells) => {
    const row = new Array(bands.length).fill("");
    for (const cell of cells) {
      row[bandIndexFor(cell.x, bands)] = cell.text;
    }
    return row;
  });

  // Same header-detection heuristic as CSV/XLSX (parse.ts's readSpreadsheet): the first row in
  // the first ~10 that looks like a header (several non-numeric cells).
  let headerIndex = 0;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i] ?? [];
    const nonEmpty = row.filter((c) => c.trim() !== "");
    const looksLikeHeader = nonEmpty.length >= 3 && nonEmpty.every((c) => Number.isNaN(Number(c.replace(/,/g, ""))));
    if (looksLikeHeader) {
      headerIndex = i;
      break;
    }
  }

  const headers = allRows[headerIndex] ?? [];
  const rows = allRows.slice(headerIndex + 1);

  if (headers.filter((h) => h.trim() !== "").length < 3) {
    throw new ScannedPdfError();
  }

  return { headers, rows };
}
