import "server-only";

import { cache } from "react";
import { getTenantById } from "@/lib/tenant/tenants";
import {
  DEFAULT_SHELL_BRANDING,
  normalizeTenantPrimaryColor,
  type TenantShellBranding,
} from "@/lib/tenant/shell-branding-shared";

export type { TenantShellBranding } from "@/lib/tenant/shell-branding-shared";
export { DEFAULT_SHELL_BRANDING } from "@/lib/tenant/shell-branding-shared";

function formatProductName(name: string) {
  return name.replace(/\s+Tenant$/i, "").trim();
}

export const getTenantShellBranding = cache(async (tenantId: string | null): Promise<TenantShellBranding> => {
  if (!tenantId) {
    return DEFAULT_SHELL_BRANDING;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return DEFAULT_SHELL_BRANDING;
  }

  return {
    tenantId: tenant.id,
    productName: formatProductName(tenant.name),
    productTagline: "PLATFORM",
    primaryColor: normalizeTenantPrimaryColor(tenant.branding.primaryColor),
    logoUrl: tenant.branding.logoUrl,
  };
});
