import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Typed wrappers around the derived-value RPCs defined in
// supabase/migrations/20260101000010_views_and_functions.sql (brief section 8). Every screen
// that needs a balance, a cash position, or a job/staff figure should go through here rather
// than summing transactions ad hoc in a component — see that migration for why each figure is
// computed the way it is (especially the opening-balance-as-transaction design note).

type Client = SupabaseClient<Database>;

export interface AccountBalance {
  accountId: string;
  label: string;
  kind: string;
  balance: number;
}

export async function getAccountBalances(supabase: Client): Promise<AccountBalance[]> {
  const { data, error } = await supabase.rpc("account_balances");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    accountId: row.account_id,
    label: row.label,
    kind: row.kind,
    balance: row.balance,
  }));
}

export async function getTotalCash(supabase: Client): Promise<number> {
  const { data, error } = await supabase.rpc("total_cash_across_accounts");
  if (error) throw error;
  return data ?? 0;
}

export async function getFamilyCashPosition(supabase: Client): Promise<number> {
  const { data, error } = await supabase.rpc("family_cash_position");
  if (error) throw error;
  return data ?? 0;
}

export async function getSafeToSpend(supabase: Client): Promise<number> {
  const { data, error } = await supabase.rpc("safe_to_spend");
  if (error) throw error;
  return data ?? 0;
}

export async function getBusinessFloatOk(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase.rpc("business_float_ok");
  if (error) throw error;
  return data ?? true;
}

/** Owner-only. Resolves to null (not thrown) if the caller isn't an owner. */
export async function getBusinessCashPosition(supabase: Client): Promise<number | null> {
  const { data, error } = await supabase.rpc("business_cash_position");
  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
  return data ?? 0;
}

/** Owner-only. Resolves to null (not thrown) if the caller isn't an owner. */
export async function getStaffPayableTotal(supabase: Client): Promise<number | null> {
  const { data, error } = await supabase.rpc("staff_payable_total");
  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
  return data ?? 0;
}

export interface DrawingFeedRow {
  occurredOn: string;
  amount: number;
  note: string | null;
}

export async function getFamilyDrawingsFeed(
  supabase: Client,
  from: string,
  to: string,
): Promise<DrawingFeedRow[]> {
  const { data, error } = await supabase.rpc("family_drawings_feed", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    occurredOn: row.occurred_on,
    amount: row.amount,
    note: row.note,
  }));
}

export interface JobFinancials {
  collected: number;
  stillToCollect: number;
  paidToStaff: number;
  jobExpenses: number;
  profit: number;
  settled: boolean;
}

/** Owner-only. Resolves to null (not thrown) if the caller isn't an owner. */
export async function getJobFinancials(supabase: Client, jobId: string): Promise<JobFinancials | null> {
  const { data, error } = await supabase.rpc("job_financials", { p_job_id: jobId });
  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    collected: row.collected,
    stillToCollect: row.still_to_collect,
    paidToStaff: row.paid_to_staff,
    jobExpenses: row.job_expenses,
    profit: row.profit,
    settled: row.settled,
  };
}

/** Owner-only. Resolves to null (not thrown) if the caller isn't an owner. */
export async function getJobStaffStillToPay(supabase: Client, jobStaffId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("job_staff_still_to_pay", { p_job_staff_id: jobStaffId });
  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
  return data ?? 0;
}

export interface CashStripData {
  accounts: AccountBalance[];
  totalCash: number;
  familyCashPosition: number;
  safeToSpend: number;
  businessFloatOk: boolean;
  /** Present only for an owner — see getBusinessCashPosition. */
  businessCashPosition: number | null;
  /** business + family should equal totalCash — asserted in tests and shown as a dev badge. */
  invariantHolds: boolean;
}

export async function getCashStrip(supabase: Client): Promise<CashStripData> {
  const [accounts, totalCash, familyCashPosition, safeToSpend, businessFloatOk, businessCashPosition] =
    await Promise.all([
      getAccountBalances(supabase),
      getTotalCash(supabase),
      getFamilyCashPosition(supabase),
      getSafeToSpend(supabase),
      getBusinessFloatOk(supabase),
      getBusinessCashPosition(supabase),
    ]);

  const invariantHolds =
    businessCashPosition === null
      ? true // a member can't verify this; the owner view and the test suite do
      : businessCashPosition + familyCashPosition === totalCash;

  return {
    accounts,
    totalCash,
    familyCashPosition,
    safeToSpend,
    businessFloatOk,
    businessCashPosition,
    invariantHolds,
  };
}
