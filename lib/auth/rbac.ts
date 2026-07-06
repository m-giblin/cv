import { ProfileRole } from "@/lib/types";

export type AccessTier = "admin" | "manager" | "se";

export const SESSION_IDLE_MS = 15 * 60 * 1000;

export function getAccessTier(role: ProfileRole): AccessTier {
  if (role === "admin" || role === "director") {
    return "admin";
  }

  if (role === "manager" || role === "mentor") {
    return "manager";
  }

  return "se";
}

export function getHomeRoute(tier: AccessTier): string {
  switch (tier) {
    case "admin":
      return "/dashboard";
    case "manager":
      return "/manager?section=command";
    case "se":
      return "/dashboard";
  }
}

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "manager" | "development" | "prep" | "certifications" | "plans" | "challenges" | "simulations" | "resources" | "feedback" | "growth" | "admin" | "account" | "flight-check";
  tiers: AccessTier[];
  managerHref?: string;
};

export type NavGroupId = "workspace" | "team" | "readiness" | "practice" | "system" | "account";

export type NavGroup = {
  id: NavGroupId;
  label: string;
  items: NavItem[];
};

export const MANAGER_SECTIONS = [
  { href: "/manager?section=command", label: "Command Center", section: "command" },
  { href: "/manager?section=inbox", label: "Action Inbox", section: "inbox" },
  { href: "/manager?section=roster", label: "Team Roster", section: "roster" },
  { href: "/manager?section=readiness", label: "Readiness Map", section: "readiness" },
  { href: "/manager?section=cadence", label: "Coaching Cadence", section: "cadence" },
  { href: "/manager?section=dev", label: "Development", section: "dev" },
] as const;

export type ManagerSectionId = (typeof MANAGER_SECTIONS)[number]["section"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My Workspace", icon: "dashboard", tiers: ["admin", "se"] },
  { href: "/my-plan", label: "My Ramp Plan", icon: "plans", tiers: ["se"] },
  { href: "/growth", label: "My Growth", icon: "growth", tiers: ["se"] },
  { href: "/feedback", label: "My Feedback", icon: "feedback", tiers: ["se"] },
  { href: "/learn", label: "Learn", icon: "resources", tiers: ["admin", "manager", "se"] },
  { href: "/lab", label: "ISC Lab", icon: "challenges", tiers: ["admin", "manager", "se"] },
  { href: "/market-pulse", label: "Market Pulse", icon: "challenges", tiers: ["admin", "manager", "se"] },
  { href: "/manager?section=command", label: "Command Center", icon: "manager", tiers: ["admin", "manager"] },
  { href: "/manager?section=inbox", label: "Action Inbox", icon: "feedback", tiers: ["admin", "manager"] },
  { href: "/manager?section=roster", label: "Team Roster", icon: "manager", tiers: ["admin", "manager"] },
  { href: "/manager?section=readiness", label: "Readiness Map", icon: "growth", tiers: ["admin", "manager"] },
  { href: "/manager?section=cadence", label: "Coaching Cadence", icon: "development", tiers: ["admin", "manager"] },
  { href: "/manager?section=dev", label: "Development", icon: "development", tiers: ["admin", "manager"] },
  { href: "/plans", label: "Ramp Plans", icon: "plans", tiers: ["admin", "manager"], managerHref: "/plans" },
  { href: "/development", label: "Development", icon: "development", tiers: ["admin", "manager", "se"] },
  { href: "/resources", label: "Resources", icon: "resources", tiers: ["admin", "manager", "se"] },
  { href: "/certifications", label: "Certifications", icon: "certifications", tiers: ["admin", "manager", "se"] },
  { href: "/prep", label: "Deal Prep", icon: "prep", tiers: ["admin", "manager", "se"] },
  { href: "/challenges", label: "Challenges", icon: "challenges", tiers: ["admin", "manager", "se"] },
  { href: "/simulations", label: "Simulations", icon: "simulations", tiers: ["admin", "manager", "se"] },
  { href: "/pitch", label: "Pitch Studio", icon: "prep", tiers: ["admin", "manager", "se"] },
  { href: "/flight-check", label: "Flight Check", icon: "flight-check", tiers: ["admin", "manager", "se"] },
  { href: "/admin", label: "Admin Console", icon: "admin", tiers: ["admin"] },
  { href: "/account", label: "Account", icon: "account", tiers: ["admin", "manager", "se"] },
];

const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  workspace: "Workspace",
  team: "Team",
  readiness: "Readiness",
  practice: "Practice",
  system: "Admin",
  account: "Account",
};

/** Workflow-oriented nav order per role — groups reflect how SEs and managers actually work. */
const TIER_NAV_GROUPS: Record<AccessTier, { id: NavGroupId; hrefs: string[] }[]> = {
  se: [
    { id: "workspace", hrefs: ["/dashboard", "/my-plan", "/growth", "/feedback"] },
    { id: "readiness", hrefs: ["/learn", "/lab", "/development", "/certifications"] },
    {
      id: "practice",
      hrefs: ["/flight-check", "/market-pulse", "/prep", "/challenges", "/simulations", "/pitch", "/resources"],
    },
  ],
  manager: [
    {
      id: "team",
      hrefs: [
        "/manager?section=command",
        "/manager?section=inbox",
        "/manager?section=roster",
        "/manager?section=readiness",
        "/manager?section=cadence",
        "/manager?section=dev",
        "/plans",
      ],
    },
    { id: "readiness", hrefs: ["/learn", "/lab", "/resources", "/certifications"] },
    {
      id: "practice",
      hrefs: ["/flight-check", "/market-pulse", "/prep", "/challenges", "/simulations", "/pitch"],
    },
  ],
  admin: [
    { id: "workspace", hrefs: ["/dashboard"] },
    {
      id: "team",
      hrefs: [
        "/manager?section=command",
        "/manager?section=inbox",
        "/manager?section=roster",
        "/manager?section=readiness",
        "/manager?section=cadence",
        "/manager?section=dev",
        "/plans",
      ],
    },
    { id: "readiness", hrefs: ["/learn", "/lab", "/resources", "/certifications"] },
    {
      id: "practice",
      hrefs: ["/flight-check", "/market-pulse", "/prep", "/challenges", "/simulations", "/pitch"],
    },
    { id: "system", hrefs: ["/admin"] },
  ],
};

function findNavItem(href: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.href === href);
}

export function getNavGroupsForTier(tier: AccessTier): NavGroup[] {
  return TIER_NAV_GROUPS[tier]
    .map((group) => ({
      id: group.id,
      label: NAV_GROUP_LABELS[group.id],
      items: group.hrefs
        .map((href) => findNavItem(href))
        .filter((item): item is NavItem => Boolean(item && item.tiers.includes(tier))),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolveNavHref(item: NavItem, tier: AccessTier): string {
  return tier === "manager" && item.managerHref ? item.managerHref : item.href;
}

function managerSectionFromHref(href: string): string | null {
  if (!href.startsWith("/manager")) return null;
  const query = href.split("?")[1];
  if (!query) return "command";
  const params = new URLSearchParams(query);
  return params.get("section") ?? "command";
}

export function isNavItemActive(
  item: NavItem,
  pathname: string,
  hash: string,
  tier: AccessTier,
  managerSection?: string | null,
): boolean {
  const itemSection = managerSectionFromHref(item.href);

  if (itemSection !== null) {
    if (pathname !== "/manager") return false;
    const current = managerSection && managerSection.length > 0 ? managerSection : "command";
    return current === itemSection;
  }

  if (item.managerHref && tier === "manager") {
    return pathname === "/manager" && hash === "#onboarding-plans";
  }

  const basePath = item.href.split("?")[0] ?? item.href;
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function getNavItemsForTier(tier: AccessTier) {
  return getNavGroupsForTier(tier).flatMap((group) => group.items);
}

export function canAccessRoute(tier: AccessTier, pathname: string): boolean {
  if (pathname.startsWith("/account")) {
    return true;
  }

  if (pathname.startsWith("/auth/") || pathname.startsWith("/login")) {
    return true;
  }

  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    return tier === "admin" || tier === "manager";
  }

  const match = NAV_ITEMS.find((item) => {
    const base = item.href.split("?")[0] ?? item.href;
    if (pathname === item.href) return true;
    if (pathname.startsWith(`${base}/`)) return true;
    if (base === "/manager" && pathname === "/manager") return true;
    if (base === "/manager" && pathname.startsWith("/manager?")) return true;
    return false;
  });

  if (!match) {
    return (
      pathname === "/" ||
      pathname.startsWith("/plan-steps") ||
      pathname.startsWith("/my-plan") ||
      pathname.startsWith("/learn") ||
      pathname.startsWith("/lab") ||
      pathname.startsWith("/market-pulse") ||
      pathname.startsWith("/flight-check") ||
      pathname.startsWith("/uat-bugs")
    );
  }

  return match.tiers.includes(tier);
}

export function getTierLabel(tier: AccessTier): string {
  switch (tier) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    case "se":
      return "Sales Engineer";
  }
}
