import { createClient } from "@/lib/supabase/server";
import { getJobsListSummary } from "@/lib/queries/jobs";
import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";
import { JobCard } from "@/components/business/JobCard";
import { JobFilterChips } from "@/components/business/JobFilterChips";
import { NewJobForm } from "@/components/business/NewJobForm";

export default async function BusinessPage({
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

  const filtered = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "settled") return j.settled || j.status !== "open";
    return !j.settled && j.status === "open";
  });

  return (
    <div>
      <CashStrip />
      <PageHeader title="Business" subtitle="Jobs, staff, and what's outstanding." />

      <div className="mx-4 flex flex-wrap items-center justify-between gap-3 sm:mx-6">
        <JobFilterChips active={filter} />
        <NewJobForm eventTypes={(eventTypeRows ?? []).map((e) => e.name)} />
      </div>

      <div className="mx-4 mt-4 space-y-3 sm:mx-6">
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
    </div>
  );
}
