import type { UserPlan } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import { fetchDealPrepManagerStats } from "@/lib/data/get-deal-prep-manager-stats";
import { profileLevelLabel } from "@/lib/utils/level-label";
import type { Profile } from "@/lib/types";
import {
  buildReadinessMapPayload,
  coachingCardsFromDb,
  type ChallengeSubmissionSignal,
  type DealPrepActivity,
  type FlightCheckSignal,
  type MarketPulseSignal,
  type ReadinessMapPayload,
} from "@/lib/manager/readiness-map-data";
import { uniqueIds, uniqueProfiles } from "@/lib/utils";

/**
 * Shared by both the manager and SE-self readiness routes so the two views
 * never drift apart — same queries, same scoring, same percentile math,
 * just a different `userIds` scope.
 */
export async function fetchReadinessMapPayload(
  supabase: SupabaseClient<Database>,
  tenantId: string | null,
  userIds: string[],
  /** Plans the caller already loaded for these people; skips a second plan fetch. */
  preloadedPlans?: UserPlan[],
): Promise<ReadinessMapPayload> {
  if (!userIds.length) {
    return buildReadinessMapPayload({
      profiles: [],
      plans: [],
      coachingCards: [],
      approvedCertCountByUser: {},
      labSessions30dByUser: {},
      pitchGradeByUser: {},
    });
  }

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    plans,
    profilesResult,
    cardsResult,
    certsResult,
    labResult,
    pitchResult,
    challengeResult,
    flightCheckResult,
    marketPulseResult,
    dealPrepStats,
  ] = await Promise.all([
    preloadedPlans ? Promise.resolve(preloadedPlans) : fetchPlansForUsers(supabase, userIds, tenantId),
    supabase.from("profiles").select("id, email, full_name, role, level, manager_id, avatar_url, created_at").in("id", userIds),
    supabase
      .from("coaching_cards")
      .select("user_id, structured_output, is_practice, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    supabase.from("readiness_certifications").select("user_id, status").in("user_id", userIds).eq("status", "approved"),
    supabase
      .from("isc_lab_interactions")
      .select("user_id, created_at")
      .in("user_id", userIds)
      .gte("created_at", since7d),
    supabase
      .from("pitch_submissions")
      .select("user_id, manager_grade, created_at")
      .in("user_id", userIds)
      .not("manager_grade", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("challenge_submissions")
      .select("user_id, challenge_id, ai_suggested_score, manager_grade, ai_review, submitted_at")
      .in("user_id", userIds)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("adaptive_probe_sessions")
      .select("user_id, field_signal_score, competency_scores, completed_at")
      .in("user_id", userIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    supabase
      .from("market_pulse_results")
      .select("user_id, score, total, submitted_at")
      .in("user_id", userIds)
      .order("submitted_at", { ascending: false }),
    fetchDealPrepManagerStats(userIds),
  ]);

  const profiles = uniqueProfiles((profilesResult.data ?? []).map(mapProfile));

  const approvedCertCountByUser: Record<string, number> = {};
  for (const row of certsResult.data ?? []) {
    approvedCertCountByUser[row.user_id] = (approvedCertCountByUser[row.user_id] ?? 0) + 1;
  }

  const labSessions30dByUser: Record<string, number> = {};
  for (const row of labResult.data ?? []) {
    labSessions30dByUser[row.user_id] = (labSessions30dByUser[row.user_id] ?? 0) + 1;
  }

  const pitchGradeByUser: Record<string, number | null> = {};
  for (const row of pitchResult.data ?? []) {
    if (pitchGradeByUser[row.user_id] == null && row.manager_grade != null) {
      pitchGradeByUser[row.user_id] = row.manager_grade;
    }
  }

  const challengeRows = (challengeResult.data ?? []) as Array<{
    user_id: string;
    challenge_id: string | null;
    ai_suggested_score: number | null;
    manager_grade: number | null;
    ai_review: { source?: string } | null;
  }>;

  const challengeSignalsByUser: Record<string, ChallengeSubmissionSignal[]> = {};
  const challengeIds = uniqueIds(challengeRows.map((r) => r.challenge_id).filter((id): id is string => Boolean(id)));
  for (const row of challengeRows) {
    challengeSignalsByUser[row.user_id] ??= [];
    challengeSignalsByUser[row.user_id].push({
      userId: row.user_id,
      challengeId: row.challenge_id,
      aiSuggestedScore: row.ai_suggested_score,
      managerGrade: row.manager_grade,
      source: row.ai_review?.source === "ai" ? "ai" : row.ai_review ? "template" : null,
    });
  }

  // challenge_competencies join — this data existed in schema but was never
  // queried anywhere in the app before; feeds the cross-feature competency
  // summary the same way coaching-card-linked competencies do.
  const challengeCompetenciesByChallengeId: Record<string, string[]> = {};
  if (challengeIds.length) {
    const { data: joinRows } = await supabase
      .from("challenge_competencies")
      .select("challenge_id, competencies(name)")
      .in("challenge_id", challengeIds);
    for (const row of (joinRows ?? []) as Array<{ challenge_id: string; competencies: { name: string } | null }>) {
      challengeCompetenciesByChallengeId[row.challenge_id] ??= [];
      if (row.competencies?.name) {
        challengeCompetenciesByChallengeId[row.challenge_id].push(row.competencies.name);
      }
    }
  }

  const flightCheckByUser: Record<string, FlightCheckSignal> = {};
  for (const row of (flightCheckResult.data ?? []) as Array<{
    user_id: string;
    field_signal_score: number | null;
    competency_scores: Record<string, number> | null;
  }>) {
    if (flightCheckByUser[row.user_id]) continue;
    flightCheckByUser[row.user_id] = {
      userId: row.user_id,
      fieldSignalScore: row.field_signal_score ?? 0,
      competencyScores: row.competency_scores ?? {},
    };
  }

  const marketPulseSignalsByUser: Record<string, MarketPulseSignal[]> = {};
  for (const row of (marketPulseResult.data ?? []) as Array<{ user_id: string; score: number; total: number }>) {
    marketPulseSignalsByUser[row.user_id] ??= [];
    if (marketPulseSignalsByUser[row.user_id].length < 4) {
      marketPulseSignalsByUser[row.user_id].push({ userId: row.user_id, score: row.score, total: row.total });
    }
  }

  const dealPrepActivityByUser: Record<string, DealPrepActivity> = {};
  for (const stat of dealPrepStats) {
    dealPrepActivityByUser[stat.userId] = {
      briefsThisWeek: stat.prepCountThisWeek,
      sharedWithManager: stat.sharedCount,
    };
  }

  const payload = buildReadinessMapPayload({
    profiles,
    plans,
    coachingCards: coachingCardsFromDb(cardsResult.data ?? []),
    approvedCertCountByUser,
    labSessions30dByUser,
    pitchGradeByUser,
    challengeSignalsByUser,
    flightCheckByUser,
    marketPulseSignalsByUser,
    dealPrepActivityByUser,
    challengeCompetenciesByChallengeId,
  });

  return attachPercentileRanks(supabase, tenantId, profiles, payload);
}

/**
 * Upserts each row's composite into readiness_score_snapshots, then computes
 * a same-tenant, same-level percentile from that snapshot table rather than
 * re-deriving the whole scoring pipeline in SQL. Cohorts under 3 people stay
 * null so a two-person team can't be de-anonymized by their own percentile.
 */
async function attachPercentileRanks(
  supabase: SupabaseClient<Database>,
  tenantId: string | null,
  profiles: Profile[],
  payload: ReadinessMapPayload,
): Promise<ReadinessMapPayload> {
  if (!tenantId || payload.rows.length === 0) return payload;

  const levelByUserId: Record<string, string> = {};
  for (const profile of profiles) levelByUserId[profile.id] = profileLevelLabel(profile);

  const snapshotRows = payload.rows.map((row) => ({
    user_id: row.userId,
    tenant_id: tenantId,
    level: levelByUserId[row.userId] ?? "Basic",
    composite: row.composite,
    computed_at: new Date().toISOString(),
  }));

  // Write this team's snapshots and read the cohort at the same time; the fresh rows replace any
  // stale copies of the same people in the cohort read, so the result matches write-then-read.
  const [, { data: storedSnapshots }] = await Promise.all([
    supabase.from("readiness_score_snapshots").upsert(snapshotRows, { onConflict: "user_id" }),
    supabase.from("readiness_score_snapshots").select("user_id, level, composite").eq("tenant_id", tenantId),
  ]);
  const freshIds = new Set(snapshotRows.map((row) => row.user_id));
  const cohortSnapshots = [
    ...((storedSnapshots ?? []) as Array<{ user_id: string; level: string; composite: number }>).filter(
      (row) => !freshIds.has(row.user_id),
    ),
    ...snapshotRows,
  ];

  const byLevel: Record<string, number[]> = {};
  for (const row of cohortSnapshots as Array<{ level: string; composite: number }>) {
    byLevel[row.level] ??= [];
    byLevel[row.level].push(row.composite);
  }

  const rows = payload.rows.map((row) => {
    const level = levelByUserId[row.userId] ?? "Basic";
    const cohort = byLevel[level] ?? [];
    const percentileRank =
      cohort.length >= 3 ? Math.round((cohort.filter((c) => c <= row.composite).length / cohort.length) * 100) : null;
    return { ...row, percentileRank };
  });

  return { ...payload, rows };
}
