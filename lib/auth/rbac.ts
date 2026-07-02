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
      return "/manager";
    case "se":
      return "/dashboard";
  }
}

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "manager" | "development" | "prep" | "certifications" | "plans" | "challenges" | "simulations" | "resources" | "feedback" | "growth" | "admin" | "account";
  tiers: AccessTier[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My workspace", icon: "dashboard", tiers: ["admin", "se"] },
  { href: "/growth", label: "My growth", icon: "growth", tiers: ["se"] },
  { href: "/resources", label: "Resources", icon: "resources", tiers: ["admin", "manager", "se"] },
  { href: "/feedback", label: "My feedback", icon: "feedback", tiers: ["se"] },
  { href: "/manager", label: "Team overview", icon: "manager", tiers: ["admin", "manager"] },
  { href: "/prep", label: "Deal prep", icon: "prep", tiers: ["admin", "manager", "se"] },
  { href: "/certifications", label: "Certifications", icon: "certifications", tiers: ["admin", "manager", "se"] },
  { href: "/development", label: "Development", icon: "development", tiers: ["admin", "manager", "se"] },
  { href: "/plans", label: "Plans", icon: "plans", tiers: ["admin", "manager"] },
  { href: "/challenges", label: "Challenges", icon: "challenges", tiers: ["admin", "manager", "se"] },
  { href: "/simulations", label: "Simulations", icon: "simulations", tiers: ["admin", "manager", "se"] },
  { href: "/admin", label: "Admin", icon: "admin", tiers: ["admin"] },
  { href: "/account", label: "Account", icon: "account", tiers: ["admin", "manager", "se"] },
];

export function getNavItemsForTier(tier: AccessTier) {
  return NAV_ITEMS.filter((item) => item.tiers.includes(tier));
}

export function canAccessRoute(tier: AccessTier, pathname: string): boolean {
  if (pathname.startsWith("/account")) {
    return true;
  }

  if (pathname.startsWith("/auth/") || pathname.startsWith("/login")) {
    return true;
  }

  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (!match) {
    return pathname === "/" || pathname.startsWith("/plan-steps");
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
