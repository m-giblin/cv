export type ManagerPortalNavItem = {
  href: string;
  label: string;
};

export type ManagerPortalNavGroup = {
  id: string;
  label: string;
  items: ManagerPortalNavItem[];
};

export const MANAGER_PORTAL_NAV_GROUPS: ManagerPortalNavGroup[] = [
  {
    id: "command",
    label: "COMMAND",
    items: [
      { href: "/manager?section=command", label: "Command Center" },
      { href: "/manager?section=inbox", label: "Action Inbox" },
    ],
  },
  {
    id: "team",
    label: "TEAM",
    items: [
      { href: "/manager?section=roster", label: "Team Roster" },
      { href: "/manager?section=readiness", label: "Readiness Map" },
      { href: "/manager?section=leaderboard", label: "Leaderboard" },
    ],
  },
  {
    id: "coaching",
    label: "COACHING",
    items: [
      { href: "/manager?section=cadence", label: "Coaching Cadence" },
      { href: "/manager?section=mentees", label: "My Mentees" },
      { href: "/manager?section=history", label: "Review History" },
      { href: "/manager?section=dev", label: "Development" },
    ],
  },
  {
    id: "program",
    label: "PROGRAM",
    items: [
      { href: "/manager?section=program", label: "Program Tracker" },
      { href: "/plans", label: "Assign Plans" },
      { href: "/certifications", label: "Certifications" },
    ],
  },
  {
    id: "my-skills",
    label: "MY SKILLS",
    items: [
      { href: "/growth", label: "My Readiness" },
      { href: "/my-practice", label: "My Practice" },
    ],
  },
];

export function isManagerPortalNavItemActive(
  item: ManagerPortalNavItem,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (item.href.startsWith("/manager")) {
    if (pathname !== "/manager") return false;
    const itemSection = new URLSearchParams(item.href.split("?")[1] ?? "").get("section") ?? "command";
    const current = searchParams.get("section") ?? "command";
    return itemSection === current;
  }
  const base = item.href.split("?")[0] ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}
