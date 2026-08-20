import type { Role } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  key: string;
}

// "Dashboard" (/family) is the single merged dashboard: family charts for everyone, plus a
// business section appended for the owner -- never combined into one figure, just one page
// instead of two tabs. "Jobs" (/business) stays a separate working screen (create/manage jobs),
// not analytics, so it isn't part of that merge.
export const DASHBOARD_ITEM: NavItem = { href: "/family", label: "Dashboard", key: "family" };
export const ADD_ITEM: NavItem = { href: "/add", label: "Add", key: "add" };
export const JOBS_ITEM: NavItem = { href: "/business", label: "Jobs", key: "business" };
export const MORE_ITEM: NavItem = { href: "/more", label: "More", key: "more" };

/** Nav items for the given role, in display order with Add always in the middle slot. */
export function navItemsFor(role: Role): NavItem[] {
  if (role === "owner") {
    return [DASHBOARD_ITEM, ADD_ITEM, JOBS_ITEM, MORE_ITEM];
  }
  return [DASHBOARD_ITEM, ADD_ITEM, MORE_ITEM];
}
