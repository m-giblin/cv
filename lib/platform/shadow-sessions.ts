import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ShadowSession = {
  id: string;
  actorId: string;
  actorName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  mode: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  active: boolean;
};

export async function listShadowSessions(options?: { limit?: number; hours?: number }): Promise<ShadowSession[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const limit = options?.limit ?? 100;
  const hours = options?.hours ?? 168;
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data: rows } = await admin
    .from("audit_logs")
    .select("id, actor_id, tenant_id, action, details, created_at")
    .in("action", ["tenant.shadow_started", "tenant.shadow_ended"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (!rows?.length) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))] as string[];
  const { data: actors } = await admin.from("profiles").select("id, full_name").in("id", actorIds);
  const actorNames = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  const sessions: ShadowSession[] = [];
  const openByActor = new Map<string, (typeof rows)[number]>();

  for (const row of [...rows].reverse()) {
    const details = (row.details as Record<string, unknown>) ?? {};
    const actorId = row.actor_id ?? "";

    if (row.action === "tenant.shadow_started") {
      openByActor.set(actorId, row);
      continue;
    }

    if (row.action === "tenant.shadow_ended") {
      const start = openByActor.get(actorId);
      const startedAt = start?.created_at ?? row.created_at;
      const endedAt = row.created_at;
      const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();

      sessions.push({
        id: row.id,
        actorId,
        actorName: actorNames.get(actorId) ?? null,
        tenantId: (start?.tenant_id ?? row.tenant_id) as string | null,
        tenantName: (details.tenantName as string) ?? (start?.details as Record<string, unknown>)?.tenantName as string ?? null,
        mode: (details.mode as string) ?? (start?.details as Record<string, unknown>)?.mode as string ?? null,
        startedAt,
        endedAt,
        durationMinutes: Math.round(durationMs / 60000),
        active: false,
      });
      openByActor.delete(actorId);
    }
  }

  for (const [actorId, start] of openByActor) {
    const details = (start.details as Record<string, unknown>) ?? {};
    sessions.push({
      id: start.id,
      actorId,
      actorName: actorNames.get(actorId) ?? null,
      tenantId: start.tenant_id,
      tenantName: (details.tenantName as string) ?? null,
      mode: (details.mode as string) ?? null,
      startedAt: start.created_at,
      endedAt: null,
      durationMinutes: null,
      active: true,
    });
  }

  return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
}
