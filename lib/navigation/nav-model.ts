import type { WorkspaceHat } from "@/lib/auth/workspace";
import { filterNavHref } from "@/lib/platform/feature-flags";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";

/**
 * Single navigation model. Sidebar, mobile drawer, document title, section tabs and the ⌘K palette
 * all derive from this. Hrefs point at today's routes; each area moves to nested routes by editing
 * the hrefs here (see design_handoff_se_enablement_v2/nav-model.ts for the target routes).
 */

export type NavChild = { id: string; label: string; href: string };

export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** Extra path prefixes that mark this item active. */
  match?: string[];
  /** Shown as in-page section tabs, never as extra sidebar items. */
  children?: NavChild[];
};

export const NAV: Record<WorkspaceHat, NavItem[]> = {
  se: [
    { id: "today", label: "Today", href: "/dashboard" },
    {
      id: "ramp",
      label: "My ramp",
      href: "/my-plan",
      match: ["/plan-steps"],
      children: [
        { id: "list", label: "List", href: "/my-plan" },
        { id: "calendar", label: "Calendar", href: "/plan-calendar" },
      ],
    },
    {
      id: "practice",
      label: "Practice",
      href: "/prep",
      match: ["/my-practice"],
      children: [
        { id: "preflight", label: "Pre-flight", href: "/prep" },
        { id: "simulations", label: "Simulations", href: "/simulations" },
        { id: "challenges", label: "Challenges", href: "/challenges" },
        { id: "pitch", label: "Pitch", href: "/pitch" },
        { id: "flight-check", label: "Flight check", href: "/flight-check" },
        { id: "market-pulse", label: "Market pulse", href: "/market-pulse" },
      ],
    },
    {
      id: "readiness",
      label: "Readiness",
      href: "/growth",
      children: [
        { id: "competencies", label: "Competencies", href: "/growth" },
        { id: "feedback", label: "Feedback", href: "/feedback" },
        { id: "growth-plan", label: "Growth plan", href: "/growth-plan" },
        { id: "certification", label: "Certification", href: "/certifications" },
      ],
    },
    {
      id: "learn",
      label: "Learn",
      href: "/learn",
      children: [
        { id: "library", label: "Library", href: "/learn" },
        { id: "resources", label: "Resources", href: "/resources" },
        { id: "lab", label: "ISC Lab", href: "/lab" },
      ],
    },
  ],
  manager: [
    { id: "today", label: "Today", href: "/manager?section=command" },
    { id: "inbox", label: "Inbox", href: "/manager?section=inbox" },
    {
      id: "team",
      label: "Team",
      href: "/manager?section=roster",
      children: [
        { id: "roster", label: "Roster", href: "/manager?section=roster" },
        { id: "readiness", label: "Readiness", href: "/manager?section=readiness" },
        { id: "leaderboard", label: "Leaderboard", href: "/manager?section=leaderboard" },
        { id: "mentees", label: "Mentees", href: "/manager?section=mentees" },
      ],
    },
    {
      id: "coaching",
      label: "Coaching",
      href: "/manager?section=cadence",
      children: [
        { id: "cadence", label: "Cadence", href: "/manager?section=cadence" },
        { id: "history", label: "Review history", href: "/manager?section=history" },
        { id: "development", label: "Development", href: "/manager?section=dev" },
      ],
    },
    {
      id: "programs",
      label: "Programs",
      href: "/manager?section=program",
      match: ["/plans"],
      children: [
        { id: "tracker", label: "Tracker", href: "/manager?section=program" },
        { id: "assign", label: "Assign", href: "/plans" },
        { id: "calendar", label: "Calendar", href: "/plan-calendar" },
        { id: "certifications", label: "Certifications", href: "/certifications" },
      ],
    },
  ],
  tenant_admin: [
    {
      id: "overview",
      label: "Overview",
      href: "/admin?tab=overview",
      children: [
        { id: "overview", label: "Overview", href: "/admin?tab=overview" },
        { id: "help", label: "Help", href: "/admin?tab=help" },
      ],
    },
    { id: "people", label: "People", href: "/admin?tab=users" },
    {
      id: "programs",
      label: "Programs",
      href: "/admin?tab=plans",
      children: [
        { id: "plans", label: "Plans", href: "/admin?tab=plans" },
        { id: "competencies", label: "Competencies", href: "/admin?tab=competencies" },
        { id: "assign", label: "Assign", href: "/plans" },
      ],
    },
    {
      id: "content",
      label: "Content",
      href: "/admin?tab=content-portal",
      children: [
        { id: "portal", label: "Content portal", href: "/admin?tab=content-portal" },
        { id: "corpus", label: "Corpus", href: "/admin?tab=corpus" },
        { id: "ai", label: "AI & sims", href: "/admin?tab=ai" },
        { id: "reviews", label: "Reviews", href: "/admin?tab=reviews" },
      ],
    },
    {
      id: "insights",
      label: "Insights",
      href: "/admin?tab=analytics",
      children: [
        { id: "analytics", label: "Analytics", href: "/admin?tab=analytics" },
        { id: "audit", label: "Audit log", href: "/admin?tab=audit" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      href: "/admin?tab=settings&section=flags",
      children: [
        { id: "features", label: "Features", href: "/admin?tab=settings&section=flags" },
        { id: "integrations", label: "Integrations", href: "/admin?tab=settings&section=integrations" },
        { id: "ai", label: "AI", href: "/admin?tab=settings&section=ai" },
        { id: "security", label: "Security", href: "/admin?tab=security" },
        { id: "basic", label: "Data retention", href: "/admin?tab=settings&section=basic" },
      ],
    },
  ],
  platform: [
    { id: "now", label: "Now", href: "/platform?view=now" },
    {
      id: "tenants",
      label: "Tenants",
      href: "/platform?view=tenant",
      children: [
        { id: "tenant", label: "Tenants", href: "/platform?view=tenant" },
        { id: "overview", label: "Health", href: "/platform?view=overview" },
        { id: "onboarding", label: "Onboarding", href: "/platform?view=onboarding" },
      ],
    },
    {
      id: "support",
      label: "Support",
      href: "/platform?view=support",
      children: [
        { id: "support", label: "Support", href: "/platform?view=support" },
        { id: "shadow", label: "Shadow log", href: "/platform?view=shadow" },
      ],
    },
    { id: "usage", label: "Usage", href: "/platform?view=usage" },
    {
      id: "settings",
      label: "Settings",
      href: "/platform?view=settings",
      children: [
        { id: "settings", label: "Settings", href: "/platform?view=settings" },
        { id: "global-audit", label: "Global audit", href: "/platform?view=global-audit" },
      ],
    },
  ],
};

/** Query params that default when absent, so "/manager" counts as "?section=command". */
const QUERY_DEFAULTS: Record<string, Record<string, string>> = {
  "/manager": { section: "command" },
  "/platform": { view: "now" },
  "/admin": { tab: "overview", section: "flags" },
};

/** How well an href matches the current location: -1 none, higher is more specific. */
export function hrefScore(href: string, pathname: string, params: URLSearchParams): number {
  const [path = "", query = ""] = href.split("?");
  const wanted = new URLSearchParams(query);

  if (pathname === path) {
    for (const [key, value] of wanted) {
      const current = params.get(key) ?? QUERY_DEFAULTS[path]?.[key];
      if (current !== value) return -1;
    }
    return 1000 + [...wanted].length;
  }
  if (path.length > 1 && pathname.startsWith(`${path}/`)) return path.length;
  return -1;
}

export type ActiveNav = { itemId: string | null; childId: string | null };

export function resolveActive(
  workspace: WorkspaceHat,
  pathname: string,
  params: URLSearchParams,
): ActiveNav {
  let best = { score: -1, itemId: null as string | null, childId: null as string | null };

  for (const item of NAV[workspace]) {
    const candidates: { href: string; childId: string | null }[] = [
      { href: item.href, childId: null },
      ...(item.match ?? []).map((href) => ({ href, childId: null })),
      ...(item.children ?? []).map((child) => ({ href: child.href, childId: child.id })),
    ];
    for (const candidate of candidates) {
      const score = hrefScore(candidate.href, pathname, params);
      if (score > best.score) best = { score, itemId: item.id, childId: candidate.childId };
    }
  }
  return { itemId: best.itemId, childId: best.childId };
}

/** Drops items whose route is switched off by the tenant's feature flags. */
export function visibleNav(workspace: WorkspaceHat, flags?: PlatformFeatureFlags): NavItem[] {
  if (!flags) return NAV[workspace];
  return NAV[workspace]
    .filter((item) => filterNavHref(item.href, flags))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => filterNavHref(child.href, flags)),
    }));
}

export type PaletteEntry = { href: string; label: string; section: string };

export function paletteEntries(workspace: WorkspaceHat, flags?: PlatformFeatureFlags): PaletteEntry[] {
  return visibleNav(workspace, flags).flatMap((item) => [
    { href: item.href, label: item.label, section: "" },
    ...(item.children ?? [])
      .filter((child) => child.href !== item.href)
      .map((child) => ({ href: child.href, label: child.label, section: item.label })),
  ]);
}

export function pageTitle(
  workspace: WorkspaceHat,
  pathname: string,
  params: URLSearchParams,
  productName: string,
): string {
  const { itemId, childId } = resolveActive(workspace, pathname, params);
  const item = NAV[workspace].find((entry) => entry.id === itemId);
  const child = item?.children?.find((entry) => entry.id === childId);
  const parts = [child && child.label !== item?.label ? child.label : null, item?.label, productName];
  return parts.filter(Boolean).join(" · ");
}
