export type AdminPortalNavItem = {
  id: string;
  href: string;
  label: string;
  tab: string | null;
  settingsSection?: string;
};

export type AdminPortalNavGroup = {
  id: string;
  label: string;
  items: AdminPortalNavItem[];
};

export const ADMIN_PORTAL_NAV_GROUPS: AdminPortalNavGroup[] = [
  {
    id: "manage",
    label: "MANAGE",
    items: [
      { id: "overview", href: "/admin?tab=overview", label: "Overview", tab: "overview" },
      { id: "users", href: "/admin?tab=users", label: "Users", tab: "users" },
      { id: "plans", href: "/admin?tab=plans", label: "Plans", tab: "plans" },
      { id: "competencies", href: "/admin?tab=competencies", label: "Content", tab: "competencies" },
      { id: "help", href: "/admin?tab=help", label: "Help", tab: "help" },
    ],
  },
  {
    id: "platform",
    label: "PLATFORM",
    items: [
      { id: "platform-ai", href: "/admin?tab=ai", label: "AI & Sims", tab: "ai" },
      { id: "corpus", href: "/admin?tab=corpus", label: "Corpus", tab: "corpus" },
      { id: "analytics", href: "/admin?tab=analytics", label: "Analytics", tab: "analytics" },
      { id: "audit", href: "/admin?tab=audit", label: "Audit log", tab: "audit" },
    ],
  },
  {
    id: "settings",
    label: "SETTINGS",
    items: [
      {
        id: "settings-flags",
        href: "/admin?tab=settings&section=flags",
        label: "Feature flags",
        tab: "settings",
        settingsSection: "flags",
      },
      {
        id: "settings-integrations",
        href: "/admin?tab=settings&section=integrations",
        label: "Integrations",
        tab: "settings",
        settingsSection: "integrations",
      },
      {
        id: "settings-ai",
        href: "/admin?tab=settings&section=ai",
        label: "AI config",
        tab: "settings",
        settingsSection: "ai",
      },
      {
        id: "settings-basic",
        href: "/admin?tab=settings&section=basic",
        label: "Basic & retention",
        tab: "settings",
        settingsSection: "basic",
      },
    ],
  },
  {
    id: "my-role",
    label: "MY ROLE",
    items: [
      { id: "manager-view", href: "/manager?section=command", label: "Manager view", tab: null },
      { id: "my-practice", href: "/my-practice", label: "My practice", tab: null },
      { id: "test-as-se", href: "/simulations?test=1", label: "Test as SE", tab: null },
    ],
  },
];

export function isAdminPortalNavItemActive(
  item: AdminPortalNavItem,
  pathname: string,
  tab: string | null,
  settingsSection: string | null,
  searchParams?: string,
): boolean {
  if (item.tab === null) {
    const base = item.href.split("?")[0] ?? item.href;
    if (item.href.includes("?")) {
      return `${pathname}?${searchParams ?? ""}` === item.href || pathname === base;
    }
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  if (pathname !== "/admin") {
    return false;
  }

  if (item.tab === "settings" && item.settingsSection) {
    return tab === "settings" && settingsSection === item.settingsSection;
  }

  if (item.tab === "corpus") {
    return tab === "corpus" || tab === "routing";
  }

  return tab === item.tab;
}
