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
      // List | Calendar is a view toggle in the My ramp header (?view=calendar), not section tabs.
      id: "ramp",
      label: "My ramp",
      href: "/my-plan",
      match: ["/plan-steps", "/plan-calendar"],
    },
    {
      id: "practice",
      label: "Practice",
      href: "/practice",
      match: ["/simulations", "/challenges", "/pitch", "/prep", "/flight-check", "/market-pulse", "/my-practice"],
      children: [
        { id: "preflight", label: "Pre-flight", href: "/practice" },
        { id: "simulations", label: "Simulations", href: "/practice/simulations" },
        { id: "challenges", label: "Challenges", href: "/practice/challenges" },
        { id: "pitch", label: "Pitch", href: "/practice/pitch" },
        { id: "quizzes", label: "Quizzes", href: "/practice/quizzes" },
        { id: "flight-check", label: "Flight check", href: "/practice/flight-check" },
        { id: "deal-prep", label: "Deal prep", href: "/practice/deal-prep" },
      ],
    },
    {
      id: "readiness",
      label: "Readiness",
      href: "/readiness",
      match: ["/growth", "/feedback", "/growth-plan", "/certifications"],
      children: [
        { id: "competencies", label: "Competencies", href: "/readiness" },
        { id: "feedback", label: "Feedback", href: "/readiness/feedback" },
        { id: "growth-plan", label: "Growth plan", href: "/readiness/growth-plan" },
        { id: "certification", label: "Certification", href: "/readiness/certification" },
      ],
    },
    {
      id: "learn",
      label: "Learn",
      href: "/learn",
      match: ["/resources", "/lab"],
      children: [
        { id: "library", label: "Library", href: "/learn" },
        { id: "lab", label: "ISC Lab", href: "/learn/lab" },
      ],
    },
  ],
  manager: [
    { id: "today", label: "Today", href: "/manager" },
    { id: "inbox", label: "Inbox", href: "/manager/inbox" },
    {
      id: "team",
      label: "Team",
      href: "/manager/team",
      children: [
        { id: "roster", label: "Roster", href: "/manager/team" },
        { id: "readiness", label: "Readiness", href: "/manager/team/readiness" },
        { id: "leaderboard", label: "Leaderboard", href: "/manager/team/leaderboard" },
        { id: "mentees", label: "Mentees", href: "/manager/team/mentees" },
      ],
    },
    {
      id: "coaching",
      label: "Coaching",
      href: "/manager/coaching",
      children: [
        { id: "cadence", label: "Cadence", href: "/manager/coaching" },
        { id: "history", label: "Review history", href: "/manager/coaching/history" },
        { id: "development", label: "Development", href: "/manager/coaching/development" },
      ],
    },
    {
      id: "programs",
      label: "Programs",
      href: "/manager/programs",
      match: ["/plans"],
      children: [
        { id: "tracker", label: "Tracker", href: "/manager/programs" },
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
      href: "/admin",
      children: [
        { id: "overview", label: "Overview", href: "/admin" },
        { id: "help", label: "Help", href: "/admin/help" },
      ],
    },
    { id: "people", label: "People", href: "/admin/people" },
    {
      id: "programs",
      label: "Programs",
      href: "/admin/programs",
      children: [
        { id: "plans", label: "Plan builder", href: "/admin/programs" },
        { id: "assign", label: "Assign", href: "/admin/programs/assign" },
        { id: "competencies", label: "Competencies", href: "/admin/programs/competencies" },
      ],
    },
    {
      id: "content",
      label: "Content",
      href: "/admin/content",
      children: [
        { id: "library", label: "Library", href: "/admin/content" },
        { id: "corpus", label: "Corpus", href: "/admin/content/corpus" },
        { id: "ai", label: "AI & sims", href: "/admin/content/ai" },
        { id: "reviews", label: "Reviews", href: "/admin/content/reviews" },
      ],
    },
    {
      id: "insights",
      label: "Insights",
      href: "/admin/insights",
      children: [
        { id: "analytics", label: "Analytics", href: "/admin/insights" },
        { id: "audit", label: "Audit log", href: "/admin/insights/audit" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      href: "/admin/settings/features",
      children: [
        { id: "features", label: "Features", href: "/admin/settings/features" },
        { id: "integrations", label: "Integrations", href: "/admin/settings/integrations" },
        { id: "ai", label: "AI", href: "/admin/settings/ai" },
        { id: "security", label: "Security", href: "/admin/settings/security" },
        { id: "general", label: "General", href: "/admin/settings/general" },
        { id: "retention", label: "Data retention", href: "/admin/settings/retention" },
      ],
    },
  ],
  platform: [
    { id: "now", label: "Now", href: "/platform" },
    {
      id: "tenants",
      label: "Tenants",
      href: "/platform/tenants",
      children: [
        { id: "tenant", label: "Tenants", href: "/platform/tenants" },
        { id: "overview", label: "Health", href: "/platform/tenants/health" },
        { id: "onboarding", label: "Onboarding", href: "/platform/tenants/onboarding" },
      ],
    },
    {
      id: "support",
      label: "Support",
      href: "/platform/support",
      children: [
        { id: "support", label: "Support", href: "/platform/support" },
        { id: "shadow", label: "Shadow log", href: "/platform/support/shadow" },
      ],
    },
    { id: "usage", label: "Usage", href: "/platform/usage" },
    {
      id: "settings",
      label: "Settings",
      href: "/platform/settings",
      children: [
        { id: "settings", label: "Settings", href: "/platform/settings" },
        { id: "global-audit", label: "Global audit", href: "/platform/settings/audit" },
      ],
    },
  ],
};

/** Query params that default when absent, so "/manager" counts as "?section=command". */
const QUERY_DEFAULTS: Record<string, Record<string, string>> = {};

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
    // Children first so a child sharing its parent's href wins the tie and gets highlighted.
    const candidates: { href: string; childId: string | null }[] = [
      ...(item.children ?? []).map((child) => ({ href: child.href, childId: child.id })),
      { href: item.href, childId: null },
      ...(item.match ?? []).map((href) => ({ href, childId: null })),
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
