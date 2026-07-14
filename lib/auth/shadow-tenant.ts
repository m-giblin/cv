import { getAccessTier, type AccessTier } from "@/lib/auth/rbac";
import type { ProfileRole } from "@/lib/types";

export const SHADOW_TENANT_COOKIE = "sp_shadow_tenant_id";
export const SHADOW_TENANT_NAME_COOKIE = "sp_shadow_tenant_name";
export const SHADOW_MODE_COOKIE = "sp_shadow_mode";

export type ShadowMode = "admin" | "se";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidShadowTenantId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseShadowMode(value: string | null | undefined): ShadowMode {
  return value === "se" ? "se" : "admin";
}

export type EffectiveAccess = {
  tier: AccessTier;
  actualTier: AccessTier;
  tenantId: string | null;
  isShadowing: boolean;
  shadowTenantName: string | null;
  shadowMode: ShadowMode | null;
};

export function resolveEffectiveAccess(
  role: ProfileRole,
  profileTenantId: string | null,
  shadowTenantId: string | null | undefined,
  shadowTenantName?: string | null,
  shadowMode?: string | null,
): EffectiveAccess {
  const actualTier = getAccessTier(role);

  if (actualTier === "super_admin" && isValidShadowTenantId(shadowTenantId)) {
    const mode = parseShadowMode(shadowMode);
    return {
      tier: mode === "se" ? "se" : "admin",
      actualTier,
      tenantId: shadowTenantId,
      isShadowing: true,
      shadowTenantName: shadowTenantName?.trim() || null,
      shadowMode: mode,
    };
  }

  return {
    tier: actualTier,
    actualTier,
    tenantId: profileTenantId,
    isShadowing: false,
    shadowTenantName: null,
    shadowMode: null,
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
}

export function canShadowTenantStatus(status: string): boolean {
  return status === "active" || status === "provisioning";
}
