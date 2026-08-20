"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { PeriodPreset } from "@/lib/dates";

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "quarter", label: "Quarter" },
  { key: "financial-year", label: "Financial year" },
  { key: "custom", label: "Custom" },
];

export function PeriodSelector({ current }: { current: PeriodPreset }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPreset(preset: PeriodPreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    if (preset !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustomDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => setPreset(p.key)}
          className={`min-h-9 rounded-full px-3 text-xs font-medium ${
            current === p.key ? "bg-ink text-paper-raised" : "border border-border text-slate"
          }`}
        >
          {p.label}
        </button>
      ))}
      {current === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={(e) => setCustomDate("from", e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-paper-raised px-2 text-xs text-ink"
          />
          <span className="text-xs text-slate">to</span>
          <input
            type="date"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={(e) => setCustomDate("to", e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-paper-raised px-2 text-xs text-ink"
          />
        </div>
      )}
    </div>
  );
}
