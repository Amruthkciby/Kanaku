import { CashStrip } from "@/components/dashboard/CashStrip";
import { PageHeader } from "@/components/PageHeader";

export default function BusinessPage() {
  return (
    <div>
      <CashStrip />
      <PageHeader title="Business" subtitle="Jobs, staff, and what's outstanding." />
      <div className="mx-4 sm:mx-6 rounded-xl border border-dashed border-border p-8 text-center text-slate">
        <p>The jobs list and profit-per-job chart are on the way.</p>
      </div>
    </div>
  );
}
