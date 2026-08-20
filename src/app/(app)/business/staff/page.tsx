import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffList } from "@/lib/queries/staff";
import { PageHeader } from "@/components/PageHeader";
import { NewStaffForm } from "@/components/business/NewStaffForm";
import { formatPaise } from "@/lib/money";

export default async function StaffListPage() {
  const supabase = await createClient();
  const staff = await getStaffList(supabase);

  return (
    <div className="lg:mx-auto lg:max-w-3xl">
      <PageHeader title="Staff" subtitle="Who's owed what, across every job." />

      <div className="mx-4 mb-4 sm:mx-6">
        <NewStaffForm />
      </div>

      <ul className="mx-4 divide-y divide-border rounded-xl border border-border bg-paper-raised sm:mx-6">
        {staff.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate">No staff yet.</li>
        ) : (
          staff.map((s) => (
            <li key={s.id}>
              <Link href={`/business/staff/${s.id}`} className="flex items-center justify-between px-4 py-3 sm:px-6">
                <span className="text-ink">{s.name}</span>
                <span className={`font-numeric text-sm ${s.totalOwed > 0 ? "text-brass" : "text-forest"}`}>
                  {s.totalOwed > 0 ? `${formatPaise(s.totalOwed)} owed` : "Settled"}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
