"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomTabBar, Sidebar } from "@/components/nav/AppNav";
import { navItemsFor } from "@/components/nav/nav-items";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
import { ActivityLock } from "@/components/ActivityLock";
import type { Role } from "@/lib/auth";

export function AppShell({
  role,
  displayName,
  email,
  children,
}: {
  role: Role;
  displayName: string;
  email: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const items = navItemsFor(role);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <ActivityLock email={email}>
      <div className="flex min-h-dvh w-full">
        <OfflineQueueIndicator />
        <Sidebar items={items} displayName={displayName} role={role} onSignOut={handleSignOut} />
        <div className="flex min-h-dvh flex-1 flex-col">
          <main className="flex-1 pb-20 sm:pb-0">{children}</main>
          <BottomTabBar items={items} />
        </div>
      </div>
    </ActivityLock>
  );
}
