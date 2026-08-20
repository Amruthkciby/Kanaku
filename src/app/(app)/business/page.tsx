import { createClient } from "@/lib/supabase/server";
import { getJobsListSummary } from "@/lib/queries/jobs";
import {
  getMonthlyBusinessFinancials,
  getProfitPerJob,
  getReceivablesAging,
  getPayablesByStaff,
  getCostStructure,
} from "@/lib/queries/business-dashboard";
import { resolvePeriod, type PeriodPreset } from "@/lib/dates";
import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";
import { JobCard } from "@/components/business/JobCard";
import { JobFilterChips } from "@/components/business/JobFilterChips";
import { NewJobForm } from "@/components/business/NewJobForm";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { RevenueCostChart } from "@/components/charts/RevenueCostChart";
import { ProfitPerJobChart } from "@/components/charts/ProfitPerJobChart";
import { AgingBuckets } from "@/components/dashboard/AgingBuckets";
import { CostStructureTable } from "@/components/dashboard/CostStructureTable";
import { formatPaise, paiseToRupees } from "@/lib/money";

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter === "settled" || sp.filter === "all" ? sp.filter : "open";
  const preset = (["this-month", "last-month", "quarter", "financial-year", "custom"] as const).includes(
    sp.period as PeriodPreset,
  )
    ? (sp.period as PeriodPreset)
    : "quarter";
  const period = resolvePeriod(preset, sp.from, sp.to);

  const supabase = await createClient();
  const [jobs, { data: eventTypeRows }, monthly, profitPerJob, payables] = await Promise.all([
    getJobsListSummary(supabase),
    supabase.from("event_types").select("name").order("name"),
    getMonthlyBusinessFinancials(supabase),
    getProfitPerJob(supabase),
    getPayablesByStaff(supabase),
  ]);

  const aging = getReceivablesAging(jobs);
  const costStructure = getCostStructure(jobs);
  const settledCount = jobs.filter((j) => j.settled || j.status !== "open").length;
  const openCount = jobs.filter((j) => !j.settled && j.status === "open").length;

  const filtered = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "settled") return j.settled || j.status !== "open";
    return !j.settled && j.status === "open";
  });

  return (
    <div className="pb-8">
      <CashStrip />
      <PageHeader title="Business" subtitle="Jobs, staff, and what's outstanding." />

      <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 sm:mx-6">
        <PeriodSelector current={preset} />
        <ExportCsvButton
          filename={`kanakku-business-${period.from}-to-${period.to}.csv`}
          headers={["Job", "Profit (₹)"]}
          rows={profitPerJob.map((p) => [p.title, paiseToRupees(p.profit)])}
        />
      </div>

      <div className="mx-4 space-y-8 sm:mx-6">
        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Profit per job</h2>
          <div className="rounded-xl border border-border bg-paper-raised p-4">
            <ProfitPerJobChart data={profitPerJob} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Revenue and cost</h2>
          <div className="rounded-xl border border-border bg-paper-raised p-4">
            <RevenueCostChart data={monthly} />
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Receivables outstanding</h2>
            <div className="rounded-xl border border-border bg-paper-raised p-4">
              <AgingBuckets buckets={aging} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg text-ink">Payables by staff</h2>
            <div className="rounded-xl border border-border bg-paper-raised">
              {payables.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate">Nothing owed.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {payables.map((p) => (
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
            <CostStructureTable rows={costStructure} />
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Jobs</h2>
            <p className="text-sm text-slate">
              {settledCount} settled · {openCount} open
            </p>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <JobFilterChips active={filter} />
            <NewJobForm eventTypes={(eventTypeRows ?? []).map((e) => e.name)} />
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-slate">
                No {filter === "all" ? "" : filter} jobs yet.
              </p>
            ) : (
              filtered.map((job) =>
                job.settled || job.status !== "open" ? (
                  <div key={job.jobId} className="rounded-xl border border-border bg-paper-raised">
                    <JobCard job={job} />
                  </div>
                ) : (
                  <JobCard key={job.jobId} job={job} />
                ),
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
