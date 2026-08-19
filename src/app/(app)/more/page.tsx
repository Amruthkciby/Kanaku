import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "@/components/SignOutButton";

export default async function MorePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, label, kind")
    .order("is_primary", { ascending: false });

  const { data: members } = await supabase
    .from("household_members")
    .select("id, name")
    .order("name");

  return (
    <div>
      <PageHeader title="More" />

      <div className="mx-4 sm:mx-6 space-y-6">
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
                <span className="text-sm capitalize text-slate">{a.kind}</span>
              </li>
            ))}
          </ul>
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

        {isOwner(profile) && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate">Business</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
              <li className="px-4 py-3 text-slate">Staff — coming soon</li>
              <li className="px-4 py-3 text-slate">Statement import — coming soon</li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
