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

let cachedIdleMs = SESSION_IDLE_MS;
let cacheLoadedAt = 0;
const IDLE_MS_CACHE_TTL = 60_000;

async function resolveIdleMs(tenantId: string | null): Promise<number> {
  const now = Date.now();
  if (now - cacheLoadedAt < IDLE_MS_CACHE_TTL) {
    return cachedIdleMs;
  }

  const admin = createAdminClient();
  if (!admin) {
    cachedIdleMs = SESSION_IDLE_MS;
    cacheLoadedAt = now;
    return cachedIdleMs;
  }

  const scopedTenantId = tenantId ?? DEFAULT_TENANT_ID;
  const { data } = await admin
    .from("platform_settings")
    .select("session_idle_minutes")
    .eq("tenant_id", scopedTenantId)
    .maybeSingle();

  const minutes =
    (data as { session_idle_minutes?: number | null } | null)?.session_idle_minutes ??
    DEFAULT_SESSION_IDLE_MINUTES;

  cachedIdleMs = sessionIdleMsFromMinutes(minutes);
  cacheLoadedAt = now;
  return cachedIdleMs;
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
