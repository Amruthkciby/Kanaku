"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

/**
 * Creates an account. If opened with a non-zero balance, that balance is recorded as an
 * opening_balance transaction (not the accounts.opening_balance column alone) — see the design
 * note in supabase/migrations/20260101000010_views_and_functions.sql for why: an opening balance
 * is money, and money needs a ledger classification like everything else.
 */
export async function createAccount(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const label = String(formData.get("label") ?? "").trim();
  const kind = String(formData.get("kind") ?? "bank");
  const ownerMemberId = String(formData.get("ownerMemberId") ?? "") || null;
  const openingLedger = String(formData.get("openingLedger") ?? "family");
  const openingRupees = Number(String(formData.get("openingBalance") ?? "0").replace(/,/g, ""));

  if (!label) return { error: "Give the account a name." };
  if (!Number.isFinite(openingRupees) || openingRupees < 0) return { error: "Opening balance can't be negative." };

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({
      label,
      kind: kind as "bank" | "cash" | "wallet",
      owner_member_id: ownerMemberId,
      opening_balance: Math.round(openingRupees * 100),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const openingPaise = Math.round(openingRupees * 100);
  if (openingPaise > 0) {
    const { error: txnError } = await supabase.from("transactions").insert({
      account_id: account.id,
      occurred_on: new Date().toISOString().slice(0, 10),
      amount: openingPaise,
      ledger: openingLedger as "family" | "business",
      kind: "opening_balance",
      entered_by: user.id,
      mode: "bank",
      note: "Opening balance",
    });
    if (txnError) return { error: txnError.message };
  }

  revalidatePath("/more");
  revalidatePath("/family");
  revalidatePath("/business");
  return { error: null };
}
