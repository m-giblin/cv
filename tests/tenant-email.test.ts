import { describe, expect, it } from "vitest";
import {
  emailDomain,
  isEmailDomainAllowedForTenant,
} from "@/lib/auth/tenant-email";

describe("tenant email domains", () => {
  it("extracts email domain", () => {
    expect(emailDomain("User@Example.COM")).toBe("example.com");
    expect(emailDomain("invalid")).toBeNull();
  });

  it("falls back to platform defaults when tenant has no custom domains", () => {
    expect(isEmailDomainAllowedForTenant("user@sailpoint.com", [])).toBe(true);
    expect(isEmailDomainAllowedForTenant("user@other.com", [])).toBe(false);
  });

  it("enforces tenant-specific domains when configured", () => {
    expect(isEmailDomainAllowedForTenant("user@acme.com", ["acme.com"])).toBe(true);
    expect(isEmailDomainAllowedForTenant("user@sailpoint.com", ["acme.com"])).toBe(false);
    expect(isEmailDomainAllowedForTenant("user@example.com", ["example.com", "acme.com"])).toBe(true);
  });
});
