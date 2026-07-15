import { describe, expect, it } from "vitest";
import {
  forgeEnvironmentForTenant,
  issueMatchesTenant,
  tenantIdFromForgeEnvironment,
} from "@/lib/forge/tenant-scope";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

describe("forge tenant scope", () => {
  it("encodes tenant in environment", () => {
    expect(forgeEnvironmentForTenant("abc")).toBe("uat:abc");
  });

  it("maps legacy uat environment to default tenant", () => {
    expect(tenantIdFromForgeEnvironment("uat")).toBe(DEFAULT_TENANT_ID);
  });

  it("matches issues for the same tenant", () => {
    const env = forgeEnvironmentForTenant(DEFAULT_TENANT_ID);
    expect(issueMatchesTenant(env, DEFAULT_TENANT_ID)).toBe(true);
    expect(issueMatchesTenant(env, "other-tenant")).toBe(false);
  });
});
