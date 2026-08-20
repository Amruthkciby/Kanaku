import { formatPaise } from "@/lib/money";

interface Row {
  id: string;
  occurredOn: string;
  amount: number;
  label: string;
  sublabel?: string;
}

export function TransactionList({ rows, emptyText }: { rows: Row[]; emptyText: string }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-ink">{r.label}</p>
            {r.sublabel && <p className="text-sm text-slate">{r.sublabel}</p>}
            <p className="text-xs text-slate">
              {new Date(r.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <span className={`font-numeric ${r.amount < 0 ? "text-maroon" : "text-forest"}`}>
            {r.amount < 0 ? "−" : "+"}
            {formatPaise(Math.abs(r.amount))}
          </span>
        </li>
      ))}
    </ul>
  );
}
