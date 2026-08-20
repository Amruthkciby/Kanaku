import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffAccount } from "@/lib/queries/staff";
import { PageHeader } from "@/components/PageHeader";
import { RecordPayoutForm } from "@/components/business/RecordPayoutForm";
import { StaffLedger } from "@/components/business/StaffLedger";
import { formatPaise } from "@/lib/money";

export default async function StaffAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const account = await getStaffAccount(supabase, id);
  if (!account) notFound();

  const { data: accounts } = await supabase.from("accounts").select("id, label").order("is_primary", { ascending: false });

  return (
    <div className="pb-8 lg:mx-auto lg:max-w-3xl">
      <PageHeader title={account.name} subtitle={account.phone ?? undefined} />

      <div className="mx-4 mb-4 flex flex-wrap items-center gap-4 sm:mx-6">
        <div>
          <p className="text-xs text-slate">Still owed</p>
          <p className={`font-numeric text-xl ${account.totalOwed > 0 ? "text-brass" : "text-forest"}`}>
            {formatPaise(account.totalOwed)}
          </p>
        </div>
        {account.totalUnallocated > 0 && (
          <div>
            <p className="text-xs text-slate">Unallocated advance</p>
            <p className="font-numeric text-xl text-slate">{formatPaise(account.totalUnallocated)}</p>
          </div>
        )}
        <div className="ml-auto">
          <RecordPayoutForm staffId={account.id} accounts={accounts ?? []} />
        </div>
      </div>

      <div className="mx-4 rounded-xl border border-border bg-paper-raised sm:mx-6">
        <StaffLedger entries={account.entries} />
      </div>
    </div>
  );
}
