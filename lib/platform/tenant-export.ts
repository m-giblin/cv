import "server-only";

import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantById, getTenantUsageSummary } from "@/lib/tenant/tenants";
import type { Tenant } from "@/lib/tenant/types";

const EXPORT_MIME = "application/json";

type TenantExportSnapshot = {
  generatedAt: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: Tenant["status"];
    billingStatus: Tenant["billingStatus"];
    billingPlan: Tenant["billingPlan"];
    seatQuota: Tenant["seatQuota"];
    customDomain: Tenant["customDomain"];
    createdAt: string;
  };
  userEmailCount: number;
  usage: {
    activeUsers: number;
    aiCalls30d: number;
    simulationSessions30d: number;
  };
};

function encodeArtifactUrl(snapshot: TenantExportSnapshot): string {
  const json = JSON.stringify(snapshot, null, 2);
  const base64 = Buffer.from(json, "utf8").toString("base64");
  return `data:${EXPORT_MIME};base64,${base64}`;
}

function decodeArtifactUrl(artifactUrl: string): string {
  const prefix = `data:${EXPORT_MIME};base64,`;
  if (!artifactUrl.startsWith(prefix)) {
    throw new Error("Unsupported export artifact format");
  }
  return Buffer.from(artifactUrl.slice(prefix.length), "base64").toString("utf8");
}

async function buildTenantExportSnapshot(tenant: Tenant): Promise<TenantExportSnapshot> {
  const admin = createAdminClient();
  const [usage, userCount] = await Promise.all([
    getTenantUsageSummary(tenant.id),
    admin
      ? admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .then((res) => res.count ?? 0)
      : Promise.resolve(0),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      billingStatus: tenant.billingStatus,
      billingPlan: tenant.billingPlan,
      seatQuota: tenant.seatQuota,
      customDomain: tenant.customDomain,
      createdAt: tenant.createdAt,
    },
    userEmailCount: userCount,
    usage: {
      activeUsers: usage.activeUsers,
      aiCalls30d: usage.aiCalls,
      simulationSessions30d: usage.simulationSessions,
    },
  };
}

/**
 * MVP synchronous export: transitions queued -> running -> ready in one call
 * and stores the generated JSON snapshot inline as a data: URL. A future
 * background worker could take over the queued/running states without
 * changing the public contract.
 */
export async function queueTenantExport(tenantId: string, actorId: string): Promise<Tenant> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const requestedAt = new Date().toISOString();
  await admin
    .from("tenants")
    .update({ export_status: "queued", export_requested_at: requestedAt })
    .eq("id", tenantId);

  await admin.from("tenants").update({ export_status: "running" }).eq("id", tenantId);

  try {
    const snapshot = await buildTenantExportSnapshot(tenant);
    const artifactUrl = encodeArtifactUrl(snapshot);

    const { error } = await admin
      .from("tenants")
      .update({
        export_status: "ready",
        export_completed_at: new Date().toISOString(),
        last_export_artifact_url: artifactUrl,
      })
      .eq("id", tenantId);

    if (error) throw new Error(error.message);

    await logAuditEvent(actorId, {
      action: "tenant.export_completed",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      details: { userEmailCount: snapshot.userEmailCount },
    });

    const updatedTenant = await getTenantById(tenantId);
    if (!updatedTenant) throw new Error("Tenant not found after export");
    return updatedTenant;
  } catch (error) {
    await admin.from("tenants").update({ export_status: "failed" }).eq("id", tenantId);
    await logAuditEvent(actorId, {
      action: "tenant.export_failed",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      details: { error: error instanceof Error ? error.message : "unknown error" },
    });
    throw error;
  }
}

export type TenantExportArtifact = {
  status: Tenant["exportStatus"];
  filename: string;
  contentType: string;
  content: string | null;
};

export async function getTenantExportArtifact(tenantId: string): Promise<TenantExportArtifact> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const filename = `${tenant.slug}-export.json`;

  if (tenant.exportStatus !== "ready" || !tenant.lastExportArtifactUrl) {
    return { status: tenant.exportStatus, filename, contentType: EXPORT_MIME, content: null };
  }

  return {
    status: tenant.exportStatus,
    filename,
    contentType: EXPORT_MIME,
    content: decodeArtifactUrl(tenant.lastExportArtifactUrl),
  };
}
