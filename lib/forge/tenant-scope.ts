import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

const LEGACY_ENV = "uat";

export function forgeEnvironmentForTenant(tenantId: string | null | undefined): string {
  const id = tenantId ?? DEFAULT_TENANT_ID;
  return `${LEGACY_ENV}:${id}`;
}

export function tenantIdFromForgeEnvironment(environment: string | null | undefined): string | null {
  if (!environment) return null;
  if (environment === LEGACY_ENV) return DEFAULT_TENANT_ID;
  if (environment.startsWith(`${LEGACY_ENV}:`)) {
    return environment.slice(LEGACY_ENV.length + 1) || DEFAULT_TENANT_ID;
  }
  return null;
}

export function issueMatchesTenant(
  environment: string | null | undefined,
  tenantId: string | null | undefined,
): boolean {
  const resolvedTenant = tenantId ?? DEFAULT_TENANT_ID;
  const issueTenant = tenantIdFromForgeEnvironment(environment);
  if (!issueTenant) return false;
  return issueTenant === resolvedTenant;
}
