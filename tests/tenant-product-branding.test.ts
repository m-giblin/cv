import { describe, expect, it } from "vitest";
import { buildManagerReviewReminderEmail } from "@/lib/email/manager-review-reminder-email";
import { PRODUCT_NAME, PRODUCT_TAGLINE, resolveProductBranding } from "@/lib/tenant/shell-branding-shared";

describe("resolveProductBranding", () => {
  it("falls back to the product name and subtitle when the tenant has none", () => {
    expect(resolveProductBranding(null)).toEqual({ productName: PRODUCT_NAME, productTagline: PRODUCT_TAGLINE });
    expect(resolveProductBranding({ productName: "  ", productTagline: null })).toEqual({
      productName: PRODUCT_NAME,
      productTagline: PRODUCT_TAGLINE,
    });
  });

  it("uses the tenant's own app name and subtitle", () => {
    expect(resolveProductBranding({ productName: " AE Enablement ", productTagline: "Deal readiness" })).toEqual({
      productName: "AE Enablement",
      productTagline: "Deal readiness",
    });
  });
});

describe("review reminder email header", () => {
  const base = {
    managerName: "Kathy",
    seName: "Steve",
    itemTitle: "Discovery drill",
    itemKind: "challenge" as const,
    pendingDays: 3,
    triggerLabel: "automatic reminder" as const,
  };

  it("shows the tenant's app name", () => {
    const email = buildManagerReviewReminderEmail({ ...base, productName: "SE Enablement Demo", productTagline: "Sandbox" });
    expect(email.html).toContain(">SE Enablement Demo</p>");
    expect(email.html).toContain(">Sandbox</p>");
  });

  it("defaults to the product name", () => {
    expect(buildManagerReviewReminderEmail(base).html).toContain(`>${PRODUCT_NAME}</p>`);
  });
});
