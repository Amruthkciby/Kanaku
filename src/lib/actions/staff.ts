"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

export async function createStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const defaultFeeRaw = String(formData.get("defaultFee") ?? "").trim();
  const defaultFee = defaultFeeRaw ? Math.round(Number(defaultFeeRaw.replace(/,/g, "")) * 100) : null;

  if (!name) return { error: "Give the staff member a name." };

  const { error } = await supabase.from("staff").insert({ name, phone, default_fee: defaultFee });
  if (error) return { error: error.message };

  revalidatePath("/business/staff");
  return { error: null };
}

export async function softDeleteStaff(staffId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_staff", { p_id: staffId });
  if (error) return { error: error.message };

  revalidatePath("/business/staff");
  return { error: null };
}
