import "server-only";

import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuditEvent } from "@/lib/audit/log-admin-action";
import { loadPlatformSettings, savePlatformSettings } from "@/lib/platform/settings";
import { billingPlanForPreset, matchFeatureFlagPreset } from "@/lib/platform/flag-presets";
import { defaultFeatureFlags, type PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import {
  DEFAULT_TENANT_ID,
  type PlatformAuditEntry,
  type Tenant,
  type TenantAdminInvite,
  type TenantBillingStatus,
  type TenantBranding,
  type TenantCustomDomainStatus,
  type TenantExportStatus,
  type TenantStatus,
} from "@/lib/tenant/types";
import { normalizeTenantPrimaryColor } from "@/lib/tenant/shell-branding-shared";

export const INVITE_TTL_DAYS = 14;

type DbTenant = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  branding_primary_color: string;
  branding_logo_url: string | null;
  allowed_email_domains: string[] | unknown;
  welcome_message: string | null;
  created_at: string;
  updated_at: string;
  operator_notes?: string | null;
  maintenance_mode?: boolean;
  maintenance_message?: string | null;
  billing_status?: TenantBillingStatus | null;
  billing_plan?: string | null;
  seat_quota?: number | null;
  custom_domain?: string | null;
  custom_domain_status?: TenantCustomDomainStatus | null;
  export_requested_at?: string | null;
  export_completed_at?: string | null;
  export_status?: TenantExportStatus | null;
  last_export_artifact_url?: string | null;
};

function mapBranding(row: DbTenant): TenantBranding {
  const domains = row.allowed_email_domains;
  return {
    primaryColor: row.branding_primary_color,
    logoUrl: row.branding_logo_url,
    welcomeMessage: row.welcome_message,
    allowedEmailDomains: Array.isArray(domains) ? (domains as string[]) : [],
  };
}

function mapTenant(row: DbTenant): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    branding: mapBranding(row),
    operatorNotes: row.operator_notes ?? null,
    maintenanceMode: row.maintenance_mode ?? false,
    maintenanceMessage: row.maintenance_message ?? null,
    billingStatus: row.billing_status ?? "trial",
    billingPlan: row.billing_plan ?? null,
    seatQuota: row.seat_quota ?? null,
    customDomain: row.custom_domain ?? null,
    customDomainStatus: row.custom_domain_status ?? "none",
    exportRequestedAt: row.export_requested_at ?? null,
    exportCompletedAt: row.export_completed_at ?? null,
    exportStatus: row.export_status ?? "idle",
    lastExportArtifactUrl: row.last_export_artifact_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTenants(): Promise<Tenant[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin.from("tenants").select("*").order("name");
  if (error || !data) return [];
  return (data as DbTenant[]).map(mapTenant);
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  return data ? mapTenant(data as DbTenant) : null;
}

export type CreateTenantInput = {
  slug: string;
  name: string;
  branding?: Partial<TenantBranding>;
  adminEmail?: string;
  adminFullName?: string;
  sendAdminInvite?: boolean;
};

export async function createTenant(
  input: CreateTenantInput,
  actorId?: string,
): Promise<{ tenant: Tenant; inviteSent: boolean }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const branding = input.branding ?? {};

  const { data, error } = await admin
    .from("tenants")
    .insert({
      slug,
      name: input.name.trim(),
      status: "provisioning",
      branding_primary_color: normalizeTenantPrimaryColor(branding.primaryColor ?? "#0071ce"),
      branding_logo_url: branding.logoUrl ?? null,
      welcome_message: branding.welcomeMessage ?? null,
      allowed_email_domains: branding.allowedEmailDomains ?? [],
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create tenant");

  const tenant = mapTenant(data as DbTenant);

  await admin.from("platform_settings").insert({
    id: crypto.randomUUID(),
    tenant_id: tenant.id,
    provider: "xai",
    model: "grok-3-mini",
    feature_flags: defaultFeatureFlags(),
  });

  await admin
    .from("tenants")
    .update({ billing_plan: billingPlanForPreset("full") })
    .eq("id", tenant.id);

  let inviteSent = false;

  try {
    if (input.adminEmail && input.adminFullName) {
      inviteSent = await provisionTenantAdmin({
        tenantId: tenant.id,
        email: input.adminEmail,
        fullName: input.adminFullName,
        invitedBy: actorId ?? null,
        sendInvite: input.sendAdminInvite ?? true,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to provision tenant admin.";
    throw new Error(
      `${message} The tenant was created — use Platform shadow mode if the admin email is already a platform operator.`,
    );
  } finally {
    await admin.from("tenants").update({ status: "active" }).eq("id", tenant.id);
  }

  if (actorId) {
    await requireAuditEvent(actorId, {
      action: "tenant.created",
      targetType: "tenant",
      targetId: tenant.id,
      tenantId: tenant.id,
      details: { slug: tenant.slug, name: tenant.name, inviteSent },
    });
  }

  return { tenant: { ...tenant, status: "active" }, inviteSent };
}

export async function updateTenantBranding(
  tenantId: string,
  branding: Partial<TenantBranding>,
  actorId: string,
): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const payload: Database["public"]["Tables"]["tenants"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (branding.primaryColor !== undefined) {
    payload.branding_primary_color = normalizeTenantPrimaryColor(branding.primaryColor);
  }
  if (branding.logoUrl !== undefined) payload.branding_logo_url = branding.logoUrl;
  if (branding.welcomeMessage !== undefined) payload.welcome_message = branding.welcomeMessage;
  if (branding.allowedEmailDomains !== undefined) {
    payload.allowed_email_domains = branding.allowedEmailDomains;
  }

  const { data, error } = await admin
    .from("tenants")
    .update(payload)
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update tenant branding");

  await requireAuditEvent(actorId, {
    action: "tenant.updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: { fields: Object.keys(branding) },
  });

  return mapTenant(data as DbTenant);
}

export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus,
  actorId: string,
): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data, error } = await admin
    .from("tenants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update tenant status");

  await requireAuditEvent(actorId, {
    action: "tenant.status_updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: { status },
  });

  return mapTenant(data as DbTenant);
}

export async function updateOperatorNotes(
  tenantId: string,
  operatorNotes: string | null,
  actorId: string,
): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data, error } = await admin
    .from("tenants")
    .update({ operator_notes: operatorNotes, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update operator notes");

  await requireAuditEvent(actorId, {
    action: "tenant.updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: { operatorNotes: true },
  });

  return mapTenant(data as DbTenant);
}

export async function updateTenantMaintenance(
  tenantId: string,
  input: { maintenanceMode: boolean; maintenanceMessage?: string | null },
  actorId: string,
): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data, error } = await admin
    .from("tenants")
    .update({
      maintenance_mode: input.maintenanceMode,
      maintenance_message: input.maintenanceMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update maintenance mode");

  await requireAuditEvent(actorId, {
    action: "tenant.maintenance_updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: {
      maintenanceMode: input.maintenanceMode,
      maintenanceMessage: input.maintenanceMessage ?? null,
    },
  });

  return mapTenant(data as DbTenant);
}

export type TenantCommercialInput = {
  billingStatus?: TenantBillingStatus;
  billingPlan?: string | null;
  seatQuota?: number | null;
  customDomain?: string | null;
  customDomainStatus?: TenantCustomDomainStatus;
};

export async function updateTenantCommercial(
  tenantId: string,
  input: TenantCommercialInput,
  actorId: string,
): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const payload: Database["public"]["Tables"]["tenants"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.billingStatus !== undefined) payload.billing_status = input.billingStatus;
  if (input.billingPlan !== undefined) payload.billing_plan = input.billingPlan;
  if (input.seatQuota !== undefined) payload.seat_quota = input.seatQuota;
  if (input.customDomain !== undefined) {
    payload.custom_domain = input.customDomain ? input.customDomain.trim().toLowerCase() : null;
  }
  if (input.customDomainStatus !== undefined) payload.custom_domain_status = input.customDomainStatus;

  const { data, error } = await admin
    .from("tenants")
    .update(payload)
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update tenant commercial settings");

  await requireAuditEvent(actorId, {
    action: "tenant.commercial_updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: { fields: Object.keys(input) },
  });

  return mapTenant(data as DbTenant);
}

export async function softDeleteTenant(tenantId: string, actorId: string): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data, error } = await admin
    .from("tenants")
    .update({
      status: "suspended",
      maintenance_mode: true,
      maintenance_message: "This tenant has been deactivated by a platform operator.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to deactivate tenant");

  await requireAuditEvent(actorId, {
    action: "tenant.soft_deleted",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: {},
  });

  return mapTenant(data as DbTenant);
}

export async function provisionTenantAdmin(input: {
  tenantId: string;
  email: string;
  fullName: string;
  invitedBy: string | null;
  sendInvite?: boolean;
}): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const email = input.email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.role === "super_admin") {
      throw new Error(
        `${email} is a platform operator. Skip the tenant admin invite and use shadow mode instead.`,
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        role: "admin",
        level: "Senior",
        tenant_id: input.tenantId,
        manager_id: null,
      })
      .eq("id", existingProfile.id);

    if (profileError) throw new Error(profileError.message);

    await admin.from("tenant_admin_invites").upsert(
      {
        tenant_id: input.tenantId,
        email,
        full_name: input.fullName,
        invited_by: input.invitedBy,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,email" },
    );

    if (input.invitedBy) {
      await requireAuditEvent(input.invitedBy, {
        action: "tenant.admin_invited",
        targetType: "profile",
        targetId: existingProfile.id,
        tenantId: input.tenantId,
        details: { email, linkedExistingUser: true },
      });
    }

    return false;
  }

  const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!";

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (authError) throw new Error(authError.message);

  const userId = authData.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: "admin",
      level: "Senior",
      tenant_id: input.tenantId,
      manager_id: null,
    })
    .eq("id", userId);

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await admin.from("tenant_admin_invites").upsert(
    {
      tenant_id: input.tenantId,
      email,
      full_name: input.fullName,
      invited_by: input.invitedBy,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "tenant_id,email" },
  );

  let inviteSent = false;

  if (input.sendInvite !== false) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error: inviteError } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });
    inviteSent = !inviteError;

    if (inviteSent) {
      await admin
        .from("tenant_admin_invites")
        .update({ last_sent_at: now.toISOString() })
        .eq("tenant_id", input.tenantId)
        .eq("email", email);
    }
  }

  if (input.invitedBy) {
    await requireAuditEvent(input.invitedBy, {
      action: "tenant.admin_invited",
      targetType: "profile",
      targetId: userId,
      tenantId: input.tenantId,
      details: { email, inviteSent },
    });
  }

  return inviteSent;
}

export async function listTenantInvites(tenantId: string): Promise<TenantAdminInvite[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("tenant_admin_invites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    status: row.status as TenantAdminInvite["status"],
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    lastSentAt: row.last_sent_at ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedBy: row.revoked_by ?? null,
  }));
}

export async function getTenantSettings(tenantId: string) {
  return loadPlatformSettings(tenantId);
}

export async function updateTenantFeatureFlags(
  tenantId: string,
  userId: string,
  featureFlags: PlatformFeatureFlags,
) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const settings = await savePlatformSettings(admin, userId, { tenantId, featureFlags });

  const packageId = matchFeatureFlagPreset(featureFlags);
  await requireAuditEvent(userId, {
    action: "tenant.feature_flags.updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: {
      packageId,
      billingPlan: packageId === "custom" ? null : billingPlanForPreset(packageId),
      flagCount: Object.keys(featureFlags).length,
      flags: featureFlags,
    },
  });

  return settings;
}

export async function getTenantUsageSummary(tenantId: string) {
  const admin = createAdminClient();
  if (!admin) {
    return { activeUsers: 0, aiCalls: 0, simulationSessions: 0 };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [profiles, aiUsage, sims] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    admin
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    admin
      .from("simulation_assignments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  return {
    activeUsers: profiles.count ?? 0,
    aiCalls: aiUsage.count ?? 0,
    simulationSessions: sims.count ?? 0,
  };
}

export async function listPlatformAuditLogs(options?: {
  tenantId?: string;
  limit?: number;
  /** e.g. "tenant." or "operator." — matches action prefix */
  actionPrefix?: string;
  platformOpsOnly?: boolean;
}): Promise<PlatformAuditEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const limit = options?.limit ?? 200;
  let query = admin
    .from("audit_logs")
    .select("id, tenant_id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.tenantId) {
    query = query.eq("tenant_id", options.tenantId);
  }
  if (options?.actionPrefix) {
    query = query.like("action", `${options.actionPrefix}%`);
  }
  if (options?.platformOpsOnly) {
    query = query.or(
      "action.like.tenant.%,action.like.operator.%,action.like.workspace.%,action.like.support.%,action.like.audit.%",
    );
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))] as string[];
  const tenantIds = [...new Set(rows.map((row) => row.tenant_id).filter(Boolean))] as string[];
  const actorNames = new Map<string, string>();
  const tenantNames = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: actors } = await admin.from("profiles").select("id, full_name").in("id", actorIds);
    for (const actor of actors ?? []) {
      actorNames.set(actor.id, actor.full_name);
    }
  }
  if (tenantIds.length > 0) {
    const { data: tenants } = await admin.from("tenants").select("id, name, slug").in("id", tenantIds);
    for (const tenant of tenants ?? []) {
      tenantNames.set(tenant.id, tenant.name || tenant.slug);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id ?? null,
    tenantName: row.tenant_id ? (tenantNames.get(row.tenant_id) ?? null) : null,
    actorId: row.actor_id,
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? null) : null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: (row.details ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export { DEFAULT_TENANT_ID };
