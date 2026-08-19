import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface HouseholdEntry {
  id: string;
  accountId: string;
  accountLabel: string;
  occurredOn: string;
  amount: number;
  category: string | null;
  memberId: string;
  memberName: string;
  mode: string;
  note: string | null;
}

export async function getRecentHouseholdEntries(supabase: Client, limit = 20): Promise<HouseholdEntry[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, occurred_on, amount, category, member_id, mode, note, accounts(label), household_members(name)")
    .eq("kind", "household")
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    accountId: "",
    accountLabel: (row.accounts as unknown as { label: string } | null)?.label ?? "",
    occurredOn: row.occurred_on,
    amount: row.amount,
    category: row.category,
    memberId: row.member_id ?? "",
    memberName: (row.household_members as unknown as { name: string } | null)?.name ?? "",
    mode: row.mode,
    note: row.note,
  }));
}

export interface EntryPreset {
  category: string | null;
  memberId: string;
  memberName: string;
  amount: number;
  count: number;
}

/** Most frequent recent entries, for one-tap presets (brief section 9.1). */
export async function getEntryPresets(supabase: Client, userId: string, limit = 4): Promise<EntryPreset[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("category, member_id, amount, household_members(name)")
    .eq("kind", "household")
    .eq("entered_by", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;

  const counts = new Map<string, EntryPreset>();
  for (const row of data ?? []) {
    const memberName = (row.household_members as unknown as { name: string } | null)?.name ?? "";
    const key = `${row.category ?? ""}|${row.member_id}|${row.amount}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        category: row.category,
        memberId: row.member_id ?? "",
        memberName,
        amount: row.amount,
        count: 1,
      });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Defaults the backfill date picker to the first day since the last recorded entry. */
export async function getBackfillDefaultDate(supabase: Client): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("kind", "household")
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false })
    .limit(1);

  if (error || !data?.length) return today;

  const lastDate = data[0].occurred_on;
  if (lastDate >= today) return today;

  const next = new Date(lastDate);
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}
