"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaiseBare } from "@/lib/money";
import type { MonthlyIncomeExpense } from "@/lib/queries/family-dashboard";

export function IncomeExpenseChart({ data }: { data: MonthlyIncomeExpense[] }) {
  return (
    <div className="h-72 w-full overflow-x-auto">
      <div className="h-full min-w-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--color-slate)", fontSize: 12 }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
            <YAxis
              tick={{ fill: "var(--color-slate)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatPaiseBare(v)}
              width={56}
            />
            <Tooltip
              formatter={(value) => formatPaiseBare(Number(value))}
              contentStyle={{
                background: "var(--color-paper-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-slate)" }} />
            <Bar dataKey="income" name="Income" fill="var(--color-forest)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="Expense" fill="var(--color-maroon)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
