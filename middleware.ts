import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, isAuthRoute, isProtectedAppRoute, isPublicApiRoute, isPublicAppRoute } from "@/lib/auth/routes";
import { isAllowedEmail } from "@/lib/auth/email-domain";
import { validateProfileTenantEmail } from "@/lib/auth/tenant-email";
import { getApiRouteAccess, isApiRoutePublic, tierMeetsRequirement } from "@/lib/auth/api-route-policy";
import { getMfaStatus, mfaRedirectPath } from "@/lib/auth/mfa";
import {
  AccessTier,
  canAccessRoute,
  getAccessTier,
  getHomeRoute,
  getAccessDeniedRedirect,
} from "@/lib/auth/rbac";
import {
  resolveEffectiveAccess,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
  SHADOW_MODE_COOKIE,
  clearShadowCookiesOnResponse,
} from "@/lib/auth/shadow-tenant";
import {
  enforceSessionIdle,
  sessionExpiredResponse,
  shouldSkipSessionIdleCheck,
} from "@/lib/auth/session-idle-middleware";
import { mergeFeatureFlags } from "@/lib/platform/settings-shared";
import { isShareRateLimited } from "@/lib/security/share-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";
import { getTenantMaintenanceState } from "@/lib/tenant/maintenance";
import { Database } from "@/lib/database.types";
import { ProfileRole } from "@/lib/types";

async function getProfileContext(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<{ role: ProfileRole; tenantId: string | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  return {
    role: (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role ?? "basic_se",
    tenantId: (profile as { tenant_id: string | null } | null)?.tenant_id ?? null,
  };
}

async function loadTenantFeatureFlags(tenantId: string | null) {
  const admin = createAdminClient();
  if (!admin) return mergeFeatureFlags({});

  const scopedTenantId = tenantId ?? DEFAULT_TENANT_ID;
  const { data } = await admin
    .from("platform_settings")
    .select("feature_flags")
    .eq("tenant_id", scopedTenantId)
    .maybeSingle();

  if (!data) {
    const legacy = await admin.from("platform_settings").select("feature_flags").eq("id", "default").maybeSingle();
    return mergeFeatureFlags(legacy.data?.feature_flags as Record<string, boolean> | undefined);
  }

  return mergeFeatureFlags(data.feature_flags as Record<string, boolean> | undefined);
}

function isMutationMethod(method: string) {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

function homeTierForAccess(access: ReturnType<typeof resolveEffectiveAccess>): AccessTier {
  return access.actualTier === "super_admin" ? "super_admin" : access.tier;
}

function redirectSuperAdminHome(request: NextRequest, access: ReturnType<typeof resolveEffectiveAccess>) {
  const response = NextResponse.redirect(new URL(getHomeRoute(homeTierForAccess(access)), request.url));
  if (access.actualTier === "super_admin" && access.isShadowing) {
    clearShadowCookiesOnResponse(response);
  }
  return response;
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

async function expireIdleSession(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient<Database>>,
  tenantId: string | null,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (shouldSkipSessionIdleCheck(pathname)) {
    return null;
  }

  const idleStatus = await enforceSessionIdle(request, response, tenantId);
  if (idleStatus !== "expired") {
    return null;
  }

  await supabase.auth.signOut();
  const expiredResponse = sessionExpiredResponse(request, pathname.startsWith("/api/"));
  copyResponseCookies(response, expiredResponse);
  return expiredResponse;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/reset-password")) {
    return NextResponse.next({ request });
  }

  if (!url || !anonKey) {
    if (
      process.env.NODE_ENV === "production" &&
      (isProtectedAppRoute(pathname) || pathname.startsWith("/api/"))
    ) {
      return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/api/share/")) {
    const token = pathname.split("/")[3];
    if (token && isShareRateLimited(request, token)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  if (pathname === "/" && !user) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url));
  }

  if (!user) {
    if (isPublicAppRoute(pathname) || isPublicApiRoute(pathname)) {
      return response;
    }

    if (isProtectedAppRoute(pathname) || pathname.startsWith("/api/")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginUrl = new URL(AUTH_ROUTES.login, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (!user.email || !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    const loginUrl = new URL(AUTH_ROUTES.login, request.url);
    loginUrl.searchParams.set("error", "unauthorized_domain");
    return NextResponse.redirect(loginUrl);
  }

  const profileContext = await getProfileContext(supabase, user.id);
  const tenantEmailError = await validateProfileTenantEmail(user.email, profileContext.tenantId);
  if (tenantEmailError) {
    await supabase.auth.signOut();
    const loginUrl = new URL(AUTH_ROUTES.login, request.url);
    loginUrl.searchParams.set("error", "unauthorized_domain");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/share/")) {
    const token = pathname.split("/")[3];
    if (token && isShareRateLimited(request, token)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (isApiRoutePublic(pathname)) {
      return response;
    }
  }

  if (pathname.startsWith("/api/") && isApiRoutePublic(pathname)) {
    return response;
  }

  if (
    pathname.startsWith("/api/") &&
    isMutationMethod(request.method) &&
    request.headers.get("x-requested-with") !== "XMLHttpRequest"
  ) {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const mfaStatus = await getMfaStatus(supabase, user);
  const requiredPath = mfaRedirectPath(mfaStatus);

  if (mfaStatus.state !== "aal2") {
    if (requiredPath && pathname !== requiredPath) {
      return NextResponse.redirect(new URL(requiredPath, request.url));
    }

    return response;
  }

  const idleExpired = await expireIdleSession(
    request,
    response,
    supabase,
    profileContext.tenantId,
  );
  if (idleExpired) {
    return idleExpired;
  }

  const maintenanceAccess = resolveEffectiveAccess(
    profileContext.role,
    profileContext.tenantId,
    request.cookies.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    request.cookies.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    request.cookies.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );

  if (
    maintenanceAccess.actualTier !== "super_admin" &&
    pathname !== "/maintenance" &&
    !pathname.startsWith("/api/admin/support") &&
    !pathname.startsWith("/api/notifications")
  ) {
    const maintenance = await getTenantMaintenanceState(maintenanceAccess.tenantId);
    if (maintenance.maintenanceMode) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: maintenance.maintenanceMessage ?? "Tenant is in maintenance mode." },
          { status: 503 },
        );
      }
      if (isProtectedAppRoute(pathname) || pathname.startsWith("/account")) {
        const maintenanceUrl = new URL("/maintenance", request.url);
        if (maintenance.maintenanceMessage) {
          maintenanceUrl.searchParams.set("message", maintenance.maintenanceMessage);
        }
        return NextResponse.redirect(maintenanceUrl);
      }
    }
  }

  const authOnlyPaths =
    pathname === AUTH_ROUTES.login ||
    pathname.startsWith("/login/") ||
    (isAuthRoute(pathname) && !pathname.startsWith("/auth/reset-password"));

  if (authOnlyPaths) {
    const { role, tenantId } = profileContext;
    const access = resolveEffectiveAccess(
      role,
      tenantId,
      request.cookies.get(SHADOW_TENANT_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_MODE_COOKIE)?.value ?? null,
    );
    return redirectSuperAdminHome(request, access);
  }

  if (isProtectedAppRoute(pathname) || pathname.startsWith("/account")) {
    const { role, tenantId } = profileContext;
    const access = resolveEffectiveAccess(
      role,
      tenantId,
      request.cookies.get(SHADOW_TENANT_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_MODE_COOKIE)?.value ?? null,
    );
    const tier: AccessTier = access.tier;
    const featureFlags =
      tier === "super_admin" ? undefined : await loadTenantFeatureFlags(access.tenantId);

    if (!canAccessRoute(tier, pathname, featureFlags)) {
      return NextResponse.redirect(new URL(getAccessDeniedRedirect(tier, pathname), request.url));
    }
  }

  if (pathname.startsWith("/api/")) {
    const access = resolveEffectiveAccess(
      profileContext.role,
      profileContext.tenantId,
      request.cookies.get(SHADOW_TENANT_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_MODE_COOKIE)?.value ?? null,
    );
    const routeAccess = getApiRouteAccess(pathname);
    const apiTier = pathname.startsWith("/api/platform/") ? access.actualTier : access.tier;
    if (routeAccess && !tierMeetsRequirement(apiTier, routeAccess.minTier)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname === "/") {
    const access = resolveEffectiveAccess(
      profileContext.role,
      profileContext.tenantId,
      request.cookies.get(SHADOW_TENANT_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      request.cookies.get(SHADOW_MODE_COOKIE)?.value ?? null,
    );
    return redirectSuperAdminHome(request, access);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
