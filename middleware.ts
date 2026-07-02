import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, isAuthRoute, isProtectedAppRoute } from "@/lib/auth/routes";
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

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/reset-password")) {
    return NextResponse.next({ request });
  }

  if (!url || !anonKey) {
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
    if (isProtectedAppRoute(pathname) || pathname.startsWith("/api/")) {
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

  const mfaStatus = await getMfaStatus(supabase);
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

    if (!canAccessRoute(tier, pathname)) {
      return NextResponse.redirect(new URL(getHomeRoute(tier), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
