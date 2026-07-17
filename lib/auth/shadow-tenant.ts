import { getAccessTier, type AccessTier } from "@/lib/auth/rbac";
import type { ProfileRole } from "@/lib/types";

export const SHADOW_TENANT_COOKIE = "sp_shadow_tenant_id";
export const SHADOW_TENANT_NAME_COOKIE = "sp_shadow_tenant_name";
export const SHADOW_MODE_COOKIE = "sp_shadow_mode";
/** Highest workspace opened this session — keeps Manager available after switching to User. */
export const SHADOW_CEILING_COOKIE = "sp_shadow_ceiling";
/**
 * Set when a super-admin impersonates a specific end user within a shadowed
 * tenant (POST /api/platform/shadow with mode "user"). The underlying
 * SHADOW_MODE_COOKIE stays "se" — this cookie is additive, informational
 * cargo for the UI (banner, audit trail, support-ticket attribution). It is
 * NOT threaded through every data-fetching path yet, so a "user" shadow
 * session still renders the tenant's generic SE workspace rather than that
 * exact user's personal data everywhere. Treat it as a hint, not a guarantee.
 */
export const SHADOW_IMPERSONATE_USER_COOKIE = "sp_shadow_impersonate_user_id";

/** Surface the operator is working as inside a tenant. */
export type ShadowMode = "admin" | "manager" | "se";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isValidShadowTenantId(value: string | null | undefined): value is string {
  return isValidUuid(value);
}

export function parseShadowMode(value: string | null | undefined): ShadowMode {
  if (value === "se") return "se";
  if (value === "manager") return "manager";
  return "admin";
}

function shadowModeRank(mode: ShadowMode): number {
  switch (mode) {
    case "se":
      return 1;
    case "manager":
      return 2;
    case "admin":
      return 3;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Keep the higher of two enter modes (admin > manager > se). */
export function maxShadowMode(a: ShadowMode, b: ShadowMode): ShadowMode {
  return shadowModeRank(a) >= shadowModeRank(b) ? a : b;
}

export function shadowModeToAccessTier(mode: ShadowMode): AccessTier {
  switch (mode) {
    case "se":
      return "se";
    case "manager":
      return "manager";
    case "admin":
      return "admin";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export type EffectiveAccess = {
  tier: AccessTier;
  actualTier: AccessTier;
  tenantId: string | null;
  isShadowing: boolean;
  shadowTenantName: string | null;
  shadowMode: ShadowMode | null;
  /** Populated only when shadowMode is "se" and an operator impersonated a specific user. */
  impersonateUserId: string | null;
};

export function resolveEffectiveAccess(
  role: ProfileRole,
  profileTenantId: string | null,
  shadowTenantId: string | null | undefined,
  shadowTenantName?: string | null,
  shadowMode?: string | null,
  impersonateUserId?: string | null,
): EffectiveAccess {
  const actualTier = getAccessTier(role);

  if (actualTier === "super_admin" && isValidShadowTenantId(shadowTenantId)) {
    const mode = parseShadowMode(shadowMode);
    return {
      tier: shadowModeToAccessTier(mode),
      actualTier,
      tenantId: shadowTenantId,
      isShadowing: true,
      shadowTenantName: shadowTenantName?.trim() || null,
      shadowMode: mode,
      impersonateUserId: mode === "se" && isValidUuid(impersonateUserId) ? impersonateUserId : null,
    };
  }

  return {
    tier: actualTier,
    actualTier,
    tenantId: profileTenantId,
    isShadowing: false,
    shadowTenantName: null,
    shadowMode: null,
    impersonateUserId: null,
  };
}

export function shadowCookieOptions(maxAgeSeconds = 60 * 60 * 8) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Clear shadow session cookies on a NextResponse (login reset, exit shadow). */
export function clearShadowCookiesOnResponse(response: {
  cookies: { set: (name: string, value: string, options: ReturnType<typeof shadowCookieOptions>) => void };
}) {
  const cleared = { ...shadowCookieOptions(0), maxAge: 0 };
  response.cookies.set(SHADOW_TENANT_COOKIE, "", cleared);
  response.cookies.set(SHADOW_TENANT_NAME_COOKIE, "", cleared);
  response.cookies.set(SHADOW_MODE_COOKIE, "", cleared);
  response.cookies.set(SHADOW_CEILING_COOKIE, "", cleared);
  response.cookies.set(SHADOW_IMPERSONATE_USER_COOKIE, "", cleared);
}

export function canShadowTenantStatus(status: string): boolean {
  return status === "active" || status === "provisioning";
}
