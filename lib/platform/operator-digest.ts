import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformAuditEntry } from "@/lib/tenant/types";

export type OperatorDigestEntry = PlatformAuditEntry & {
  hoursAgo: number;
};

export async function getOperatorDigest(hours = 24, limit = 50): Promise<OperatorDigestEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data: superAdmins } = await admin.from("profiles").select("id").eq("role", "super_admin");
  const superAdminIds = (superAdmins ?? []).map((row) => row.id);
  if (superAdminIds.length === 0) return [];

  const { data: rows } = await admin
    .from("audit_logs")
    .select("id, tenant_id, actor_id, action, target_type, target_id, details, created_at")
    .in("actor_id", superAdminIds)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))] as string[];
  const { data: actors } = await admin.from("profiles").select("id, full_name").in("id", actorIds);
  const actorNames = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    actorId: row.actor_id,
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? null) : null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: (row.details as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    hoursAgo: Math.round((now - new Date(row.created_at).getTime()) / 3600000),
  }));
}

export async function listSuperAdminOperators(): Promise<Array<{ id: string; fullName: string; email: string }>> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "super_admin")
    .order("full_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
  }));
}
