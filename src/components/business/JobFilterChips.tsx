import Link from "next/link";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
  { key: "all", label: "All" },
] as const;

export function JobFilterChips({ active }: { active: string }) {
  return (
    <div className="flex gap-2">
      {FILTERS.map((f) => (
        <Link
          key={f.key}
          href={f.key === "open" ? "/business" : `/business?filter=${f.key}`}
          className={`min-h-11 flex items-center rounded-full px-4 text-sm font-medium ${
            active === f.key ? "bg-ink text-paper-raised" : "border border-border text-slate"
          }`}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
