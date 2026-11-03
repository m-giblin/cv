export const AUTH_ROUTES = {
  login: "/login",
  forgotPassword: "/login/forgot-password",
  activate: "/login/activate",
  setPassword: "/account/change-password?required=1",
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
  return pathname.startsWith("/api/share/") || pathname === "/api/auth/activate";
}

/** Where someone on a temporary password may go before they've set their own. */
export function allowedBeforePasswordChange(pathname: string) {
  return (
    pathname === "/account/change-password" ||
    pathname === "/api/account/password" ||
    pathname.startsWith("/auth/") ||
    pathname === "/api/platform/session-idle"
  );
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
