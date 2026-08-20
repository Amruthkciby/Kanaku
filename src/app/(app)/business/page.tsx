import { createClient } from "@/lib/supabase/server";
import { getJobsListSummary } from "@/lib/queries/jobs";
import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";
import { JobCard } from "@/components/business/JobCard";
import { JobFilterChips } from "@/components/business/JobFilterChips";
import { NewJobForm } from "@/components/business/NewJobForm";

// The business "home screen" (brief section 9.2) -- a working list, not analytics. Dashboard
// charts (including the business ones, for the owner) live on the merged /family dashboard.
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter = filterParam === "settled" || filterParam === "all" ? filterParam : "open";

  const supabase = await createClient();
  const [jobs, { data: eventTypeRows }] = await Promise.all([
    getJobsListSummary(supabase),
    supabase.from("event_types").select("name").order("name"),
  ]);

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
      <PageHeader title="Jobs" subtitle="What's outstanding, at a glance." />

      <div className="mx-4 mb-2 flex items-center justify-between sm:mx-6">
        <JobFilterChips active={filter} />
        <p className="text-sm text-slate">
          {settledCount} settled · {openCount} open
        </p>
      </div>
      <div className="mx-4 mb-4 sm:mx-6">
        <NewJobForm eventTypes={(eventTypeRows ?? []).map((e) => e.name)} />
      </div>

      <div className="mx-4 grid grid-cols-1 gap-3 sm:mx-6 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-slate lg:col-span-2 xl:col-span-3">
            No {filter === "all" ? "" : filter} jobs yet.
          </p>
        ) : (
          filtered.map((job) =>
            job.settled || job.status !== "open" ? (
              <div key={job.jobId} className="rounded-xl border border-border bg-paper-raised lg:col-span-2 xl:col-span-3">
                <JobCard job={job} />
              </div>
            ) : (
              <JobCard key={job.jobId} job={job} />
            ),
          )
        )}
      </div>
    </div>
  );
}
