import type { AccessTier } from "@/lib/auth/rbac";

export type ApiRouteAccess = {
  /** null = any authenticated user */
  minTier: AccessTier | null;
  /** Bearer/cron secret validated in route handler */
  publicRoute?: boolean;
};

const TIER_RANK: Record<AccessTier, number> = {
  se: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
};

export function tierMeetsRequirement(userTier: AccessTier, required: AccessTier | null): boolean {
  if (required === null) {
    return true;
  }
  return TIER_RANK[userTier] >= TIER_RANK[required];
}

/** Longest-prefix wins. Keep sorted most-specific first. */
const API_ROUTE_ACCESS: Array<{ prefix: string; access: ApiRouteAccess }> = [
  { prefix: "/api/platform/", access: { minTier: "super_admin" } },
  { prefix: "/api/admin/", access: { minTier: "admin" } },
  { prefix: "/api/manager/", access: { minTier: "manager" } },
  { prefix: "/api/cron/", access: { publicRoute: true, minTier: null } },
  { prefix: "/api/share/", access: { publicRoute: true, minTier: null } },
  { prefix: "/api/tenant/feature-flags", access: { minTier: null } },
];

export function getApiRouteAccess(pathname: string): ApiRouteAccess | null {
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  for (const entry of API_ROUTE_ACCESS) {
    if (pathname.startsWith(entry.prefix)) {
      return entry.access;
    }
  }

  return { minTier: null };
}

export function isApiRoutePublic(pathname: string): boolean {
  return getApiRouteAccess(pathname)?.publicRoute === true;
}
