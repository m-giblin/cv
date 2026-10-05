import { describe, expect, it } from "vitest";
import { ADMIN_ROUTES, adminPathFor, adminRouteFromPath, canonicalAdminHref } from "@/lib/admin/admin-routes";
import {
  PLATFORM_VIEW_PATHS,
  canonicalPlatformHref,
  platformViewFromPath,
} from "@/lib/platform/platform-routes";

describe("admin routes", () => {
  it("rewrites legacy tab links", () => {
    expect(canonicalAdminHref("/admin?tab=users")).toBe("/admin/people");
    expect(canonicalAdminHref("/admin?tab=overview")).toBe("/admin");
    expect(canonicalAdminHref("/admin?tab=routing")).toBe("/admin/content/corpus");
    expect(canonicalAdminHref("/admin?tab=settings")).toBe("/admin/settings/features");
    expect(canonicalAdminHref("/admin?tab=settings&section=retention")).toBe("/admin/settings/retention");
    expect(canonicalAdminHref("/admin?tab=settings&section=basic")).toBe("/admin/settings/general");
    expect(canonicalAdminHref("/admin?tab=users&x=1")).toBe("/admin/people?x=1");
  });

  it("leaves unknown hrefs alone", () => {
    expect(canonicalAdminHref("/admin")).toBe("/admin");
    expect(canonicalAdminHref("/admin?tab=nope")).toBe("/admin?tab=nope");
  });

  it("round-trips every route", () => {
    for (const route of ADMIN_ROUTES) {
      expect(adminRouteFromPath(route.path)).toEqual(route);
      expect(adminPathFor(route.tab, route.section)).toBe(route.path);
    }
  });
});

describe("platform routes", () => {
  it("rewrites legacy view links and keeps other params", () => {
    expect(canonicalPlatformHref("/platform?view=usage")).toBe("/platform/usage");
    expect(canonicalPlatformHref("/platform?view=tenant&tenant=t1&tab=sso")).toBe(
      "/platform/tenants?tenant=t1&tab=sso",
    );
    expect(canonicalPlatformHref("/platform?view=now")).toBe("/platform");
    expect(canonicalPlatformHref("/platform?view=nope")).toBe("/platform?view=nope");
  });

  it("maps paths back to views", () => {
    for (const [view, path] of Object.entries(PLATFORM_VIEW_PATHS)) {
      expect(platformViewFromPath(path)).toBe(view);
    }
  });
});
