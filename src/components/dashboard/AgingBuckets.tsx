import { formatPaise } from "@/lib/money";
import type { AgingBucket } from "@/lib/queries/business-dashboard";

const LABELS: Record<AgingBucket["bucket"], string> = {
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "60+": "60+ days",
};

export function AgingBuckets({ buckets }: { buckets: AgingBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  if (total === 0) {
    return <p className="py-4 text-center text-sm text-slate">Nothing outstanding.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {buckets.map((b) => (
        <div key={b.bucket} className={`rounded-lg p-3 ${b.bucket === "60+" && b.amount > 0 ? "bg-maroon-soft" : "bg-paper"}`}>
          <p className="text-xs text-slate">{LABELS[b.bucket]}</p>
          <p className={`font-numeric text-lg ${b.bucket === "60+" && b.amount > 0 ? "text-maroon" : "text-ink"}`}>
            {formatPaise(b.amount)}
          </p>
          <p className="text-xs text-slate">
            {b.jobCount} job{b.jobCount === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  );
}
