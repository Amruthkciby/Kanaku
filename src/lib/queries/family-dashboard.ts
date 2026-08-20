import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { lastNMonths } from "@/lib/dates";

type Client = SupabaseClient<Database>;

export interface MonthlyIncomeExpense {
  label: string;
  income: number;
  expense: number;
}

/** Family income/expense per month, excluding transfers (brief section 9.4). Both roles. */
export async function getMonthlyIncomeExpense(supabase: Client, months = 6): Promise<MonthlyIncomeExpense[]> {
  const range = lastNMonths(months);
  const { data } = await supabase
    .from("transactions")
    .select("occurred_on, amount, kind")
    .eq("ledger", "family")
    .neq("kind", "transfer")
    .is("deleted_at", null)
    .gte("occurred_on", range[0].from)
    .lte("occurred_on", range[range.length - 1].to);

  return range.map((m) => {
    const rows = (data ?? []).filter((r) => r.occurred_on >= m.from && r.occurred_on <= m.to);
    return {
      label: m.label,
      income: rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0),
      expense: rows.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0),
    };
  });
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export async function getCategoryBreakdown(supabase: Client, from: string, to: string): Promise<CategoryTotal[]> {
  const { data } = await supabase
    .from("transactions")
    .select("category, amount")
    .eq("ledger", "family")
    .eq("kind", "household")
    .lt("amount", 0)
    .is("deleted_at", null)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  const totals = new Map<string, number>();
  for (const r of data ?? []) {
    const cat = r.category ?? "Other";
    totals.set(cat, (totals.get(cat) ?? 0) - r.amount);
  }

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MemberCategorySpend {
  memberName: string;
  byCategory: Record<string, number>;
  total: number;
}

export async function getMemberSpendingByCategory(supabase: Client, from: string, to: string): Promise<MemberCategorySpend[]> {
  const { data } = await supabase
    .from("transactions")
    .select("amount, category, household_members(name)")
    .eq("ledger", "family")
    .eq("kind", "household")
    .lt("amount", 0)
    .is("deleted_at", null)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  const byMember = new Map<string, Record<string, number>>();
  for (const r of data ?? []) {
    const name = (r.household_members as unknown as { name: string } | null)?.name ?? "Unknown";
    const cat = r.category ?? "Other";
    const bucket = byMember.get(name) ?? {};
    bucket[cat] = (bucket[cat] ?? 0) - r.amount;
    byMember.set(name, bucket);
  }

  return Array.from(byMember.entries())
    .map(([memberName, byCategory]) => ({
      memberName,
      byCategory,
      total: Object.values(byCategory).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface LargeTransaction {
  id: string;
  occurredOn: string;
  amount: number;
  category: string | null;
  memberName: string;
  note: string | null;
}

export async function getTopTransactions(supabase: Client, from: string, to: string, limit = 10): Promise<LargeTransaction[]> {
  const { data } = await supabase
    .from("transactions")
    .select("id, occurred_on, amount, category, note, household_members(name)")
    .eq("ledger", "family")
    .neq("kind", "transfer")
    .is("deleted_at", null)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  return (data ?? [])
    .map((r) => ({
      id: r.id,
      occurredOn: r.occurred_on,
      amount: r.amount,
      category: r.category,
      memberName: (r.household_members as unknown as { name: string } | null)?.name ?? "",
      note: r.note,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, limit);
}

export interface CategoryDelta {
  category: string;
  current: number;
  previous: number;
  delta: number;
}

/** Month-over-month change on the top categories (brief section 9.4). */
export async function getCategoryDeltas(supabase: Client, from: string, to: string): Promise<CategoryDelta[]> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromDate.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (spanDays - 1) * 86400000);

  const [current, previous] = await Promise.all([
    getCategoryBreakdown(supabase, from, to),
    getCategoryBreakdown(supabase, prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10)),
  ]);

  const prevMap = new Map(previous.map((c) => [c.category, c.amount]));
  return current
    .slice(0, 5)
    .map((c) => ({
      category: c.category,
      current: c.amount,
      previous: prevMap.get(c.category) ?? 0,
      delta: c.amount - (prevMap.get(c.category) ?? 0),
    }));
}
