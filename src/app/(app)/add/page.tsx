import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getRecentHouseholdEntries, getEntryPresets, getBackfillDefaultDate } from "@/lib/queries/household";
import { PageHeader } from "@/components/PageHeader";
import { UnifiedEntryForm } from "@/components/add/UnifiedEntryForm";
import { RecentEntries } from "@/components/add/RecentEntries";
import { CashReconciliation } from "@/components/add/CashReconciliation";

export default async function AddPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: accounts }, { data: members }, { data: categoryRows }, entries, presets, backfillDefaultDate] = await Promise.all([
    supabase.from("accounts").select("id, label, kind, is_primary").order("is_primary", { ascending: false }),
    supabase.from("household_members").select("id, name, linked_user_id").order("name"),
    supabase.from("expense_categories").select("name").order("name"),
    getRecentHouseholdEntries(supabase),
    profile ? getEntryPresets(supabase, profile.userId) : Promise.resolve([]),
    getBackfillDefaultDate(supabase),
  ]);

  const memberList = (members ?? []).map((m) => ({ id: m.id, name: m.name }));
  const defaultMember = (members ?? []).find((m) => m.linked_user_id === profile?.userId);
  const defaultMemberId = defaultMember?.id ?? memberList[0]?.id ?? "";
  const categories = (categoryRows ?? []).map((c) => c.name);
  const accountList = (accounts ?? []).map((a) => ({ id: a.id, label: a.label, isPrimary: a.is_primary }));
  const cashAccounts = (accounts ?? []).filter((a) => a.kind === "cash").map((a) => ({ id: a.id, label: a.label }));

  return (
    <div className="pb-8">
      {/* A data-entry form and a simple list both stay readable capped at a comfortable width --
          stretching them edge to edge on a laptop/desktop just leaves the eye travelling further
          than it needs to between a label and its value. */}
      <div className="lg:mx-auto lg:max-w-3xl">
        <PageHeader title="ചേർക്കുക" subtitle="Fast entry — under five seconds." />

        <div className="mx-4 space-y-6 sm:mx-6">
          <UnifiedEntryForm
            accounts={accountList}
            members={memberList}
            categories={categories}
            defaultMemberId={defaultMemberId}
            presets={presets}
            backfillDefaultDate={backfillDefaultDate}
          />
          <CashReconciliation cashAccounts={cashAccounts} members={memberList} defaultMemberId={defaultMemberId} />
        </div>

        <div className="mt-8">
          <h2 className="px-4 pb-2 text-sm font-medium text-slate sm:px-6">Recent entries</h2>
          <RecentEntries entries={entries} categories={categories} members={memberList} />
        </div>
      </div>
    </div>
  );
}
