import { getNavItemsForTier, type AccessTier } from "@/lib/auth/rbac";

export function getPageTitleFromPath(pathname: string, tier: AccessTier): string {
  if (pathname === "/account/change-password") {
    return "Change password";
  }

  const items = getNavItemsForTier(tier);
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "SE Enablement";
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
  }
}
