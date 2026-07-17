export type PlatformPortalNavItem = {
  id: string;
  href: string;
  label: string;
  view: string;
};

export type PlatformPortalNavGroup = {
  id: string;
  label: string;
  items: PlatformPortalNavItem[];
};

/** Super Admin / Platform Console only — no tenant admin or manager items. */
export const PLATFORM_PORTAL_NAV_GROUPS: PlatformPortalNavGroup[] = [
  {
    id: "ops",
    label: "OPERATIONS",
    items: [
      { id: "now", href: "/platform?view=now", label: "Now", view: "now" },
      { id: "onboarding", href: "/platform?view=onboarding", label: "Onboarding", view: "onboarding" },
      { id: "support", href: "/platform?view=support", label: "Support", view: "support" },
      { id: "shadow", href: "/platform?view=shadow", label: "Shadow log", view: "shadow" },
    ],
  },
  {
    id: "tenants",
    label: "TENANTS",
    items: [
      { id: "overview", href: "/platform?view=overview", label: "Health", view: "overview" },
      { id: "usage", href: "/platform?view=usage", label: "Usage", view: "usage" },
      { id: "tenant", href: "/platform?view=tenant", label: "Tenants", view: "tenant" },
      {
        id: "global-audit",
        href: "/platform?view=global-audit",
        label: "Global audit",
        view: "global-audit",
      },
    ],
  },
  {
    id: "platform",
    label: "PLATFORM",
    items: [
      { id: "settings", href: "/platform?view=settings", label: "Settings", view: "settings" },
    ],
  },
];

export function isPlatformPortalNavItemActive(
  item: PlatformPortalNavItem,
  pathname: string,
  view: string | null,
): boolean {
  if (!pathname.startsWith("/platform")) return false;
  const current = view ?? "now";
  return item.view === current;
}
