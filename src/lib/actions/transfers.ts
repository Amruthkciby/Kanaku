"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

/**
 * A transfer between two accounts — not income or expense (brief section 2). Two rows sharing a
 * transfer_group_id, one negative and one positive, same ledger on both legs since a transfer
 * doesn't change whose money it is, only where it physically sits.
 */
export async function createTransfer(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const ledger = String(formData.get("ledger") ?? "family");
  const note = String(formData.get("note") ?? "").trim() || null;
  const rupees = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));

  if (!fromAccountId || !toAccountId) return { error: "Pick both accounts." };
  if (fromAccountId === toAccountId) return { error: "Pick two different accounts." };
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: "Enter an amount greater than zero." };

  const amountPaise = Math.round(rupees * 100);
  const occurredOn = new Date().toISOString().slice(0, 10);
  const transferGroupId = crypto.randomUUID();

  const { error } = await supabase.from("transactions").insert([
    {
      account_id: fromAccountId,
      occurred_on: occurredOn,
      amount: -amountPaise,
      ledger: ledger as "family" | "business",
      kind: "transfer",
      transfer_group_id: transferGroupId,
      entered_by: user.id,
      mode: "bank",
      note,
    },
    {
      account_id: toAccountId,
      occurred_on: occurredOn,
      amount: amountPaise,
      ledger: ledger as "family" | "business",
      kind: "transfer",
      transfer_group_id: transferGroupId,
      entered_by: user.id,
      mode: "bank",
      note,
    },
  ]);

  if (error) return { error: error.message };

  revalidatePath("/more");
  revalidatePath("/family");
  revalidatePath("/business");
  return { error: null };
}
