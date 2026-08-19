import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface JobSummary {
  jobId: string;
  title: string;
  clientName: string;
  eventDate: string;
  status: string;
  agreedAmount: number;
  collected: number;
  stillToCollect: number;
  staffAgreedTotal: number;
  staffPaidTotal: number;
  stillToPayStaff: number;
  jobExpenses: number;
  profit: number;
  settled: boolean;
}

export async function getJobsListSummary(supabase: Client): Promise<JobSummary[]> {
  const { data, error } = await supabase.rpc("jobs_list_summary");
  if (error) throw error;

  return (data ?? []).map((row) => {
    const stillToCollect = row.agreed_amount - row.collected;
    const stillToPayStaff = row.staff_agreed_total - row.staff_paid_total;
    return {
      jobId: row.job_id,
      title: row.title,
      clientName: row.client_name,
      eventDate: row.event_date,
      status: row.status,
      agreedAmount: row.agreed_amount,
      collected: row.collected,
      stillToCollect,
      staffAgreedTotal: row.staff_agreed_total,
      staffPaidTotal: row.staff_paid_total,
      stillToPayStaff,
      jobExpenses: row.job_expenses,
      profit: row.collected - row.staff_paid_total - row.job_expenses,
      settled: stillToCollect === 0 && stillToPayStaff === 0,
    };
  });
}
