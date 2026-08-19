import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "member";

export interface CurrentProfile {
  userId: string;
  email: string | null;
  displayName: string;
  role: Role;
  isActive: boolean;
}

/** The signed-in user's profile, or null if not signed in. Server-side only. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, is_active")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.display_name,
    role: profile.role as Role,
    isActive: profile.is_active,
  };
}

export function isOwner(profile: CurrentProfile | null): boolean {
  return profile?.role === "owner";
}
