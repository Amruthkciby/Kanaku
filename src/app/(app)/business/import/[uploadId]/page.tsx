import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReviewRows, getUploadProgress } from "@/lib/queries/statements";
import { PageHeader } from "@/components/PageHeader";
import { ReviewTable } from "@/components/import/ReviewTable";

export default async function ReviewPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const supabase = await createClient();

  const { data: upload } = await supabase.from("statement_uploads").select("id, filename").eq("id", uploadId).single();
  if (!upload) notFound();

  const [rows, progress, { data: members }, { data: categoryRows }, { data: jobs }, { data: staffRows }, { data: accounts }] =
    await Promise.all([
      getReviewRows(supabase, uploadId),
      getUploadProgress(supabase, uploadId),
      supabase.from("household_members").select("id, name").order("name"),
      supabase.from("expense_categories").select("name").order("name"),
      supabase.from("jobs").select("id, title").is("deleted_at", null).order("event_date", { ascending: false }),
      supabase.from("staff").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("accounts").select("id, label").order("is_primary", { ascending: false }),
    ]);

  return (
    <div className="pb-8">
      <PageHeader title={upload.filename} subtitle={`${progress.reviewed} of ${progress.total} reviewed`} />

      <div className="mx-4 sm:mx-6">
        <ReviewTable
          rows={rows}
          refData={{
            members: members ?? [],
            categories: (categoryRows ?? []).map((c) => c.name),
            jobs: jobs ?? [],
            staff: staffRows ?? [],
            accounts: accounts ?? [],
          }}
        />
      </div>
    </div>
  );
}
