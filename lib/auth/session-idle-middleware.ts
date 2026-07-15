import { NextResponse, type NextRequest } from "next/server";
import { SESSION_IDLE_MS } from "@/lib/auth/rbac";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  sessionIdleMsFromMinutes,
} from "@/lib/platform/settings-shared";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

export const LAST_ACTIVITY_COOKIE = "sp_last_activity";

const IDLE_MS_CACHE_TTL = 60_000;
// Cache per tenant — a single global slot let one tenant's idle setting govern
// another tenant's sessions for up to the TTL window.
const idleMsCache = new Map<string, { value: number; loadedAt: number }>();

async function resolveIdleMs(tenantId: string | null): Promise<number> {
  const scopedTenantId = tenantId ?? DEFAULT_TENANT_ID;
  const now = Date.now();
  const cached = idleMsCache.get(scopedTenantId);
  if (cached && now - cached.loadedAt < IDLE_MS_CACHE_TTL) {
    return cached.value;
  }

  const admin = createAdminClient();
  if (!admin) {
    idleMsCache.set(scopedTenantId, { value: SESSION_IDLE_MS, loadedAt: now });
    return SESSION_IDLE_MS;
  }

  const { data } = await admin
    .from("platform_settings")
    .select("session_idle_minutes")
    .eq("tenant_id", scopedTenantId)
    .maybeSingle();

  const minutes =
    (data as { session_idle_minutes?: number | null } | null)?.session_idle_minutes ??
    DEFAULT_SESSION_IDLE_MINUTES;

  const value = sessionIdleMsFromMinutes(minutes);
  idleMsCache.set(scopedTenantId, { value, loadedAt: now });
  return value;
}

function sessionIdleCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Skip idle enforcement for auth flows and read-only session config. */
export function shouldSkipSessionIdleCheck(pathname: string): boolean {
  return (
    pathname.startsWith("/login/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/api/platform/session-idle"
  );
}

/**
 * Enforce idle timeout using an HttpOnly last-activity cookie (survives tab close;
 * unlike client-only SessionTimeout). Returns "expired" when the session should end.
 */
export async function enforceSessionIdle(
  request: NextRequest,
  response: NextResponse,
  tenantId: string | null,
): Promise<"ok" | "expired"> {
  const idleMs = await resolveIdleMs(tenantId);
  const now = Date.now();
  const raw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const lastActivity = raw ? Number.parseInt(raw, 10) : null;

  if (
    lastActivity !== null &&
    !Number.isNaN(lastActivity) &&
    now - lastActivity > idleMs
  ) {
    return "expired";
  }

  const { pathname } = request.nextUrl;
  const countsAsActivity = !pathname.startsWith("/api/");

  if (countsAsActivity) {
    response.cookies.set(
      LAST_ACTIVITY_COOKIE,
      String(now),
      sessionIdleCookieOptions(Math.ceil(idleMs / 1000) + 120),
    );
  }

  return "ok";
}

export function sessionExpiredResponse(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    const apiResponse = NextResponse.json({ error: "Session expired" }, { status: 401 });
    clearLastActivityCookie(apiResponse);
    return apiResponse;
  }

  const loginUrl = new URL(AUTH_ROUTES.login, request.url);
  loginUrl.searchParams.set("error", "session_expired");
  const redirect = NextResponse.redirect(loginUrl);
  clearLastActivityCookie(redirect);
  return redirect;
}

export function clearLastActivityCookie(response: NextResponse) {
  response.cookies.set(LAST_ACTIVITY_COOKIE, "", { ...sessionIdleCookieOptions(0), maxAge: 0 });
}
