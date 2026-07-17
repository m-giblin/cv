import "server-only";

import { getTenantUsageSummary, listTenants } from "@/lib/tenant/tenants";
import type { TenantUsageFleet } from "@/lib/tenant/types";

export async function getTenantUsageFleet(): Promise<TenantUsageFleet> {
  const tenants = await listTenants();

  const rows = await Promise.all(
    tenants.map(async (tenant) => {
      const usage = await getTenantUsageSummary(tenant.id);
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        status: tenant.status,
        activeUsers: usage.activeUsers,
        aiCalls30d: usage.aiCalls,
        simulationSessions30d: usage.simulationSessions,
        seatQuota: tenant.seatQuota,
        billingStatus: tenant.billingStatus,
      };
    }),
  );

  const totals = rows.reduce(
    (acc, row) => ({
      tenantCount: acc.tenantCount + 1,
      totalUsers: acc.totalUsers + row.activeUsers,
      aiCalls30d: acc.aiCalls30d + row.aiCalls30d,
      simulationSessions30d: acc.simulationSessions30d + row.simulationSessions30d,
    }),
    { tenantCount: 0, totalUsers: 0, aiCalls30d: 0, simulationSessions30d: 0 },
  );

  return {
    totals,
    tenants: rows.sort((a, b) => b.activeUsers - a.activeUsers),
  };
}
