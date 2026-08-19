import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUploads } from "@/lib/queries/statements";
import { PageHeader } from "@/components/PageHeader";
import { UploadWizard } from "@/components/import/UploadWizard";

export default async function ImportPage() {
  const supabase = await createClient();
  const [{ data: accounts }, uploads] = await Promise.all([
    supabase.from("accounts").select("id, label").order("is_primary", { ascending: false }),
    getUploads(supabase),
  ]);

  return (
    <div className="pb-8">
      <PageHeader title="Statement import" subtitle="Parsed entirely on your device — the raw file is never uploaded." />

      <div className="mx-4 space-y-8 sm:mx-6">
        <UploadWizard accounts={accounts ?? []} />

        <section>
          <h2 className="mb-2 font-display text-lg text-ink">Past uploads</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-paper-raised">
            {uploads.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate">No statements imported yet.</li>
            ) : (
              uploads.map((u) => (
                <li key={u.id}>
                  <Link href={`/business/import/${u.id}`} className="flex items-center justify-between px-4 py-3">
                    <span className="text-ink">{u.filename}</span>
                    <span className="text-sm capitalize text-slate">
                      {u.rowCount} rows · {u.status}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
