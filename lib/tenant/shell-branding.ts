import "server-only";

import { cache } from "react";
import { getTenantById } from "@/lib/tenant/tenants";
import {
  DEFAULT_SHELL_BRANDING,
  normalizeTenantPrimaryColor,
  resolveProductBranding,
  type TenantShellBranding,
} from "@/lib/tenant/shell-branding-shared";

export type { TenantShellBranding } from "@/lib/tenant/shell-branding-shared";
export { DEFAULT_SHELL_BRANDING } from "@/lib/tenant/shell-branding-shared";

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
    tenantName: tenant.name,
    ...resolveProductBranding(tenant.branding),
    primaryColor: normalizeTenantPrimaryColor(tenant.branding.primaryColor),
    logoUrl: tenant.branding.logoUrl,
    tenantSlug: tenant.slug,
  };
});

/** App name and subtitle for server-side text such as emails. */
export async function getTenantProductBranding(tenantId: string | null) {
  const branding = await getTenantShellBranding(tenantId);
  return { productName: branding.productName, productTagline: branding.productTagline };
}
