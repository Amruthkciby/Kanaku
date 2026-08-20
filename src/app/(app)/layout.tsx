import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/AppShell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  // Defense in depth — middleware already redirects unauthenticated visitors to /login.
  if (!profile) {
    redirect("/login");
  }

  return (
    <AppShell role={profile.role} displayName={profile.displayName} email={profile.email}>
      {children}
    </AppShell>
  );
}
