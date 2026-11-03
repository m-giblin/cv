import "server-only";

import { cache } from "react";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { resolveLearnerTerms, type LearnerTerms } from "@/lib/tenant/learner-terms";
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
    learner: resolveLearnerTerms(tenant.branding),
  };
});

/** What the tenant being viewed calls its learners, for server-rendered pages ("SE" by default). */
export const getLearnerTerms = cache(async (): Promise<LearnerTerms> => {
  const context = await resolveTenantContext().catch(() => null);
  return (await getTenantShellBranding(context?.tenantId ?? null)).learner;
});

/** App name and subtitle for server-side text such as emails. */
export async function getTenantProductBranding(tenantId: string | null) {
  const branding = await getTenantShellBranding(tenantId);
  return { productName: branding.productName, productTagline: branding.productTagline };
}
