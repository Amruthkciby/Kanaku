"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

function parsePositiveRupees(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function createJob(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim() || null;
  const eventDate = String(formData.get("eventDate") ?? "");
  const eventType = String(formData.get("eventType") ?? "Other");
  const agreedAmount = parsePositiveRupees(formData.get("agreedAmount"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !clientName || !eventDate) return { error: "Title, client name, and event date are required." };
  if (agreedAmount === null) return { error: "Enter a valid agreed amount." };

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      title,
      client_name: clientName,
      client_phone: clientPhone,
      event_date: eventDate,
      event_type: eventType,
      agreed_amount: agreedAmount,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/business");
  redirect(`/business/jobs/${job.id}`);
}

export async function updateJobStatus(jobId: string, status: "open" | "settled" | "cancelled"): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) return { error: error.message };

  revalidatePath("/business");
  revalidatePath(`/business/jobs/${jobId}`);
  return { error: null };
}

export async function softDeleteJob(jobId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_job", { p_id: jobId });
  if (error) return { error: error.message };

  revalidatePath("/business");
  return { error: null };
}

export async function recordClientPayment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const jobId = String(formData.get("jobId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const mode = String(formData.get("mode") ?? "bank");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurredOn") ?? new Date().toISOString().slice(0, 10));
  const amount = parsePositiveRupees(formData.get("amount"));

  if (!jobId || !accountId) return { error: "Missing job or account." };
  if (!amount || amount <= 0) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("transactions").insert({
    account_id: accountId,
    occurred_on: occurredOn,
    amount,
    ledger: "business",
    kind: "client_payment",
    job_id: jobId,
    entered_by: user.id,
    mode: mode as "cash" | "upi" | "bank" | "cheque" | "card",
    note,
  });

  if (error) return { error: error.message };

  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business");
  return { error: null };
}

export async function recordJobExpense(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out — sign in and try again." };

  const jobId = String(formData.get("jobId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "cash");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurredOn") ?? new Date().toISOString().slice(0, 10));
  const amount = parsePositiveRupees(formData.get("amount"));

  if (!jobId || !accountId) return { error: "Missing job or account." };
  if (!amount || amount <= 0) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("transactions").insert({
    account_id: accountId,
    occurred_on: occurredOn,
    amount: -amount,
    ledger: "business",
    kind: "job_expense",
    job_id: jobId,
    category,
    entered_by: user.id,
    mode: mode as "cash" | "upi" | "bank" | "cheque" | "card",
    note,
  });

  if (error) return { error: error.message };

  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business");
  return { error: null };
}

export async function addJobStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const jobId = String(formData.get("jobId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");
  const roleLabel = String(formData.get("roleLabel") ?? "").trim() || null;
  const agreedFee = parsePositiveRupees(formData.get("agreedFee"));

  if (!jobId || !staffId) return { error: "Pick a staff member." };
  if (agreedFee === null) return { error: "Enter a valid fee." };

  const { error } = await supabase.from("job_staff").insert({
    job_id: jobId,
    staff_id: staffId,
    role_label: roleLabel,
    agreed_fee: agreedFee,
  });

  if (error) return { error: error.message };

  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business");
  return { error: null };
}
