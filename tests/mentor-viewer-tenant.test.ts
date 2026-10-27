import { describe, expect, it } from "vitest";
import { viewerTenantId } from "@/lib/mentoring/mentor-records";

describe("viewerTenantId", () => {
  it("uses the profile's tenant", () => {
    expect(viewerTenantId({ role: "se", tenant_id: "t1", home_tenant_id: null })).toBe("t1");
  });
  it("falls back to a super admin's home tenant so they can mentor there", () => {
    expect(viewerTenantId({ role: "super_admin", tenant_id: null, home_tenant_id: "t1" })).toBe("t1");
  });
  it("is null with no tenant at all", () => {
    expect(viewerTenantId({ role: "super_admin", tenant_id: null })).toBeNull();
    expect(viewerTenantId(null)).toBeNull();
  });
});
