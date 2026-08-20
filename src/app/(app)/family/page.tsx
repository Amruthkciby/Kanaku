import { createClient } from "@/lib/supabase/server";
import { resolvePeriod, type PeriodPreset } from "@/lib/dates";
import {
  getMonthlyIncomeExpense,
  getCategoryBreakdown,
  getMemberSpendingByCategory,
  getTopTransactions,
  getCategoryDeltas,
} from "@/lib/queries/family-dashboard";
import { getFamilyDrawingsFeed } from "@/lib/queries/derived";
import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { MemberSpendingChart } from "@/components/charts/MemberSpendingChart";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { formatPaise, paiseToRupees } from "@/lib/money";

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset = (["this-month", "last-month", "quarter", "financial-year", "custom"] as const).includes(
    sp.period as PeriodPreset,
  )
    ? (sp.period as PeriodPreset)
    : "this-month";
  const period = resolvePeriod(preset, sp.from, sp.to);

  const supabase = await createClient();
  const [monthly, categories, memberSpend, topTxns, deltas, drawings] = await Promise.all([
    getMonthlyIncomeExpense(supabase),
    getCategoryBreakdown(supabase, period.from, period.to),
    getMemberSpendingByCategory(supabase, period.from, period.to),
    getTopTransactions(supabase, period.from, period.to),
    getCategoryDeltas(supabase, period.from, period.to),
    getFamilyDrawingsFeed(supabase, period.from, period.to),
  ]);

  return (
    <div className="pb-8">
      <CashStrip />
      <PageHeader title="Family" subtitle="Income, spending, and who's spending it." />

      <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 sm:mx-6">
        <PeriodSelector current={preset} />
        <ExportCsvButton
          filename={`kanakku-family-${period.from}-to-${period.to}.csv`}
          headers={["Date", "Category", "Member", "Note", "Amount (₹)"]}
          rows={topTxns.map((t) => [t.occurredOn, t.category ?? "", t.memberName, t.note ?? "", paiseToRupees(t.amount)])}
        />
      </div>

      <div className="mx-4 space-y-8 sm:mx-6">
        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Income vs expense</h2>
          <div className="rounded-xl border border-border bg-paper-raised p-4">
            <IncomeExpenseChart data={monthly} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Where it went — {period.label}</h2>
          <div className="rounded-xl border border-border bg-paper-raised p-4">
            <CategoryBreakdownChart data={categories} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Who&apos;s spending it</h2>
          <div className="rounded-xl border border-border bg-paper-raised p-4">
            <MemberSpendingChart data={memberSpend} />
          </div>
        </section>

        {deltas.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Change vs. previous period</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
              {deltas.map((d) => (
                <li key={d.category} className="flex items-center justify-between px-4 py-3">
                  <span className="text-ink">{d.category}</span>
                  <span className={`font-numeric text-sm ${d.delta > 0 ? "text-maroon" : "text-forest"}`}>
                    {d.delta > 0 ? "▲" : d.delta < 0 ? "▼" : "—"} {formatPaise(Math.abs(d.delta))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {drawings.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg text-ink">From the business</h2>
            <p className="mb-2 text-sm text-slate">Money the family received from the business — a transfer, not income.</p>
            <div className="rounded-xl border border-border bg-paper-raised">
              <TransactionList
                rows={drawings.map((d, i) => ({
                  id: String(i),
                  occurredOn: d.occurredOn,
                  amount: d.amount,
                  label: d.note ?? "Drawing",
                }))}
                emptyText="No drawings this period."
              />
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Largest transactions</h2>
          <div className="rounded-xl border border-border bg-paper-raised">
            <TransactionList
              rows={topTxns.map((t) => ({
                id: t.id,
                occurredOn: t.occurredOn,
                amount: t.amount,
                label: t.category ?? "Other",
                sublabel: t.memberName,
              }))}
              emptyText="No transactions this period."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
