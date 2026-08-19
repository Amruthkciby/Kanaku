"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (!raw) return null;
  const rupees = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

/**
 * Creates a household (family-ledger) transaction. Direction is `expense` (money left, the
 * common case) or `income` (money arrived — a gift, a refund, etc.) — amount is stored signed
 * per brief section 7 (negative = left the account, positive = arrived).
 */
export async function createHouseholdEntry(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const amountPaise = parseAmount(formData.get("amount"));
  if (amountPaise === null) return { error: "Enter an amount greater than zero." };

  const direction = String(formData.get("direction") ?? "expense");
  const accountId = String(formData.get("accountId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "cash");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurredOn") ?? new Date().toISOString().slice(0, 10));

  if (!accountId || !memberId) return { error: "Pick an account and who this is for." };

  const { error } = await supabase.from("transactions").insert({
    account_id: accountId,
    occurred_on: occurredOn,
    amount: direction === "income" ? amountPaise : -amountPaise,
    ledger: "family",
    kind: "household",
    category,
    member_id: memberId,
    entered_by: user.id,
    mode: mode as "cash" | "upi" | "bank" | "cheque" | "card",
    note,
  });

  if (error) return { error: error.message };

  revalidatePath("/add");
  revalidatePath("/family");
  return { error: null };
}

export async function updateHouseholdEntry(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing entry id." };

  const amountPaise = parseAmount(formData.get("amount"));
  if (amountPaise === null) return { error: "Enter an amount greater than zero." };

  const direction = String(formData.get("direction") ?? "expense");
  const category = String(formData.get("category") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "cash");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: direction === "income" ? amountPaise : -amountPaise,
      category,
      mode: mode as "cash" | "upi" | "bank" | "cheque" | "card",
      note,
      occurred_on: occurredOn,
      member_id: memberId,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/add");
  revalidatePath("/family");
  return { error: null };
}

export async function softDeleteEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Soft-deletes go through an RPC, not a plain UPDATE -- see the comment in
  // supabase/migrations/20260101010001_soft_delete_functions.sql for why: an UPDATE that sets
  // deleted_at fails RLS on its own, because the resulting row immediately stops matching the
  // SELECT policy that filters out deleted rows.
  const { error } = await supabase.rpc("soft_delete_transaction", { p_id: id });

  if (error) return { error: error.message };

  revalidatePath("/add");
  revalidatePath("/family");
  return { error: null };
}

/**
 * Cash reconciliation (brief section 9.1): someone counts what's physically in the wallet, and
 * the difference against the recorded balance is written as a single "Cash — unaccounted" entry
 * — no itemising every small expense.
 */
export async function reconcileCash(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const accountId = String(formData.get("accountId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const actualRupees = Number(String(formData.get("actual") ?? "").replace(/,/g, ""));

  if (!accountId || !memberId || !Number.isFinite(actualRupees) || actualRupees < 0) {
    return { error: "Fill in the account, who's reconciling, and the counted amount." };
  }

  const { data: balances, error: balanceError } = await supabase.rpc("account_balances");
  if (balanceError) return { error: balanceError.message };

  const account = balances?.find((b) => b.account_id === accountId);
  if (!account) return { error: "Account not found." };

  const actualPaise = Math.round(actualRupees * 100);
  const diff = actualPaise - account.balance;

  if (diff === 0) {
    return { error: null };
  }

  const { error } = await supabase.from("transactions").insert({
    account_id: accountId,
    occurred_on: new Date().toISOString().slice(0, 10),
    amount: diff,
    ledger: "family",
    kind: "household",
    category: "Cash — unaccounted",
    member_id: memberId,
    entered_by: user.id,
    mode: "cash",
    note: "Cash reconciliation",
  });

  if (error) return { error: error.message };

  revalidatePath("/add");
  revalidatePath("/family");
  return { error: null };
}
