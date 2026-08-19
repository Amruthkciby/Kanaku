"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

/**
 * Records a staff payout and auto-allocates it FIFO across that staff member's open obligations
 * (oldest event first) — brief section 9.2. A staff member is paid in lumps across several jobs,
 * not per job, so the payout itself carries no job_id; payout_allocations is what ties the money
 * to the obligations it settles. Any amount left over after every obligation is covered stays
 * unallocated — a visible advance credit on the staff account, not an error.
 */
export async function recordStaffPayout(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const staffId = String(formData.get("staffId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const mode = String(formData.get("mode") ?? "bank");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurredOn") ?? new Date().toISOString().slice(0, 10));
  const rupees = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));

  if (!staffId || !accountId) return { error: "Pick a staff member and an account." };
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: "Enter an amount greater than zero." };

  const amountPaise = Math.round(rupees * 100);

  const { data: obligations, error: obligationsError } = await supabase
    .from("job_staff")
    .select("id, agreed_fee, jobs(event_date)")
    .eq("staff_id", staffId)
    .is("deleted_at", null);

  if (obligationsError) return { error: obligationsError.message };

  const obligationIds = (obligations ?? []).map((o) => o.id);
  const { data: allocations, error: allocationsError } =
    obligationIds.length > 0
      ? await supabase
          .from("payout_allocations")
          .select("job_staff_id, amount, transactions!inner(deleted_at)")
          .in("job_staff_id", obligationIds)
          .is("deleted_at", null)
          .is("transactions.deleted_at", null)
      : { data: [], error: null };

  if (allocationsError) return { error: allocationsError.message };

  const paidByObligation = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidByObligation.set(a.job_staff_id, (paidByObligation.get(a.job_staff_id) ?? 0) + a.amount);
  }

  const openObligations = (obligations ?? [])
    .map((o) => ({
      id: o.id,
      eventDate: (o.jobs as unknown as { event_date: string } | null)?.event_date ?? "9999-99-99",
      remaining: o.agreed_fee - (paidByObligation.get(o.id) ?? 0),
    }))
    .filter((o) => o.remaining > 0)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const { data: payoutTxn, error: txnError } = await supabase
    .from("transactions")
    .insert({
      account_id: accountId,
      occurred_on: occurredOn,
      amount: -amountPaise,
      ledger: "business",
      kind: "staff_payout",
      staff_id: staffId,
      entered_by: user.id,
      mode: mode as "cash" | "upi" | "bank" | "cheque" | "card",
      note,
    })
    .select("id")
    .single();

  if (txnError) return { error: txnError.message };

  let remainingPayout = amountPaise;
  const newAllocations: { transaction_id: string; job_staff_id: string; amount: number }[] = [];

  for (const obligation of openObligations) {
    if (remainingPayout <= 0) break;
    const allocate = Math.min(obligation.remaining, remainingPayout);
    newAllocations.push({ transaction_id: payoutTxn.id, job_staff_id: obligation.id, amount: allocate });
    remainingPayout -= allocate;
  }

  if (newAllocations.length > 0) {
    const { error: insertAllocError } = await supabase.from("payout_allocations").insert(newAllocations);
    if (insertAllocError) return { error: insertAllocError.message };
  }

  revalidatePath("/business/staff");
  revalidatePath("/business");
  return { error: null };
}

/** Removes a payout and its allocations, restoring the affected job balances (brief section 9.2). */
export async function deleteStaffPayout(transactionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: txn } = await supabase.from("transactions").select("staff_id").eq("id", transactionId).single();

  const { error } = await supabase.rpc("soft_delete_staff_payout", { p_transaction_id: transactionId });
  if (error) return { error: error.message };

  revalidatePath("/business/staff");
  if (txn?.staff_id) revalidatePath(`/business/staff/${txn.staff_id}`);
  revalidatePath("/business");
  return { error: null };
}
