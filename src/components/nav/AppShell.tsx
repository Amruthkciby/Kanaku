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
        {/* min-w-0 is load-bearing: flex items default to min-width:auto, so without it a wide
            chart deep inside (even one wrapped in its own overflow-x-auto) forces this whole
            column wider instead of scrolling in place, pushing the page into horizontal scroll. */}
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 pb-20 sm:pb-0">{children}</main>
          <BottomTabBar items={items} />
        </div>
      </div>
    </ActivityLock>
  );
}
