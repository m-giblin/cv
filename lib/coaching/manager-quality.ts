import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type ManagerCoachingQuality = {
  managerId: string;
  managerName: string;
  totalSignoffs: number;
  approveCount: number;
  rejectCount: number;
  avgReviewDurationMs: number | null;
  fastApprovalRate: number;
  aiEditRate: number;
  avgConfidence: number | null;
  cadenceRiskCount: number;
  qualityScore: number;
  flags: string[];
};

const FAST_MS = 15_000;

export async function buildManagerCoachingQuality(
  supabase: SupabaseClient<Database>,
  managerIds: string[],
  orgIds: string[],
): Promise<ManagerCoachingQuality[]> {
  if (managerIds.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: signoffs } = await supabase
    .from("manager_coaching_signoffs")
    .select(
      "manager_id, se_user_id, decision, review_duration_ms, ai_draft_edited, confidence, created_at",
    )
    .in("manager_id", managerIds)
    .gte("created_at", since.toISOString());

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", managerIds);

  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const cadenceSince = new Date();
  cadenceSince.setDate(cadenceSince.getDate() - 14);

  const orgSet = new Set(orgIds);
  const coachedRecently = new Set<string>();
  for (const row of signoffs ?? []) {
    if (row.decision === "approve" && new Date(row.created_at) >= cadenceSince) {
      coachedRecently.add(`${row.manager_id}:${row.se_user_id}`);
    }
  }

  return managerIds.filter((id, index, list) => list.indexOf(id) === index).map((managerId) => {
    const rows = (signoffs ?? []).filter((row) => row.manager_id === managerId);
    const approveRows = rows.filter((row) => row.decision === "approve");
    const durations = approveRows
      .map((row) => row.review_duration_ms)
      .filter((value): value is number => typeof value === "number" && value > 0);
    const fastCount = durations.filter((ms) => ms < FAST_MS).length;
    const aiEdited = approveRows.filter((row) => row.ai_draft_edited).length;
    const withAi = approveRows.filter((row) => row.ai_draft_edited !== null).length;
    const confidences = approveRows
      .map((row) => row.confidence)
      .filter((value): value is number => typeof value === "number");

    const coachedSes = new Set(
      approveRows.map((row) => row.se_user_id).filter((id) => orgSet.has(id)),
    );
    let cadenceRiskCount = 0;
    for (const seId of orgSet) {
      if (!coachedRecently.has(`${managerId}:${seId}`)) {
        cadenceRiskCount += 1;
      }
    }

    const fastApprovalRate = durations.length ? fastCount / durations.length : 0;
    const aiEditRate = withAi ? aiEdited / withAi : 1;
    const rejectRate = rows.length ? rows.filter((row) => row.decision === "reject").length / rows.length : 0;

    const flags: string[] = [];
    if (fastApprovalRate > 0.5 && rows.length >= 5) {
      flags.push("High share of very fast sign-offs");
    }
    if (aiEditRate < 0.3 && withAi >= 5) {
      flags.push("Often accepts AI suggestions without edits");
    }
    if (rejectRate < 0.03 && rows.length >= 20) {
      flags.push("Rarely sends work back for revision");
    }
    if (cadenceRiskCount > Math.max(2, coachedSes.size)) {
      flags.push("Several SEs without a coaching touchpoint in 14 days");
    }

    const qualityScore = Math.round(
      Math.min(
        100,
        Math.max(
          0,
          55 +
            aiEditRate * 25 +
            (1 - fastApprovalRate) * 15 +
            rejectRate * 80 +
            (cadenceRiskCount === 0 ? 10 : Math.max(-15, 10 - cadenceRiskCount * 2)),
        ),
      ),
    );

    return {
      managerId,
      managerName: nameById.get(managerId) ?? "Manager",
      totalSignoffs: rows.length,
      approveCount: approveRows.length,
      rejectCount: rows.length - approveRows.length,
      avgReviewDurationMs: durations.length
        ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length)
        : null,
      fastApprovalRate,
      aiEditRate,
      avgConfidence: confidences.length
        ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 10) / 10
        : null,
      cadenceRiskCount,
      qualityScore,
      flags,
    };
  });
}
