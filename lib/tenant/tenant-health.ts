import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { defaultFeatureFlags, mergeFeatureFlags } from "@/lib/platform/settings-shared";
import type { Tenant, TenantHealth } from "@/lib/tenant/types";
import { getTenantUsageSummary } from "@/lib/tenant/tenants";

export type { TenantHealth };

async function countOpenSupport(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["open", "in_progress"]);
  return count ?? 0;
}

async function hasAdminInvite(tenantId: string): Promise<{ invited: boolean; accepted: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { invited: false, accepted: false };
  const { data } = await admin
    .from("tenant_admin_invites")
    .select("status")
    .eq("tenant_id", tenantId);
  const rows = data ?? [];
  return {
    invited: rows.length > 0,
    accepted: rows.some((row) => row.status === "accepted"),
  };
}

function flagsCustomized(stored: Record<string, boolean> | null | undefined): boolean {
  const defaults = defaultFeatureFlags();
  const merged = mergeFeatureFlags(stored);
  return Object.keys(defaults).some((key) => merged[key] !== defaults[key]);
}

export async function getTenantHealth(tenant: Tenant): Promise<TenantHealth> {
  const admin = createAdminClient();
  const [usage, invite, openSupport] = await Promise.all([
    getTenantUsageSummary(tenant.id),
    hasAdminInvite(tenant.id),
    countOpenSupport(tenant.id),
  ]);

  let flagsCustomizedCount = false;
  if (admin) {
    const { data } = await admin
      .from("platform_settings")
      .select("feature_flags")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    flagsCustomizedCount = flagsCustomized((data?.feature_flags as Record<string, boolean>) ?? null);
  }

  const alerts: string[] = [];
  if (tenant.status === "provisioning") alerts.push("Still provisioning");
  if (tenant.status === "suspended") alerts.push("Suspended");
  if (usage.activeUsers === 0 && tenant.status === "active") alerts.push("No users yet");
  if (!invite.invited) alerts.push("No tenant admin invited");
  if (invite.invited && !invite.accepted) alerts.push("Admin invite pending");
  if (openSupport > 0) alerts.push(`${openSupport} open support ticket(s)`);
  if (tenant.maintenanceMode) alerts.push("Maintenance mode");

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    userCount: usage.activeUsers,
    hasAdminInvite: invite.invited,
    hasAcceptedAdmin: invite.accepted,
    openSupportTickets: openSupport,
    flagsCustomized: flagsCustomizedCount,
    aiCalls30d: usage.aiCalls,
    alerts,
    maintenanceMode: tenant.maintenanceMode,
  };
}

export async function listTenantHealthSummaries(tenants: Tenant[]): Promise<TenantHealth[]> {
  return Promise.all(tenants.map((tenant) => getTenantHealth(tenant)));
}
