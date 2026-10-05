/**
 * Canonical tenant-admin routes. The console used to be one page switched by `?tab=` and
 * `?section=`; each view now has its own path. Old query URLs still redirect here.
 */

export type AdminTabId =
  | "overview"
  | "users"
  | "plans"
  | "competencies"
  | "content-portal"
  | "reviews"
  | "analytics"
  | "ai"
  | "corpus"
  | "routing"
  | "security"
  | "audit"
  | "help"
  | "settings";

export type AdminSettingsSectionId = "flags" | "integrations" | "ai" | "basic" | "retention";

export type AdminRoute = { path: string; tab: AdminTabId; section?: AdminSettingsSectionId };

export const ADMIN_ROUTES: AdminRoute[] = [
  { path: "/admin", tab: "overview" },
  { path: "/admin/people", tab: "users" },
  { path: "/admin/programs", tab: "plans" },
  { path: "/admin/programs/competencies", tab: "competencies" },
  { path: "/admin/content", tab: "content-portal" },
  { path: "/admin/content/corpus", tab: "corpus" },
  { path: "/admin/content/ai", tab: "ai" },
  { path: "/admin/content/reviews", tab: "reviews" },
  { path: "/admin/insights", tab: "analytics" },
  { path: "/admin/insights/audit", tab: "audit" },
  { path: "/admin/settings/features", tab: "settings", section: "flags" },
  { path: "/admin/settings/integrations", tab: "settings", section: "integrations" },
  { path: "/admin/settings/ai", tab: "settings", section: "ai" },
  { path: "/admin/settings/general", tab: "settings", section: "basic" },
  { path: "/admin/settings/retention", tab: "settings", section: "retention" },
  { path: "/admin/settings/security", tab: "security" },
  { path: "/admin/help", tab: "help" },
];

export function adminRouteFromPath(pathname: string): AdminRoute | null {
  const clean = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  return ADMIN_ROUTES.find((route) => route.path === clean) ?? null;
}

export function adminPathFor(tab: AdminTabId, section?: AdminSettingsSectionId): string {
  if (tab === "routing") tab = "corpus";
  const match =
    ADMIN_ROUTES.find((route) => route.tab === tab && (tab !== "settings" || route.section === (section ?? "flags"))) ??
    ADMIN_ROUTES[0]!;
  return match.path;
}

/** Rewrites a legacy `/admin?tab=x[&section=y]` href to its canonical path. Anything else is unchanged. */
export function canonicalAdminHref(href: string): string {
  const [path, query = ""] = href.split("?");
  if (path !== "/admin") return href;
  const params = new URLSearchParams(query);
  const tab = params.get("tab");
  if (!tab || !ADMIN_ROUTES.some((route) => route.tab === tab) && tab !== "routing") return href;
  const section = params.get("section") as AdminSettingsSectionId | null;
  params.delete("tab");
  params.delete("section");
  const rest = params.toString();
  const target = adminPathFor(tab as AdminTabId, section ?? undefined);
  return rest ? `${target}?${rest}` : target;
}
