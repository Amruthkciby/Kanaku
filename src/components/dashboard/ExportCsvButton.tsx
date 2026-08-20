"use client";

import { toCsv, downloadCsv } from "@/lib/csv";

export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, toCsv(headers, rows))}
      className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-ink"
    >
      Export CSV
    </button>
  );
}
