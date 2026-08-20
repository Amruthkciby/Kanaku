import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { lastNMonths } from "@/lib/dates";
import { getJobsListSummary, type JobSummary } from "@/lib/queries/jobs";
import { getStaffList } from "@/lib/queries/staff";

type Client = SupabaseClient<Database>;

export interface MonthlyBusinessFinancials {
  label: string;
  revenue: number;
  staffCost: number;
  otherExpenses: number;
  netProfit: number;
}

export async function getMonthlyBusinessFinancials(supabase: Client, months = 6): Promise<MonthlyBusinessFinancials[]> {
  const range = lastNMonths(months);
  const { data } = await supabase
    .from("transactions")
    .select("occurred_on, amount, kind")
    .eq("ledger", "business")
    .neq("kind", "transfer")
    .is("deleted_at", null)
    .gte("occurred_on", range[0].from)
    .lte("occurred_on", range[range.length - 1].to);

  return range.map((m) => {
    const rows = (data ?? []).filter((r) => r.occurred_on >= m.from && r.occurred_on <= m.to);
    const revenue = rows.filter((r) => r.kind === "client_payment").reduce((s, r) => s + r.amount, 0);
    const staffCost = -rows.filter((r) => r.kind === "staff_payout").reduce((s, r) => s + r.amount, 0);
    const otherExpenses = -rows.filter((r) => r.kind === "job_expense").reduce((s, r) => s + r.amount, 0);
    return { label: m.label, revenue, staffCost, otherExpenses, netProfit: revenue - staffCost - otherExpenses };
  });
}

export interface ProfitPerJob {
  jobId: string;
  title: string;
  profit: number;
}

export async function getProfitPerJob(supabase: Client): Promise<ProfitPerJob[]> {
  const jobs = await getJobsListSummary(supabase);
  return jobs
    .map((j) => ({ jobId: j.jobId, title: j.title, profit: j.profit }))
    .sort((a, b) => b.profit - a.profit);
}

export interface AgingBucket {
  bucket: "0-30" | "31-60" | "60+";
  amount: number;
  jobCount: number;
}

export function getReceivablesAging(jobs: JobSummary[]): AgingBucket[] {
  const now = Date.now();
  const buckets: Record<string, { amount: number; jobCount: number }> = {
    "0-30": { amount: 0, jobCount: 0 },
    "31-60": { amount: 0, jobCount: 0 },
    "60+": { amount: 0, jobCount: 0 },
  };

  for (const j of jobs) {
    if (j.stillToCollect <= 0) continue;
    const days = Math.floor((now - new Date(j.eventDate).getTime()) / 86400000);
    const key = days <= 30 ? "0-30" : days <= 60 ? "31-60" : "60+";
    buckets[key].amount += j.stillToCollect;
    buckets[key].jobCount += 1;
  }

  return (["0-30", "31-60", "60+"] as const).map((bucket) => ({ bucket, ...buckets[bucket] }));
}

export interface PayableByStaff {
  staffId: string;
  name: string;
  owed: number;
}

export async function getPayablesByStaff(supabase: Client): Promise<PayableByStaff[]> {
  const staff = await getStaffList(supabase);
  return staff
    .filter((s) => s.totalOwed > 0)
    .map((s) => ({ staffId: s.id, name: s.name, owed: s.totalOwed }))
    .sort((a, b) => b.owed - a.owed);
}

export interface CostStructureRow {
  jobId: string;
  title: string;
  staffPct: number;
  expensesPct: number;
  marginPct: number;
}

export function getCostStructure(jobs: JobSummary[]): CostStructureRow[] {
  return jobs
    .filter((j) => j.collected > 0)
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 8)
    .map((j) => ({
      jobId: j.jobId,
      title: j.title,
      staffPct: Math.round((j.staffPaidTotal / j.collected) * 100),
      expensesPct: Math.round((j.jobExpenses / j.collected) * 100),
      marginPct: Math.round((j.profit / j.collected) * 100),
    }));
}
