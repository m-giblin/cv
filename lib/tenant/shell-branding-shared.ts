import { DEFAULT_LEARNER_TERMS, type LearnerTerms } from "@/lib/tenant/learner-terms";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

/** The product's name, kept in one place so it can change in one place. */
export const PRODUCT_NAME = "SE Enablement";
export const PRODUCT_TAGLINE = "Field readiness";

/** Longest app name or subtitle a tenant can set (matches the tenants table check). */
export const PRODUCT_TEXT_MAX_LENGTH = 40;

export type TenantShellBranding = {
  tenantId: string | null;
  /** The tenant's own name ("SailPoint"); null outside a tenant. */
  tenantName?: string | null;
  /** App name in the header and page titles; the tenant's setting or PRODUCT_NAME. */
  productName: string;
  productTagline: string;
  primaryColor: string;
  logoUrl: string | null;
  tenantSlug?: string | null;
  /** What this tenant calls the people it trains: { one: "AE", many: "AEs" }. */
  learner: LearnerTerms;
};

/** Fix common typos like #OO33A1 → #0033A1 (letter O typed for zero) */
export function normalizeTenantPrimaryColor(color: string | null | undefined, fallback = "#0033A1"): string {
  if (!color?.trim()) return fallback;

  let hex = color.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  hex = `#${hex
    .slice(1)
    .replace(/O/g, "0")
    .replace(/o/g, "0")}`;

  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : fallback;
}

export const DEFAULT_SHELL_BRANDING: TenantShellBranding = {
  tenantId: DEFAULT_TENANT_ID,
  productName: PRODUCT_NAME,
  productTagline: PRODUCT_TAGLINE,
  primaryColor: "#0033A1",
  logoUrl: null,
  learner: DEFAULT_LEARNER_TERMS,
};

/** The tenant's app name and subtitle, falling back to the product default when unset. */
export function resolveProductBranding(tenant: { productName?: string | null; productTagline?: string | null } | null) {
  return {
    productName: tenant?.productName?.trim() || PRODUCT_NAME,
    productTagline: tenant?.productTagline?.trim() || PRODUCT_TAGLINE,
  };
}
