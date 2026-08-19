import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { getRecentHouseholdEntries, getEntryPresets, getBackfillDefaultDate } from "@/lib/queries/household";
import { PageHeader } from "@/components/PageHeader";
import { FamilyEntryForm } from "@/components/add/FamilyEntryForm";
import { RecentEntries } from "@/components/add/RecentEntries";
import { CashReconciliation } from "@/components/add/CashReconciliation";
import { AddLedgerToggle } from "@/components/add/AddLedgerToggle";
import { BusinessEntryForm } from "@/components/add/BusinessEntryForm";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ ledger?: string }>;
}) {
  const { ledger: ledgerParam } = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);
  const ledger = owner && ledgerParam === "business" ? "business" : "family";

  const [
    { data: accounts },
    { data: members },
    { data: categoryRows },
    entries,
    presets,
    backfillDefaultDate,
    { data: jobRows },
    { data: staffRows },
  ] = await Promise.all([
    supabase.from("accounts").select("id, label, kind, is_primary").order("is_primary", { ascending: false }),
    supabase.from("household_members").select("id, name, linked_user_id").order("name"),
    supabase.from("expense_categories").select("name").order("name"),
    getRecentHouseholdEntries(supabase),
    profile ? getEntryPresets(supabase, profile.userId) : Promise.resolve([]),
    getBackfillDefaultDate(supabase),
    owner
      ? supabase.from("jobs").select("id, title").eq("status", "open").is("deleted_at", null).order("event_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    owner
      ? supabase.from("staff").select("id, name").is("deleted_at", null).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const memberList = (members ?? []).map((m) => ({ id: m.id, name: m.name }));
  const defaultMember = (members ?? []).find((m) => m.linked_user_id === profile?.userId);
  const defaultMemberId = defaultMember?.id ?? memberList[0]?.id ?? "";
  const categories = (categoryRows ?? []).map((c) => c.name);
  const accountList = (accounts ?? []).map((a) => ({ id: a.id, label: a.label, isPrimary: a.is_primary }));
  const cashAccounts = (accounts ?? []).filter((a) => a.kind === "cash").map((a) => ({ id: a.id, label: a.label }));

  return (
    <div className="pb-8">
      <PageHeader title="Add" subtitle="Fast entry — under five seconds." />

      <div className="mx-4 sm:mx-6 space-y-6">
        {owner && <AddLedgerToggle ledger={ledger} />}

        {ledger === "family" ? (
          <>
            <FamilyEntryForm
              accounts={accountList}
              members={memberList}
              categories={categories}
              defaultMemberId={defaultMemberId}
              presets={presets}
              backfillDefaultDate={backfillDefaultDate}
            />
            <CashReconciliation cashAccounts={cashAccounts} members={memberList} defaultMemberId={defaultMemberId} />
          </>
        ) : (
          <BusinessEntryForm
            accounts={accountList}
            jobs={(jobRows ?? []).map((j) => ({ id: j.id, title: j.title }))}
            staff={(staffRows ?? []).map((s) => ({ id: s.id, name: s.name }))}
            categories={categories}
          />
        )}
      </div>

      {ledger === "family" && (
        <div className="mt-8">
          <h2 className="px-4 pb-2 text-sm font-medium text-slate sm:px-6">Recent entries</h2>
          <RecentEntries entries={entries} categories={categories} members={memberList} />
        </div>
      )}
    </div>
  );
}
