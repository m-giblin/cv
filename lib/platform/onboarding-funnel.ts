import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OnboardingFunnelEntry, OnboardingStage } from "@/lib/platform/mission-control-types";
import type { Tenant } from "@/lib/tenant/types";
import { getTenantUsageSummary } from "@/lib/tenant/tenants";

export type { OnboardingFunnelEntry, OnboardingStage } from "@/lib/platform/mission-control-types";

const STAGE_ORDER: OnboardingStage[] = [
  "created",
  "admin_invited",
  "admin_accepted",
  "has_users",
  "first_activity",
];

async function hasTenantActivity(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const tables = ["activity_logs", "ai_usage_logs", "challenge_submissions", "simulation_assignments"] as const;
  for (const table of tables) {
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .limit(1);
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

export async function getOnboardingFunnelEntry(tenant: Tenant): Promise<OnboardingFunnelEntry> {
  const admin = createAdminClient();
  let adminInviteStatus: OnboardingFunnelEntry["adminInviteStatus"] = "none";

  if (admin) {
    const { data } = await admin
      .from("tenant_admin_invites")
      .select("status")
      .eq("tenant_id", tenant.id);
    const rows = data ?? [];
    if (rows.some((row) => row.status === "accepted")) {
      adminInviteStatus = "accepted";
    } else if (rows.length > 0) {
      adminInviteStatus = "pending";
    }
  }

  const usage = await getTenantUsageSummary(tenant.id);
  const hasActivity = await hasTenantActivity(tenant.id);

  let stage: OnboardingStage = "created";
  if (adminInviteStatus !== "none") stage = "admin_invited";
  if (adminInviteStatus === "accepted") stage = "admin_accepted";
  if (usage.activeUsers > 0) stage = "has_users";
  if (hasActivity) stage = "first_activity";

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    stage,
    stageIndex: STAGE_ORDER.indexOf(stage),
    createdAt: tenant.createdAt,
    adminInviteStatus,
    userCount: usage.activeUsers,
    hasActivity,
  };
}

export async function listOnboardingFunnel(tenants: Tenant[]): Promise<OnboardingFunnelEntry[]> {
  return Promise.all(tenants.map((tenant) => getOnboardingFunnelEntry(tenant)));
}
