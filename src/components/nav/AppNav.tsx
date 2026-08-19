"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, IconLogout } from "@/components/icons";
import type { NavItem } from "@/components/nav/nav-items";
import { appConfig } from "@/config/app";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper-raised pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-center justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const isAddButton = item.key === "add";

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 min-h-[44px] justify-center ${
                  isAddButton ? "" : active ? "text-ink" : "text-slate"
                }`}
              >
                {isAddButton ? (
                  <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brass text-paper-raised shadow-md ring-4 ring-paper">
                    <NavIcon navKey={item.key} className="h-6 w-6" />
                  </span>
                ) : (
                  <NavIcon navKey={item.key} className="h-5 w-5" />
                )}
                <span className={`text-xs ${isAddButton ? "mt-0.5" : ""}`}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({
  items,
  displayName,
  role,
  onSignOut,
}: {
  items: NavItem[];
  displayName: string;
  role: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex sm:w-56 lg:w-64 shrink-0 flex-col border-r border-border bg-paper-raised">
      <div className="px-5 py-6">
        <span className="font-display text-xl text-ink">{appConfig.appName}</span>
      </div>
      <nav aria-label="Primary" className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                    active ? "bg-brass-soft text-ink" : "text-slate hover:bg-paper hover:text-ink"
                  }`}
                >
                  <NavIcon navKey={item.key} className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border px-5 py-4">
        <p className="text-sm font-medium text-ink">{displayName}</p>
        <p className="text-xs text-slate capitalize">{role}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 flex items-center gap-2 text-sm text-slate hover:text-maroon min-h-[44px]"
        >
          <IconLogout className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
