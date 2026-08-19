import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/** Browser-side Supabase client. Uses the anon key only — RLS is the real access boundary. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
