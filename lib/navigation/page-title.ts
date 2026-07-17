import { getNavItemsForTier, type AccessTier } from "@/lib/auth/rbac";

const MANAGER_SECTION_LABELS: Record<string, string> = {
  command: "Command Center",
  inbox: "Action Inbox",
  roster: "Team Roster",
  readiness: "Readiness Map",
  leaderboard: "Leaderboard",
  cadence: "Coaching Cadence",
  history: "Review History",
  dev: "Development",
  program: "Program Tracker",
  assign: "Assign Plans",
};

const ADMIN_TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  users: "Users",
  plans: "Plans",
  competencies: "Content",
  analytics: "Analytics",
  ai: "AI & Sims",
  corpus: "Corpus",
  routing: "Q&A Routing",
  audit: "Audit log",
  help: "Help",
  settings: "Settings",
};

export function getPageTitleFromPath(
  pathname: string,
  tier: AccessTier,
  options?: { managerSection?: string | null; adminTab?: string | null; fallbackTitle?: string },
): string {
  if (pathname === "/account/change-password") {
    return "Change password";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const tab = options?.adminTab ?? "overview";
    return ADMIN_TAB_LABELS[tab] ?? "Admin Console";
  }

  if (pathname === "/my-practice") {
    return "My Practice";
  }

  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    const section = options?.managerSection ?? "command";
    return MANAGER_SECTION_LABELS[section] ?? "Command Center";
  }

  const items = getNavItemsForTier(tier);
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? options?.fallbackTitle ?? "Dashboard";
}

export function getRolePillClass(tier: AccessTier) {
  switch (tier) {
    case "se":
      return "sp-role-pill sp-role-pill-se";
    case "manager":
      return "sp-role-pill sp-role-pill-manager";
    case "admin":
      return "sp-role-pill sp-role-pill-admin";
  }
}

export function getRolePillLabel(tier: AccessTier) {
  switch (tier) {
    case "se":
      return "Sales Engineer";
    case "manager":
      return "Manager";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Operator";
  }
}

export function getWorkspacePillLabel(
  workspace: "platform" | "tenant_admin" | "manager" | "se",
) {
  switch (workspace) {
    case "platform":
      return "Super Admin";
    case "tenant_admin":
      return "Tenant Admin";
    case "manager":
      return "Manager";
    case "se":
      return "User";
    default: {
      const _exhaustive: never = workspace;
      return _exhaustive;
    }
  }
}
