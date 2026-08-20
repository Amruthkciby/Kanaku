"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaiseBare } from "@/lib/money";
import { assignCategoryColors, OTHER_COLOR } from "@/lib/charts/colors";
import type { MemberCategorySpend } from "@/lib/queries/family-dashboard";

const MAX_SERIES = 6;

export function MemberSpendingChart({ data }: { data: MemberCategorySpend[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No spending in this period.</p>;
  }

  // Rank categories by total spend across all members; keep the top MAX_SERIES, fold the rest
  // into "Other" -- a 7th+ series is never a generated hue (dataviz skill non-negotiable).
  const totals = new Map<string, number>();
  for (const m of data) {
    for (const [cat, amt] of Object.entries(m.byCategory)) {
      totals.set(cat, (totals.get(cat) ?? 0) + amt);
    }
  }
  const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const topCategories = ranked.slice(0, MAX_SERIES).map(([c]) => c);
  const colorMap = assignCategoryColors(topCategories);

  const chartData = data.map((m) => {
    const row: Record<string, number | string> = { memberName: m.memberName };
    let other = 0;
    for (const [cat, amt] of Object.entries(m.byCategory)) {
      if (topCategories.includes(cat)) row[cat] = amt;
      else other += amt;
    }
    if (other > 0) row.Other = other;
    return row;
  });

  const hasOther = chartData.some((r) => "Other" in r);
  const seriesKeys = hasOther ? [...topCategories, "Other"] : topCategories;

  return (
    <div className="h-72 w-full overflow-x-auto">
      <div className="h-full min-w-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="memberName" tick={{ fill: "var(--color-slate)", fontSize: 12 }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
            <YAxis tick={{ fill: "var(--color-slate)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatPaiseBare(v)} width={56} />
            <Tooltip
              formatter={(value) => formatPaiseBare(Number(value))}
              contentStyle={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-slate)" }} />
            {seriesKeys.map((cat, i) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="spend"
                fill={cat === "Other" ? OTHER_COLOR : colorMap.get(cat)}
                radius={i === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
