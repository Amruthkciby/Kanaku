import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface JobDetail {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  eventDate: string;
  eventType: string;
  status: string;
  agreedAmount: number;
  notes: string | null;
  payments: { id: string; occurredOn: string; amount: number; mode: string; note: string | null }[];
  expenses: { id: string; occurredOn: string; amount: number; category: string | null; note: string | null }[];
  assignedStaff: { jobStaffId: string; staffId: string; staffName: string; roleLabel: string | null; agreedFee: number; paid: number }[];
  collected: number;
  stillToCollect: number;
  jobExpensesTotal: number;
  paidToStaff: number;
  profit: number;
  settled: boolean;
}

export async function getJobDetail(supabase: Client, jobId: string): Promise<JobDetail | null> {
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job) return null;

  const [{ data: transactions }, { data: jobStaff }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, kind, occurred_on, amount, mode, category, note")
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("job_staff")
      .select("id, staff_id, role_label, agreed_fee, staff(name)")
      .eq("job_id", jobId)
      .is("deleted_at", null),
  ]);

  const payments = (transactions ?? [])
    .filter((t) => t.kind === "client_payment")
    .map((t) => ({ id: t.id, occurredOn: t.occurred_on, amount: t.amount, mode: t.mode, note: t.note }));

  const expenses = (transactions ?? [])
    .filter((t) => t.kind === "job_expense")
    .map((t) => ({ id: t.id, occurredOn: t.occurred_on, amount: -t.amount, category: t.category, note: t.note }));

  const jobStaffIds = (jobStaff ?? []).map((js) => js.id);
  const { data: allocations } =
    jobStaffIds.length > 0
      ? await supabase
          .from("payout_allocations")
          .select("job_staff_id, amount, transactions!inner(deleted_at)")
          .in("job_staff_id", jobStaffIds)
          .is("deleted_at", null)
          .is("transactions.deleted_at", null)
      : { data: [] as { job_staff_id: string; amount: number }[] };

  const paidByJobStaff = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidByJobStaff.set(a.job_staff_id, (paidByJobStaff.get(a.job_staff_id) ?? 0) + a.amount);
  }

  const assignedStaff = (jobStaff ?? []).map((js) => ({
    jobStaffId: js.id,
    staffId: js.staff_id,
    staffName: (js.staff as unknown as { name: string } | null)?.name ?? "",
    roleLabel: js.role_label,
    agreedFee: js.agreed_fee,
    paid: paidByJobStaff.get(js.id) ?? 0,
  }));

  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const jobExpensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const paidToStaff = assignedStaff.reduce((s, a) => s + a.paid, 0);
  const stillToCollect = job.agreed_amount - collected;
  const staffFullyPaid = assignedStaff.every((a) => a.agreedFee - a.paid === 0);

  return {
    id: job.id,
    title: job.title,
    clientName: job.client_name,
    clientPhone: job.client_phone,
    eventDate: job.event_date,
    eventType: job.event_type,
    status: job.status,
    agreedAmount: job.agreed_amount,
    notes: job.notes,
    payments,
    expenses,
    assignedStaff,
    collected,
    stillToCollect,
    jobExpensesTotal,
    paidToStaff,
    profit: collected - paidToStaff - jobExpensesTotal,
    settled: stillToCollect === 0 && staffFullyPaid,
  };
}
