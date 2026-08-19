"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

/**
 * A drawing: business money becomes family money with no account balance change (brief section
 * 2). Always business -> family; if money genuinely flows the other way, that's a capital
 * contribution, not a drawing with a flipped sign — see createCapitalContribution.
 */
export async function createDrawing(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const takenBy = String(formData.get("takenBy") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const rupees = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));

  if (!takenBy) return { error: "Pick who's taking this." };
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("drawings").insert({
    amount: Math.round(rupees * 100),
    occurred_on: new Date().toISOString().slice(0, 10),
    taken_by: takenBy,
    note,
  });

  if (error) return { error: error.message };

  revalidatePath("/more");
  revalidatePath("/family");
  revalidatePath("/business");
  return { error: null };
}

export async function createCapitalContribution(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const fromMemberId = String(formData.get("fromMemberId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const rupees = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));

  if (!fromMemberId) return { error: "Pick who's contributing." };
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("capital_contributions").insert({
    amount: Math.round(rupees * 100),
    occurred_on: new Date().toISOString().slice(0, 10),
    from_member_id: fromMemberId,
    note,
  });

  if (error) return { error: error.message };

  revalidatePath("/more");
  revalidatePath("/family");
  revalidatePath("/business");
  return { error: null };
}
