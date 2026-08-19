import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface StatementTxnRow {
  id: string;
  accountId: string;
  txnDate: string;
  narration: string | null;
  refNo: string | null;
  debitAmount: number;
  creditAmount: number;
  status: string;
  suggestion: {
    ledger: string;
    kind: string;
    category: string | null;
    jobId: string | null;
    staffId: string | null;
  } | null;
}

export async function getUploadProgress(supabase: Client, uploadId: string) {
  const { data } = await supabase
    .from("statement_txns")
    .select("status")
    .eq("upload_id", uploadId)
    .is("deleted_at", null);

  const total = data?.length ?? 0;
  const reviewed = (data ?? []).filter((r) => r.status !== "unreviewed").length;
  return { total, reviewed };
}

export async function getReviewRows(supabase: Client, uploadId: string): Promise<StatementTxnRow[]> {
  const { data: rows } = await supabase
    .from("statement_txns")
    .select("id, account_id, txn_date, narration, ref_no, debit_amount, credit_amount, status")
    .eq("upload_id", uploadId)
    .eq("status", "unreviewed")
    .is("deleted_at", null)
    .order("debit_amount", { ascending: false })
    .order("credit_amount", { ascending: false });

  const { data: rules } = await supabase
    .from("mapping_rules")
    .select("match_type, pattern, ledger, kind, default_category, default_job_id, default_staff_id, priority")
    .is("deleted_at", null)
    .order("priority", { ascending: true });

  function matchRule(narration: string) {
    for (const rule of rules ?? []) {
      if (rule.match_type === "contains" && narration.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return rule;
      }
      if (rule.match_type === "regex") {
        try {
          if (new RegExp(rule.pattern, "i").test(narration)) return rule;
        } catch {
          // invalid user-entered regex — skip
        }
      }
    }
    return null;
  }

  return (rows ?? []).map((r) => {
    const rule = matchRule(r.narration ?? "");
    return {
      id: r.id,
      accountId: r.account_id,
      txnDate: r.txn_date,
      narration: r.narration,
      refNo: r.ref_no,
      debitAmount: r.debit_amount,
      creditAmount: r.credit_amount,
      status: r.status,
      suggestion: rule
        ? {
            ledger: rule.ledger,
            kind: rule.kind,
            category: rule.default_category,
            jobId: rule.default_job_id,
            staffId: rule.default_staff_id,
          }
        : null,
    };
  });
}

export interface UploadSummary {
  id: string;
  filename: string;
  uploadedAt: string;
  rowCount: number;
  status: string;
}

export async function getUploads(supabase: Client): Promise<UploadSummary[]> {
  const { data } = await supabase
    .from("statement_uploads")
    .select("id, filename, uploaded_at, row_count, status")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  return (data ?? []).map((u) => ({
    id: u.id,
    filename: u.filename,
    uploadedAt: u.uploaded_at,
    rowCount: u.row_count,
    status: u.status,
  }));
}
