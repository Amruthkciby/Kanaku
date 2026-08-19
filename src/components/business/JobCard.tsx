import Link from "next/link";
import { formatPaise } from "@/lib/money";
import type { JobSummary } from "@/lib/queries/jobs";

export function JobCard({ job }: { job: JobSummary }) {
  const eventDate = new Date(job.eventDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (job.settled || job.status !== "open") {
    return (
      <Link
        href={`/business/jobs/${job.jobId}`}
        className="flex items-center justify-between px-4 py-3 text-slate hover:text-ink sm:px-6"
      >
        <span>
          {job.title} <span className="text-sm">· {job.clientName}</span>
        </span>
        <span className="text-sm capitalize">{job.status === "open" ? "Settled" : job.status}</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/business/jobs/${job.jobId}`}
      className="block rounded-xl border border-border bg-paper-raised p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">{job.title}</p>
          <p className="text-sm text-slate">
            {job.clientName} · {eventDate}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.stillToCollect > 0 && (
          <span className="font-numeric rounded-full bg-maroon-soft px-3 py-1 text-sm font-medium text-maroon">
            {formatPaise(job.stillToCollect)} to collect
          </span>
        )}
        {job.stillToPayStaff > 0 && (
          <span className="font-numeric rounded-full bg-brass-soft px-3 py-1 text-sm font-medium text-brass">
            {formatPaise(job.stillToPayStaff)} to pay out
          </span>
        )}
      </div>
    </Link>
  );
}
