"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaise, formatPaiseBare } from "@/lib/money";
import type { ProfitPerJob } from "@/lib/queries/business-dashboard";

// The headline chart (brief section 9.4): "the number the studio does not currently have."
// Diverging by sign, not identity, so profit=forest / loss=maroon reuses the same two status
// hues as everywhere else in the app rather than introducing a third meaning for color.
export function ProfitPerJobChart({ data }: { data: ProfitPerJob[] }) {
  const height = Math.max(200, data.length * 40);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No jobs with revenue yet.</p>;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" tick={{ fill: "var(--color-slate)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatPaiseBare(v)} />
          <YAxis dataKey="title" type="category" width={140} tick={{ fill: "var(--color-ink)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => formatPaise(Number(value))}
            contentStyle={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="profit" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? "var(--color-forest)" : "var(--color-maroon)"} />
            ))}
            <LabelList dataKey="profit" position="right" formatter={(v) => formatPaiseBare(Number(v))} style={{ fill: "var(--color-ink)", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
