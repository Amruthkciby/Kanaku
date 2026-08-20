import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface StaffListRow {
  id: string;
  name: string;
  phone: string | null;
  defaultFee: number | null;
  totalOwed: number;
}

// Was N+1 (one round trip per staff member, each doing two more round trips) -- with a handful
// of staff that's still 10+ serial network calls, and every one of them pays full latency to the
// Supabase region, not just query time. Now three queries total regardless of staff count:
// staff, all their job_staff obligations, and all matching payout_allocations, joined in memory.
export async function getStaffList(supabase: Client): Promise<StaffListRow[]> {
  const [{ data: staff, error: staffError }, { data: obligations, error: obligationsError }] = await Promise.all([
    supabase.from("staff").select("id, name, phone, default_fee").is("deleted_at", null).order("name"),
    supabase.from("job_staff").select("id, staff_id, agreed_fee").is("deleted_at", null),
  ]);

  if (staffError) throw staffError;
  if (obligationsError) throw obligationsError;

  const obligationIds = (obligations ?? []).map((o) => o.id);
  const { data: allocations, error: allocationsError } =
    obligationIds.length > 0
      ? await supabase
          .from("payout_allocations")
          .select("job_staff_id, amount, transactions!inner(deleted_at)")
          .in("job_staff_id", obligationIds)
          .is("deleted_at", null)
          .is("transactions.deleted_at", null)
      : { data: [] as { job_staff_id: string; amount: number }[], error: null };

  if (allocationsError) throw allocationsError;

  const paidByJobStaff = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidByJobStaff.set(a.job_staff_id, (paidByJobStaff.get(a.job_staff_id) ?? 0) + a.amount);
  }

  const owedByStaff = new Map<string, number>();
  for (const o of obligations ?? []) {
    const paid = paidByJobStaff.get(o.id) ?? 0;
    owedByStaff.set(o.staff_id, (owedByStaff.get(o.staff_id) ?? 0) + (o.agreed_fee - paid));
  }

  return (staff ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    defaultFee: s.default_fee,
    totalOwed: owedByStaff.get(s.id) ?? 0,
  }));
}

export interface StaffLedgerEntry {
  id: string;
  kind: "obligation" | "payout";
  date: string;
  label: string;
  amount: number;
}

export interface StaffAccount {
  id: string;
  name: string;
  phone: string | null;
  entries: StaffLedgerEntry[];
  totalOwed: number;
  totalUnallocated: number;
}

export async function getStaffAccount(supabase: Client, staffId: string): Promise<StaffAccount | null> {
  const { data: staff } = await supabase.from("staff").select("id, name, phone").eq("id", staffId).single();
  if (!staff) return null;

  const { data: obligations } = await supabase
    .from("job_staff")
    .select("id, agreed_fee, role_label, jobs(title, event_date)")
    .eq("staff_id", staffId)
    .is("deleted_at", null);

  const { data: payouts } = await supabase
    .from("transactions")
    .select("id, occurred_on, amount, note, payout_allocations(id, job_staff_id, amount)")
    .eq("staff_id", staffId)
    .eq("kind", "staff_payout")
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false });

  const entries: StaffLedgerEntry[] = [];
  let totalAgreed = 0;

  for (const o of obligations ?? []) {
    const job = o.jobs as unknown as { title: string; event_date: string } | null;
    entries.push({
      id: o.id,
      kind: "obligation",
      date: job?.event_date ?? "",
      label: `${job?.title ?? "Job"}${o.role_label ? ` — ${o.role_label}` : ""}`,
      amount: o.agreed_fee,
    });
    totalAgreed += o.agreed_fee;
  }

  let totalPaid = 0;
  let totalUnallocated = 0;

  for (const p of payouts ?? []) {
    entries.push({
      id: p.id,
      kind: "payout",
      date: p.occurred_on,
      label: p.note ?? "Payout",
      amount: p.amount,
    });
    const allocated = (p.payout_allocations ?? []).reduce((sum, a) => sum + a.amount, 0);
    totalPaid += allocated;
    totalUnallocated += Math.abs(p.amount) - allocated;
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    entries,
    totalOwed: totalAgreed - totalPaid,
    totalUnallocated,
  };
}
