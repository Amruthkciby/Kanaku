"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ColumnMapping, NormalizedRow } from "@/lib/statements/parse";
import type { Database } from "@/lib/supabase/types";

type Json = Database["public"]["Tables"]["statement_txns"]["Row"]["raw_row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export interface ActionResult {
  error: string | null;
}

export interface UploadRowInput extends NormalizedRow {
  dedupeHash: string;
}

export interface CreateUploadResult {
  error: string | null;
  uploadId: string | null;
  insertedCount: number;
  skippedCount: number;
}

/**
 * Creates the upload record and bulk-inserts parsed rows, silently skipping ones that already
 * exist for this account (brief section 9.3: re-uploading an overlapping statement should create
 * zero duplicates). Also persists the column mapping so the next upload from this bank skips the
 * mapping step.
 */
export async function createStatementUpload(
  accountId: string,
  filename: string,
  headerSig: string,
  mapping: ColumnMapping,
  rows: UploadRowInput[],
): Promise<CreateUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out.", uploadId: null, insertedCount: 0, skippedCount: 0 };

  const { data: upload, error: uploadError } = await supabase
    .from("statement_uploads")
    .insert({ account_id: accountId, filename, uploaded_by: user.id, row_count: rows.length, status: "reviewing" })
    .select("id")
    .single();

  if (uploadError) return { error: uploadError.message, uploadId: null, insertedCount: 0, skippedCount: 0 };

  await supabase.from("column_mappings").upsert(
    { account_id: accountId, header_signature: headerSig, mapping: mapping as unknown as Json },
    { onConflict: "account_id,header_signature" },
  );

  const payload = rows.map((r) => ({
    upload_id: upload.id,
    account_id: accountId,
    txn_date: r.txnDate ?? "1970-01-01",
    narration: r.narration,
    ref_no: r.refNo,
    debit_amount: r.debitAmountPaise,
    credit_amount: r.creditAmountPaise,
    balance_after: r.balanceAfterPaise,
    raw_row: r.rawRow as unknown as Json,
    dedupe_hash: r.dedupeHash,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("statement_txns")
    .upsert(payload, { onConflict: "account_id,dedupe_hash", ignoreDuplicates: true })
    .select("id");

  if (insertError) return { error: insertError.message, uploadId: upload.id, insertedCount: 0, skippedCount: 0 };

  const insertedCount = inserted?.length ?? 0;
  await supabase.from("statement_uploads").update({ mapped_count: insertedCount }).eq("id", upload.id);

  revalidatePath("/business/import");
  return { error: null, uploadId: upload.id, insertedCount, skippedCount: rows.length - insertedCount };
}

export interface CommitRowInput {
  statementTxnId: string;
  ledger: "family" | "business";
  kind: "household" | "client_payment" | "staff_payout" | "job_expense" | "transfer";
  category: string | null;
  memberId: string | null;
  jobId: string | null;
  staffId: string | null;
  toAccountId: string | null; // transfer only
  saveRule: boolean;
  ruleToken: string | null;
}

export async function commitStatementRow(input: CommitRowInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { data: row } = await supabase
    .from("statement_txns")
    .select("account_id, txn_date, narration, debit_amount, credit_amount")
    .eq("id", input.statementTxnId)
    .single();
  if (!row) return { error: "Row not found." };

  const amount = row.credit_amount > 0 ? row.credit_amount : -row.debit_amount;
  if (amount === 0) return { error: "This row has no amount." };

  if (input.kind === "transfer") {
    if (!input.toAccountId) return { error: "Pick the destination account." };
    const groupId = crypto.randomUUID();

    const { data: leg1, error: leg1Error } = await supabase
      .from("transactions")
      .insert({
        account_id: row.account_id,
        occurred_on: row.txn_date,
        amount,
        ledger: input.ledger,
        kind: "transfer",
        transfer_group_id: groupId,
        entered_by: user.id,
        mode: "bank",
        note: row.narration,
        statement_txn_id: input.statementTxnId,
      })
      .select("id")
      .single();
    if (leg1Error) return { error: leg1Error.message };

    const { error: leg2Error } = await supabase.from("transactions").insert({
      account_id: input.toAccountId,
      occurred_on: row.txn_date,
      amount: -amount,
      ledger: input.ledger,
      kind: "transfer",
      transfer_group_id: groupId,
      entered_by: user.id,
      mode: "bank",
      note: row.narration,
    });
    if (leg2Error) return { error: leg2Error.message };

    await supabase
      .from("statement_txns")
      .update({ status: "mapped", mapped_transaction_id: leg1.id })
      .eq("id", input.statementTxnId);
  } else {
    const insertPayload: TransactionInsert = {
      account_id: row.account_id,
      occurred_on: row.txn_date,
      amount,
      ledger: input.ledger,
      kind: input.kind,
      entered_by: user.id,
      mode: "bank",
      note: row.narration,
      statement_txn_id: input.statementTxnId,
    };
    if (input.kind === "household") {
      insertPayload.member_id = input.memberId;
      insertPayload.category = input.category;
    }
    if (input.kind === "job_expense") {
      insertPayload.job_id = input.jobId;
      insertPayload.category = input.category;
    }
    if (input.kind === "client_payment") insertPayload.job_id = input.jobId;
    if (input.kind === "staff_payout") insertPayload.staff_id = input.staffId;

    const { data: txn, error: txnError } = await supabase.from("transactions").insert(insertPayload).select("id").single();
    if (txnError) return { error: txnError.message };

    await supabase
      .from("statement_txns")
      .update({ status: "mapped", mapped_transaction_id: txn.id })
      .eq("id", input.statementTxnId);
  }

  if (input.saveRule && input.ruleToken) {
    await supabase.from("mapping_rules").insert({
      match_type: "contains",
      pattern: input.ruleToken,
      ledger: input.ledger,
      kind: input.kind === "transfer" ? "transfer" : input.kind,
      default_category: input.category,
      default_job_id: input.jobId,
      default_staff_id: input.staffId,
    });
  }

  revalidatePath("/business/import");
  revalidatePath("/family");
  revalidatePath("/business");
  return { error: null };
}

export async function ignoreStatementRow(statementTxnId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("statement_txns").update({ status: "ignored" }).eq("id", statementTxnId);
  if (error) return { error: error.message };

  revalidatePath("/business/import");
  return { error: null };
}

export async function bulkIgnoreStatementRows(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("statement_txns").update({ status: "ignored" }).in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/business/import");
  return { error: null };
}
