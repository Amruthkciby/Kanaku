import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";

export default function FamilyPage() {
  return (
    <div>
      <CashStrip />
      <PageHeader title="Family" subtitle="Income, spending, and who's spending it." />
      <div className="mx-4 sm:mx-6 rounded-xl border border-dashed border-border p-8 text-center text-slate">
        <p>Charts for this month&apos;s spending are on the way.</p>
        <p className="mt-1 text-sm">Start by adding a few entries from the Add tab.</p>
      </div>
    </div>
  );
}
