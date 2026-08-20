import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances } from "@/lib/queries/derived";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "@/components/SignOutButton";
import { TransferForm } from "@/components/accounts/TransferForm";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { DrawingForm, CapitalContributionForm } from "@/components/business/DrawingsForms";
import { formatPaise } from "@/lib/money";
import Link from "next/link";

export default async function MorePage() {
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);
  const supabase = await createClient();

  const [{ data: accounts }, { data: members }, balances] = await Promise.all([
    supabase.from("accounts").select("id, label, kind").order("is_primary", { ascending: false }),
    supabase.from("household_members").select("id, name").order("name"),
    getAccountBalances(supabase),
  ]);

  const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balance]));

  return (
    <div className="lg:mx-auto lg:max-w-3xl">
      <PageHeader title="കൂടുതൽ" />

      <div className="mx-4 space-y-6 sm:mx-6">
        <section className="rounded-xl border border-border bg-paper-raised p-4">
          <p className="font-medium text-ink">{profile?.displayName}</p>
          <p className="text-sm capitalize text-slate">{profile?.role}</p>
          <div className="mt-3 sm:hidden">
            <SignOutButton />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-slate">Accounts</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
            {(accounts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-ink">{a.label}</span>
                <span className="font-numeric text-sm text-slate">
                  {formatPaise(balanceByAccount.get(a.id) ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          {owner && (
            <div className="mt-3 space-y-3">
              <TransferForm accounts={(accounts ?? []).map((a) => ({ id: a.id, label: a.label }))} />
              <AddAccountForm members={(members ?? []).map((m) => ({ id: m.id, name: m.name }))} />
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-slate">Household</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
            {(members ?? []).map((m) => (
              <li key={m.id} className="px-4 py-3 text-ink">
                {m.name}
              </li>
            ))}
          </ul>
        </section>

        {owner && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate">ജോലി</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
              <li className="px-4 py-3">
                <Link href="/business/staff" className="text-ink">
                  ജോലിക്കാർ
                </Link>
              </li>
              <li className="px-4 py-3">
                <Link href="/business/import" className="text-ink">
                  ബാങ്ക് സ്റ്റേറ്റ്മെന്റ്
                </Link>
              </li>
            </ul>
            <div className="mt-3 space-y-3">
              <DrawingForm members={(members ?? []).map((m) => ({ id: m.id, name: m.name }))} />
              <CapitalContributionForm members={(members ?? []).map((m) => ({ id: m.id, name: m.name }))} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
