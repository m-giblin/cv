import { describe, expect, it } from "vitest";
import {
  emailDomain,
  isEmailDomainAllowedForTenant,
  normalizeEmailDomains,
  validateEmailForTenant,
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

  it("accepts domains saved with a leading @ or capitals", async () => {
    // The AE tenant had "@sailpoint.com" saved, which rejected every address.
    expect(isEmailDomainAllowedForTenant("matt.russell@sailpoint.com", ["@sailpoint.com"])).toBe(true);
    expect(isEmailDomainAllowedForTenant("user@acme.com", [" @ACME.com "])).toBe(true);
    expect(await validateEmailForTenant("matt.russell@sailpoint.com", "t", async () => ["@sailpoint.com"])).toBeNull();
    expect(await validateEmailForTenant("user@other.com", "t", async () => ["@sailpoint.com"])).toBe(
      "Email must use an allowed domain for this tenant (@sailpoint.com).",
    );
  });

  it("cleans domains for saving", () => {
    expect(normalizeEmailDomains(["@SailPoint.com", "sailpoint.com", " ", "acme.com"])).toEqual(["sailpoint.com", "acme.com"]);
  });
});
