"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaiseBare } from "@/lib/money";
import type { CategoryTotal } from "@/lib/queries/family-dashboard";

// Single hue, sorted, direct-labeled -- a ranked bar chart doesn't need one color per bar since
// the category names are the labels; a rainbow here would be color used for rank, not identity.
export function CategoryBreakdownChart({ data }: { data: CategoryTotal[] }) {
  const height = Math.max(160, data.length * 36);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No spending in this period.</p>;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" tick={{ fill: "var(--color-slate)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatPaiseBare(v)} />
          <YAxis dataKey="category" type="category" width={110} tick={{ fill: "var(--color-ink)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => formatPaiseBare(Number(value))}
            contentStyle={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--color-brass)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
