/**
 * Canonical platform console routes. The console used to switch views with `?view=`; each view now
 * has its own path. `?tenant=` and `?tab=` (tenant detail) stay as query params.
 */

export type PlatformViewId =
  | "now"
  | "onboarding"
  | "shadow"
  | "overview"
  | "support"
  | "global-audit"
  | "tenant"
  | "usage"
  | "settings";

export const PLATFORM_VIEW_PATHS: Record<PlatformViewId, string> = {
  now: "/platform",
  tenant: "/platform/tenants",
  overview: "/platform/tenants/health",
  onboarding: "/platform/tenants/onboarding",
  support: "/platform/support",
  shadow: "/platform/support/shadow",
  usage: "/platform/usage",
  settings: "/platform/settings",
  "global-audit": "/platform/settings/audit",
};

export function platformViewFromPath(pathname: string): PlatformViewId | null {
  const clean = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  const entry = (Object.entries(PLATFORM_VIEW_PATHS) as [PlatformViewId, string][]).find(
    ([, path]) => path === clean,
  );
  return entry ? entry[0] : null;
}

/** Rewrites a legacy `/platform?view=x&…` href to its canonical path, keeping other params. */
export function canonicalPlatformHref(href: string): string {
  const [path, query = ""] = href.split("?");
  if (path !== "/platform") return href;
  const params = new URLSearchParams(query);
  const view = params.get("view");
  if (!view || !(view in PLATFORM_VIEW_PATHS)) return href;
  params.delete("view");
  const rest = params.toString();
  const target = PLATFORM_VIEW_PATHS[view as PlatformViewId];
  return rest ? `${target}?${rest}` : target;
}
