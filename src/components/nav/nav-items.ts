import type { Role } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  key: string;
}

export const FAMILY_ITEM: NavItem = { href: "/family", label: "Family", key: "family" };
export const ADD_ITEM: NavItem = { href: "/add", label: "Add", key: "add" };
export const BUSINESS_ITEM: NavItem = { href: "/business", label: "Business", key: "business" };
export const MORE_ITEM: NavItem = { href: "/more", label: "More", key: "more" };

/** Nav items for the given role, in display order with Add always in the middle slot. */
export function navItemsFor(role: Role): NavItem[] {
  if (role === "owner") {
    return [FAMILY_ITEM, ADD_ITEM, BUSINESS_ITEM, MORE_ITEM];
  }
  return [FAMILY_ITEM, ADD_ITEM, MORE_ITEM];
}
