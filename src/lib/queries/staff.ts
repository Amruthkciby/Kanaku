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

export async function getStaffList(supabase: Client): Promise<StaffListRow[]> {
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, phone, default_fee")
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;

  const results: StaffListRow[] = [];
  for (const s of staff ?? []) {
    const owed = await getStaffTotalOwed(supabase, s.id);
    results.push({ id: s.id, name: s.name, phone: s.phone, defaultFee: s.default_fee, totalOwed: owed });
  }
  return results;
}

async function getStaffTotalOwed(supabase: Client, staffId: string): Promise<number> {
  const { data: obligations } = await supabase
    .from("job_staff")
    .select("id, agreed_fee")
    .eq("staff_id", staffId)
    .is("deleted_at", null);

  const ids = (obligations ?? []).map((o) => o.id);
  if (ids.length === 0) return 0;

  const { data: allocations } = await supabase
    .from("payout_allocations")
    .select("job_staff_id, amount, transactions!inner(deleted_at)")
    .in("job_staff_id", ids)
    .is("deleted_at", null)
    .is("transactions.deleted_at", null);

  const paidById = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidById.set(a.job_staff_id, (paidById.get(a.job_staff_id) ?? 0) + a.amount);
  }

  return (obligations ?? []).reduce((sum, o) => sum + (o.agreed_fee - (paidById.get(o.id) ?? 0)), 0);
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
