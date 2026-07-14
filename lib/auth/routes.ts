export const AUTH_ROUTES = {
  login: "/login",
  mfaEnroll: "/auth/mfa/enroll",
  mfaVerify: "/auth/mfa/verify",
  signOut: "/auth/signout",
  callback: "/auth/callback",
  dashboard: "/dashboard",
} as const;

export function isAuthRoute(pathname: string) {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/auth/")
  );
}

export function isPublicAppRoute(pathname: string) {
  return pathname.startsWith("/share/");
}

export function isPublicApiRoute(pathname: string) {
  return pathname.startsWith("/api/share/");
}

export function isProtectedAppRoute(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return false;
  }

  if (isPublicAppRoute(pathname)) {
    return false;
  }

  return !isAuthRoute(pathname) && pathname !== "/";
}
