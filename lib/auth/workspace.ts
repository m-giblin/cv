import type { AccessTier } from "@/lib/auth/rbac";
import { getAccessTier } from "@/lib/auth/rbac";
import type { ProfileRole } from "@/lib/types";

/** Distinct product surfaces — nav and chrome swap entirely per hat. */
export type WorkspaceHat = "platform" | "tenant_admin" | "manager" | "se";

export const WORKSPACE_HAT_COOKIE = "sp_workspace_hat";

export const WORKSPACE_HAT_ORDER: WorkspaceHat[] = [
  "platform",
  "tenant_admin",
  "manager",
  "se",
];

export const WORKSPACE_HAT_LABELS: Record<WorkspaceHat, string> = {
  platform: "Super Admin",
  tenant_admin: "Tenant Admin",
  manager: "Manager",
  se: "User",
};

export const WORKSPACE_HAT_DESCRIPTIONS: Record<WorkspaceHat, string> = {
  platform: "Platform Console — tenants, support, global ops",
  tenant_admin: "Tenant Admin — users, plans, settings for this org",
  manager: "Manager — team coaching, program, readiness",
  se: "User — personal ramp, practice, readiness",
};

const HAT_SET = new Set<string>(WORKSPACE_HAT_ORDER);

export function isWorkspaceHat(value: unknown): value is WorkspaceHat {
  return typeof value === "string" && HAT_SET.has(value);
}

/** Default hats when profiles.workspace_hats is null. */
export function defaultHatsForRole(role: ProfileRole): WorkspaceHat[] {
  const tier = getAccessTier(role);
  switch (tier) {
    case "super_admin":
      // Platform only — Tenant Admin / Manager / User require explicit hats.
      return ["platform"];
    case "admin":
      // Tenant Admin can also operate as Manager and User.
      return ["tenant_admin", "manager", "se"];
    case "manager":
      return ["manager", "se"];
    case "se":
      return ["se"];
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export function normalizeWorkspaceHats(hats: unknown): WorkspaceHat[] | null {
  if (!Array.isArray(hats) || hats.length === 0) return null;
  const next = WORKSPACE_HAT_ORDER.filter((hat) => hats.includes(hat));
  return next.length > 0 ? next : null;
}

export function resolveWorkspaceHats(
  role: ProfileRole,
  storedHats: unknown,
): WorkspaceHat[] {
  return normalizeWorkspaceHats(storedHats) ?? defaultHatsForRole(role);
}

/**
 * Hats available in the current session. Super Admins who open a tenant keep
 * Platform (Super Admin) in the switcher so they can return without re-auth.
 */
export function resolveSessionWorkspaceHats(
  role: ProfileRole,
  storedHats: unknown,
  options?: { enteredTenant?: boolean; enterMode?: "admin" | "manager" | "se" | null },
): WorkspaceHat[] {
  const base = resolveWorkspaceHats(role, storedHats);
  if (!options?.enteredTenant || getAccessTier(role) !== "super_admin") {
    return base;
  }

  // Hats match the work surface you opened — Manager does not imply Tenant Admin.
  const extras: WorkspaceHat[] =
    options.enterMode === "se"
      ? ["platform", "se"]
      : options.enterMode === "manager"
        ? ["platform", "manager", "se"]
        : ["platform", "tenant_admin", "manager", "se"];

  const allowed = new Set<WorkspaceHat>([...base, ...extras]);
  return WORKSPACE_HAT_ORDER.filter((hat) => allowed.has(hat));
}

/** Map a workspace hat to the entered-tenant mode cookie (or null to leave Platform). */
export function enterModeForWorkspaceHat(hat: WorkspaceHat): "admin" | "manager" | "se" | null {
  switch (hat) {
    case "platform":
      return null;
    case "tenant_admin":
      return "admin";
    case "manager":
      return "manager";
    case "se":
      return "se";
    default: {
      const _exhaustive: never = hat;
      return _exhaustive;
    }
  }
}

export function getWorkspaceHome(hat: WorkspaceHat): string {
  switch (hat) {
    case "platform":
      return "/platform";
    case "tenant_admin":
      return "/admin";
    case "manager":
      return "/manager?section=command";
    case "se":
      return "/dashboard";
    default: {
      const _exhaustive: never = hat;
      return _exhaustive;
    }
  }
}

/** Map access tier used by legacy APIs onto a workspace hat for chrome. */
export function workspaceFromAccessTier(tier: AccessTier): WorkspaceHat {
  switch (tier) {
    case "super_admin":
      return "platform";
    case "admin":
      return "tenant_admin";
    case "manager":
      return "manager";
    case "se":
      return "se";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export function workspaceFromPathname(pathname: string): WorkspaceHat | null {
  if (pathname.startsWith("/platform")) return "platform";
  if (pathname.startsWith("/admin")) return "tenant_admin";
  if (
    pathname.startsWith("/manager") ||
    pathname === "/plans" ||
    pathname.startsWith("/plans/") ||
    pathname === "/plan-calendar" ||
    pathname.startsWith("/plan-calendar/")
  ) {
    return "manager";
  }
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/my-plan") ||
    pathname.startsWith("/growth-plan")
  ) {
    return "se";
  }
  return null;
}

export function pickDefaultWorkspace(hats: WorkspaceHat[]): WorkspaceHat {
  for (const hat of WORKSPACE_HAT_ORDER) {
    if (hats.includes(hat)) return hat;
  }
  return "se";
}

/**
 * Resolve which workspace drives the shell nav.
 * Path → cookie → enter-tenant default → first available hat.
 * Super Admin can always pick Platform while entered into a tenant.
 */
export function resolveActiveWorkspace(params: {
  hats: WorkspaceHat[];
  cookieValue: string | null | undefined;
  pathname?: string | null;
  shadowMode?: "admin" | "manager" | "se" | null;
}): WorkspaceHat {
  const { hats, cookieValue, pathname, shadowMode } = params;

  // URL wins so the shell matches the page on first paint (avoids hydration skew).
  const fromPath = pathname ? workspaceFromPathname(pathname) : null;
  if (fromPath && hats.includes(fromPath)) {
    return fromPath;
  }

  if (isWorkspaceHat(cookieValue) && hats.includes(cookieValue)) {
    return cookieValue;
  }

  // Entered a tenant but no matching path/cookie — land on that surface.
  if (shadowMode === "admin" && hats.includes("tenant_admin")) {
    return "tenant_admin";
  }
  if (shadowMode === "manager" && hats.includes("manager")) {
    return "manager";
  }
  if (shadowMode === "se" && hats.includes("se")) {
    return "se";
  }

  return pickDefaultWorkspace(hats);
}

/** Whether this hat may open the given app path (UI gate; APIs still use role tier). */
export function workspaceCanAccessPath(hat: WorkspaceHat, pathname: string): boolean {
  if (pathname.startsWith("/account") || pathname.startsWith("/auth")) return true;

  switch (hat) {
    case "platform":
      return pathname.startsWith("/platform");
    case "tenant_admin":
      return pathname.startsWith("/admin");
    case "manager":
      return (
        pathname.startsWith("/manager") ||
        pathname.startsWith("/plans") ||
        pathname.startsWith("/plan-calendar") ||
        pathname.startsWith("/certifications") ||
        pathname.startsWith("/my-practice") ||
        pathname.startsWith("/growth") ||
        pathname.startsWith("/simulations") ||
        pathname.startsWith("/challenges") ||
        pathname.startsWith("/pitch") ||
        pathname.startsWith("/prep") ||
        pathname.startsWith("/flight-check") ||
        pathname.startsWith("/market-pulse") ||
        pathname.startsWith("/learn") ||
        pathname.startsWith("/lab") ||
        pathname.startsWith("/feedback") ||
        pathname.startsWith("/development") ||
        pathname.startsWith("/resources")
      );
    case "se":
      return (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/my-plan") ||
        pathname.startsWith("/growth-plan") ||
        pathname.startsWith("/my-practice") ||
        pathname.startsWith("/growth") ||
        pathname.startsWith("/simulations") ||
        pathname.startsWith("/challenges") ||
        pathname.startsWith("/pitch") ||
        pathname.startsWith("/prep") ||
        pathname.startsWith("/flight-check") ||
        pathname.startsWith("/market-pulse") ||
        pathname.startsWith("/learn") ||
        pathname.startsWith("/lab") ||
        pathname.startsWith("/feedback") ||
        pathname.startsWith("/certifications") ||
        pathname.startsWith("/resources") ||
        pathname.startsWith("/plan-steps") ||
        pathname.startsWith("/plan-calendar")
      );
    default: {
      const _exhaustive: never = hat;
      return _exhaustive;
    }
  }
}

export function pathRequiresWorkspaceHat(pathname: string): WorkspaceHat | null {
  if (pathname.startsWith("/platform")) return "platform";
  if (pathname.startsWith("/admin")) return "tenant_admin";
  if (
    pathname.startsWith("/manager") ||
    pathname === "/plans" ||
    pathname.startsWith("/plans/") ||
    pathname === "/plan-calendar" ||
    pathname.startsWith("/plan-calendar/")
  ) {
    return "manager";
  }
  return null;
}
