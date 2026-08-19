import { PageHeader } from "@/components/PageHeader";

export default function AddPage() {
  return (
    <div>
      <PageHeader title="Add" subtitle="Fast entry — under five seconds." />
      <div className="mx-4 sm:mx-6 rounded-xl border border-dashed border-border p-8 text-center text-slate">
        <p>The entry screen is on the way.</p>
      </div>
    </div>
  );
}
