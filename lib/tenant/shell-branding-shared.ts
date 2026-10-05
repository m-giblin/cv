import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

/** The product's name, kept in one place so it can change in one place. */
export const PRODUCT_NAME = "SE Enablement";

export type TenantShellBranding = {
  tenantId: string | null;
  productName: string;
  productTagline: string;
  primaryColor: string;
  logoUrl: string | null;
  tenantSlug?: string | null;
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
  productTagline: "PLATFORM",
  primaryColor: "#0033A1",
  logoUrl: null,
};
