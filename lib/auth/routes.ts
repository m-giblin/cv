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

export function isProtectedAppRoute(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return false;
  }

  return !isAuthRoute(pathname) && pathname !== "/";
}
