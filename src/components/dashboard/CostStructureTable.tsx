import type { CostStructureRow } from "@/lib/queries/business-dashboard";

export function CostStructureTable({ rows }: { rows: CostStructureRow[] }) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-slate">No jobs with revenue yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.jobId}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink">{r.title}</span>
            <span className="text-xs text-slate">
              {r.staffPct}% staff · {r.expensesPct}% expenses · {r.marginPct}% margin
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-paper" role="img" aria-label={`${r.title}: ${r.staffPct}% staff, ${r.expensesPct}% expenses, ${r.marginPct}% margin`}>
            <div style={{ width: `${Math.max(0, r.staffPct)}%`, background: "var(--color-brass)" }} />
            <div style={{ width: `${Math.max(0, r.expensesPct)}%`, background: "var(--color-maroon)" }} className="ml-0.5" />
            <div style={{ width: `${Math.max(0, r.marginPct)}%`, background: "var(--color-forest)" }} className="ml-0.5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
