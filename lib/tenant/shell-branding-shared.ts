import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

export type TenantShellBranding = {
  tenantId: string | null;
  productName: string;
  productTagline: string;
  primaryColor: string;
  logoUrl: string | null;
  tenantSlug?: string | null;
};

/** Fix common typos like #CC27BO → #CC27B0 */
export function normalizeTenantPrimaryColor(color: string | null | undefined, fallback = "#0071ce"): string {
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
  productName: "Enablement",
  productTagline: "PLATFORM",
  primaryColor: "#0071ce",
  logoUrl: null,
};
