import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TenantActivitySignals = {
  lastUserActivityAt: string | null;
  lastAiCallAt: string | null;
  lastAdminActionAt: string | null;
  lastChallengeAt: string | null;
};

async function maxTimestamp(
  table: "activity_logs" | "ai_usage_logs" | "audit_logs" | "challenge_submissions",
  tenantId: string,
  extraFilter?: { column: string; value: string },
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  let query = admin
    .from(table)
    .select("created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (extraFilter) {
    query = query.eq(extraFilter.column, extraFilter.value);
  }

  const { data } = await query;
  return data?.[0]?.created_at ?? null;
}

export async function getTenantActivitySignals(tenantId: string): Promise<TenantActivitySignals> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      lastUserActivityAt: null,
      lastAiCallAt: null,
      lastAdminActionAt: null,
      lastChallengeAt: null,
    };
  }

  const [activity, ai, challenge, adminActions] = await Promise.all([
    maxTimestamp("activity_logs", tenantId),
    maxTimestamp("ai_usage_logs", tenantId),
    maxTimestamp("challenge_submissions", tenantId),
    admin
      .from("audit_logs")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => data?.[0]?.created_at ?? null),
  ]);

  return {
    lastUserActivityAt: activity,
    lastAiCallAt: ai,
    lastAdminActionAt: adminActions,
    lastChallengeAt: challenge,
  };
}

export async function getTenantActivityMap(tenantIds: string[]): Promise<Map<string, TenantActivitySignals>> {
  const results = await Promise.all(tenantIds.map(async (id) => [id, await getTenantActivitySignals(id)] as const));
  return new Map(results);
}
