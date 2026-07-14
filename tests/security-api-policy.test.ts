import { describe, expect, it } from "vitest";
import { getApiRouteAccess, tierMeetsRequirement } from "@/lib/auth/api-route-policy";

describe("API route security matrix", () => {
  it("requires super_admin for platform APIs", () => {
    const access = getApiRouteAccess("/api/platform/tenants");
    expect(access?.minTier).toBe("super_admin");
    expect(tierMeetsRequirement("admin", access!.minTier!)).toBe(false);
    expect(tierMeetsRequirement("super_admin", access!.minTier!)).toBe(true);
  });

  it("requires admin for admin APIs", () => {
    const access = getApiRouteAccess("/api/admin/users");
    expect(access?.minTier).toBe("admin");
    expect(tierMeetsRequirement("manager", access!.minTier!)).toBe(false);
    expect(tierMeetsRequirement("admin", access!.minTier!)).toBe(true);
  });

  it("requires manager for manager APIs", () => {
    const access = getApiRouteAccess("/api/manager/coaching-notes");
    expect(access?.minTier).toBe("manager");
    expect(tierMeetsRequirement("se", access!.minTier!)).toBe(false);
    expect(tierMeetsRequirement("manager", access!.minTier!)).toBe(true);
  });

  it("allows any authenticated user for unlisted APIs", () => {
    const access = getApiRouteAccess("/api/gamification/scorecard");
    expect(access?.minTier).toBeNull();
    expect(tierMeetsRequirement("se", access!.minTier)).toBe(true);
  });

  it("marks share and cron routes as public", () => {
    expect(getApiRouteAccess("/api/share/abc")?.publicRoute).toBe(true);
    expect(getApiRouteAccess("/api/cron/manager-digest")?.publicRoute).toBe(true);
  });
});
