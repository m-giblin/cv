import "server-only";

import type { MissionControlNow } from "@/lib/platform/mission-control-types";
import { getOperatorDigest } from "@/lib/platform/operator-digest";
import { listOnboardingFunnel } from "@/lib/platform/onboarding-funnel";
import { listShadowSessions } from "@/lib/platform/shadow-sessions";
import { supportSlaStatus } from "@/lib/platform/support-sla";
import { getTenantActivityMap } from "@/lib/platform/tenant-activity";
import { listSupportRequests } from "@/lib/tenant/support-requests";
import { listTenantHealthSummaries } from "@/lib/tenant/tenant-health";
import { listTenants } from "@/lib/tenant/tenants";

export async function getMissionControlNow(): Promise<MissionControlNow> {
  const tenants = await listTenants();
  const [health, openTickets, shadowSessions] = await Promise.all([
    listTenantHealthSummaries(tenants),
    listSupportRequests({ status: "active", limit: 100 }),
    listShadowSessions({ hours: 24, limit: 20 }),
  ]);

  const maintenanceTenants = tenants
    .filter((t) => t.maintenanceMode)
    .map((t) => ({ tenantId: t.id, name: t.name, message: t.maintenanceMessage }));

  const ticketsWithSla = openTickets.map((ticket) => {
    const sla = supportSlaStatus(ticket.createdAt, ticket.priority, ticket.status, ticket.firstResponseAt);
    return { ...ticket, slaLabel: sla.label, slaBreached: sla.breached };
  });

  const criticalTickets = ticketsWithSla
    .filter((t) => t.priority === "critical" || t.priority === "high" || t.slaBreached)
    .slice(0, 10);

  return {
    summary: {
      tenantCount: tenants.length,
      openTickets: openTickets.length,
      criticalTickets: openTickets.filter((t) => t.priority === "critical").length,
      slaBreached: ticketsWithSla.filter((t) => t.slaBreached).length,
      tenantsNeedingAttention: health.filter((h) => h.alerts.length > 0).length,
      activeShadowSessions: shadowSessions.filter((s) => s.active).length,
      maintenanceTenants: maintenanceTenants.length,
    },
    criticalTickets,
    recentAlerts: health.filter((h) => h.alerts.length > 0).slice(0, 8),
    maintenanceTenants,
  };
}

export async function getMissionControlBundle() {
  const tenants = await listTenants();
  const [now, onboarding, shadowSessions, digest, activityMap, health] = await Promise.all([
    getMissionControlNow(),
    listOnboardingFunnel(tenants),
    listShadowSessions({ hours: 168, limit: 50 }),
    getOperatorDigest(24, 30),
    getTenantActivityMap(tenants.map((t) => t.id)),
    listTenantHealthSummaries(tenants),
  ]);

  const healthWithActivity = health.map((item) => {
    const activity = activityMap.get(item.tenantId);
    return {
      ...item,
      lastUserActivityAt: activity?.lastUserActivityAt ?? null,
      lastAiCallAt: activity?.lastAiCallAt ?? null,
      lastAdminActionAt: activity?.lastAdminActionAt ?? null,
    };
  });

  return { now, onboarding, shadowSessions, digest, health: healthWithActivity };
}
