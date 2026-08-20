import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getJobDetail } from "@/lib/queries/job-detail";
import { PageHeader } from "@/components/PageHeader";
import { formatPaise } from "@/lib/money";
import { RecordClientPaymentForm, RecordJobExpenseForm, AddJobStaffForm } from "@/components/business/JobDetailForms";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const job = await getJobDetail(supabase, id);
  if (!job) notFound();

  const [{ data: accounts }, { data: categoryRows }, { data: staffRows }] = await Promise.all([
    supabase.from("accounts").select("id, label").order("is_primary", { ascending: false }),
    supabase.from("expense_categories").select("name").order("name"),
    supabase.from("staff").select("id, name, default_fee").is("deleted_at", null).order("name"),
  ]);

  const accountList = accounts ?? [];
  const categories = (categoryRows ?? []).map((c) => c.name);
  const staffList = (staffRows ?? []).map((s) => ({ id: s.id, name: s.name, defaultFee: s.default_fee }));

  const eventDate = new Date(job.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="pb-8">
      <PageHeader title={job.title} subtitle={`${job.clientName} · ${eventDate} · ${job.eventType}`} />

      <div className="mx-4 space-y-8 sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <section className="flex flex-wrap gap-4 rounded-xl border border-border bg-paper-raised p-4">
          <Stat label="Agreed" value={formatPaise(job.agreedAmount)} />
          <Stat label="Collected" value={formatPaise(job.collected)} />
          <Stat
            label="Still to collect"
            value={formatPaise(job.stillToCollect)}
            tone={job.stillToCollect > 0 ? "maroon" : "forest"}
          />
          <Stat label="Paid to staff" value={formatPaise(job.paidToStaff)} />
          <Stat label="Work expenses" value={formatPaise(job.jobExpensesTotal)} />
          <Stat label="Profit" value={formatPaise(job.profit)} tone={job.profit >= 0 ? "forest" : "maroon"} />
          <Stat label="Status" value={job.settled ? "Settled" : "Open"} tone={job.settled ? "forest" : undefined} />
        </section>

        {/* Two columns from the laptop breakpoint up -- four sections stacked in one column
            wasted most of a wide screen's width for no reason. */}
        <div className="space-y-8 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          <section>
            <h2 className="mb-3 font-display text-lg text-ink">Payments</h2>
            <RecordClientPaymentForm jobId={job.id} accounts={accountList} />
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-paper-raised">
              {job.payments.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate">No payments recorded yet.</li>
              ) : (
                job.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate">
                      {new Date(p.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                      {p.mode} {p.note ? `· ${p.note}` : ""}
                    </span>
                    <span className="font-numeric text-forest">{formatPaise(p.amount)}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg text-ink">Work expenses</h2>
            <RecordJobExpenseForm jobId={job.id} accounts={accountList} categories={categories} />
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-paper-raised">
              {job.expenses.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate">No expenses recorded yet.</li>
              ) : (
                job.expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate">
                      {new Date(e.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                      {e.category} {e.note ? `· ${e.note}` : ""}
                    </span>
                    <span className="font-numeric text-maroon">{formatPaise(e.amount)}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg text-ink">Staff assigned</h2>
            <AddJobStaffForm jobId={job.id} staff={staffList} />
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-paper-raised">
              {job.assignedStaff.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate">No one assigned yet.</li>
              ) : (
                job.assignedStaff.map((s) => {
                  const remaining = s.agreedFee - s.paid;
                  return (
                    <li key={s.jobStaffId} className="flex items-center justify-between px-4 py-3">
                      <span className="text-ink">
                        {s.staffName}
                        {s.roleLabel ? <span className="text-sm text-slate"> · {s.roleLabel}</span> : null}
                      </span>
                      <span className={`font-numeric text-sm ${remaining > 0 ? "text-brass" : "text-forest"}`}>
                        {remaining > 0 ? `${formatPaise(remaining)} owed` : "Paid"}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          {job.notes && (
            <section>
              <h2 className="mb-2 font-display text-lg text-ink">Notes</h2>
              <p className="text-sm text-slate">{job.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "maroon" | "forest" }) {
  const toneClass = tone === "maroon" ? "text-maroon" : tone === "forest" ? "text-forest" : "text-ink";
  return (
    <div>
      <p className="text-xs text-slate">{label}</p>
      <p className={`font-numeric text-lg ${toneClass}`}>{value}</p>
    </div>
  );
}
