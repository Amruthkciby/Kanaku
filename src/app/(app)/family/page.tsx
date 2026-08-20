import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { resolvePeriod, type PeriodPreset } from "@/lib/dates";
import {
  getMonthlyIncomeExpense,
  getCategoryBreakdown,
  getMemberSpendingByCategory,
  getTopTransactions,
  getCategoryDeltas,
} from "@/lib/queries/family-dashboard";
import { getFamilyDrawingsFeed } from "@/lib/queries/derived";
import {
  getMonthlyBusinessFinancials,
  getProfitPerJob,
  getReceivablesAging,
  getPayablesByStaff,
  getCostStructure,
} from "@/lib/queries/business-dashboard";
import { getJobsListSummary } from "@/lib/queries/jobs";
import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { MemberSpendingChart } from "@/components/charts/MemberSpendingChart";
import { RevenueCostChart } from "@/components/charts/RevenueCostChart";
import { ProfitPerJobChart } from "@/components/charts/ProfitPerJobChart";
import { AgingBuckets } from "@/components/dashboard/AgingBuckets";
import { CostStructureTable } from "@/components/dashboard/CostStructureTable";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { formatPaise, paiseToRupees } from "@/lib/money";

export default async function DashboardPage({
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
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);

  const [monthly, categories, memberSpend, topTxns, deltas, drawings, business] = await Promise.all([
    getMonthlyIncomeExpense(supabase),
    getCategoryBreakdown(supabase, period.from, period.to),
    getMemberSpendingByCategory(supabase, period.from, period.to),
    getTopTransactions(supabase, period.from, period.to),
    getCategoryDeltas(supabase, period.from, period.to),
    getFamilyDrawingsFeed(supabase, period.from, period.to),
    owner
      ? Promise.all([
          getMonthlyBusinessFinancials(supabase),
          getProfitPerJob(supabase),
          getJobsListSummary(supabase),
          getPayablesByStaff(supabase),
        ]).then(([revenueCost, profitPerJob, jobs, payables]) => ({
          revenueCost,
          profitPerJob,
          aging: getReceivablesAging(jobs),
          costStructure: getCostStructure(jobs),
          payables,
        }))
      : Promise.resolve(null),
  ]);

  return (
    <div className="pb-8">
      <CashStrip />
      <PageHeader title="Dashboard" subtitle="Income, spending, and who's spending it." />

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

      {business && (
        <div className="mx-4 mt-12 space-y-8 border-t-2 border-border pt-8 sm:mx-6">
          <div>
            <h2 className="font-display text-xl text-ink">Business</h2>
            <p className="text-sm text-slate">Kept separate from the family figures above — never added together.</p>
          </div>

          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Profit per job</h2>
            <div className="rounded-xl border border-border bg-paper-raised p-4">
              <ProfitPerJobChart data={business.profitPerJob} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Revenue and cost</h2>
            <div className="rounded-xl border border-border bg-paper-raised p-4">
              <RevenueCostChart data={business.revenueCost} />
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="mb-2 font-display text-lg text-ink">Receivables outstanding</h2>
              <div className="rounded-xl border border-border bg-paper-raised p-4">
                <AgingBuckets buckets={business.aging} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-display text-lg text-ink">Payables by staff</h2>
              <div className="rounded-xl border border-border bg-paper-raised">
                {business.payables.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate">Nothing owed.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {business.payables.map((p) => (
                      <li key={p.staffId} className="flex items-center justify-between px-4 py-3">
                        <span className="text-ink">{p.name}</span>
                        <span className="font-numeric text-sm text-brass">{formatPaise(p.owed)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Cost structure per job</h2>
            <div className="rounded-xl border border-border bg-paper-raised p-4">
              <CostStructureTable rows={business.costStructure} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
