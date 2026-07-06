import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, isAuthRoute, isProtectedAppRoute, isPublicApiRoute, isPublicAppRoute } from "@/lib/auth/routes";
import { isAllowedEmail } from "@/lib/auth/email-domain";
import { getMfaStatus, mfaRedirectPath } from "@/lib/auth/mfa";
import {
  AccessTier,
  canAccessRoute,
  getAccessTier,
  getHomeRoute,
} from "@/lib/auth/rbac";
import { Database } from "@/lib/database.types";
import { ProfileRole } from "@/lib/types";

async function getProfileRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<ProfileRole> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = profile as { role: ProfileRole } | null;
  return role?.role ?? "basic_se";
}

function isMutationMethod(method: string) {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
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

  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url));
    }

    const role = await getProfileRole(supabase, user.id);
    const home = getHomeRoute(getAccessTier(role));
    return NextResponse.redirect(new URL(home, request.url));
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

  const authOnlyPaths =
    pathname === AUTH_ROUTES.login ||
    pathname.startsWith("/login/") ||
    (isAuthRoute(pathname) && !pathname.startsWith("/auth/reset-password"));

  if (authOnlyPaths) {
    const role = await getProfileRole(supabase, user.id);
    return NextResponse.redirect(new URL(getHomeRoute(getAccessTier(role)), request.url));
  }

  if (isProtectedAppRoute(pathname) || pathname.startsWith("/account")) {
    const role = await getProfileRole(supabase, user.id);
    const tier: AccessTier = getAccessTier(role);

    if (pathname.startsWith("/design") && tier !== "admin") {
      return NextResponse.redirect(new URL(getHomeRoute(tier), request.url));
    }

    if (!canAccessRoute(tier, pathname)) {
      return NextResponse.redirect(new URL(getHomeRoute(tier), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
