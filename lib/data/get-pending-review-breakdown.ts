import { getAccessTier } from "@/lib/auth/rbac";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { CoachingCard, ChallengeSubmission, Profile, UserPlan } from "@/lib/types";

export type PendingReviewBreakdown = {
  challengeSubmissions: number;
  simulationCards: number;
  planStepReviews: number;
  certSignoffs: number;
};

export function pendingReviewTotal(breakdown: PendingReviewBreakdown): number {
  return (
    breakdown.challengeSubmissions +
    breakdown.simulationCards +
    breakdown.planStepReviews +
    breakdown.certSignoffs
  );
}

export function pendingPlanStepsFromPlans(plans: UserPlan[]): number {
  return plans.reduce(
    (count, plan) =>
      count +
      plan.steps.filter(
        (step) =>
          (step.status === "submitted" || step.status === "under_review") && step.assignmentStepId,
      ).length,
    0,
  );
}

export function pendingReviewBreakdownFromRecords({
  submissions,
  coachingCards,
  plans,
  certStatuses = [],
}: {
  submissions: ChallengeSubmission[];
  coachingCards: CoachingCard[];
  plans: UserPlan[];
  certStatuses?: string[];
}): PendingReviewBreakdown {
  return {
    challengeSubmissions: submissions.filter((item) => item.status === "submitted").length,
    simulationCards: coachingCards.filter(
      (card) => card.managerReviewStatus === "pending" && !card.isPractice,
    ).length,
    planStepReviews: pendingPlanStepsFromPlans(plans),
    certSignoffs: certStatuses.filter((status) => status === "submitted").length,
  };
}

export async function fetchPendingReviewBreakdown(
  tenantId: string,
  seUserIds: string[],
): Promise<PendingReviewBreakdown> {
  const admin = getTenantAdminClient();

  if (!admin || seUserIds.length === 0) {
    return {
      challengeSubmissions: 0,
      simulationCards: 0,
      planStepReviews: 0,
      certSignoffs: 0,
    };
  }

  const tenantScope = `tenant_id.eq.${tenantId},tenant_id.is.null`;
  const { data: assignments } = await admin
    .from("plan_assignments")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("user_id", seUserIds);

  const assignmentIds = (assignments ?? []).map((row) => row.id);

  const [submissionsResult, coachingResult, certsResult, planStepsResult] = await Promise.all([
    admin
      .from("challenge_submissions")
      .select("id, status", { count: "exact", head: true })
      .in("user_id", seUserIds)
      .eq("status", "submitted")
      .or(tenantScope),
    admin
      .from("coaching_cards")
      .select("id", { count: "exact", head: true })
      .in("user_id", seUserIds)
      .eq("manager_review_status", "pending")
      .eq("is_practice", false)
      .or(tenantScope),
    admin
      .from("readiness_certifications")
      .select("id, status")
      .in("user_id", seUserIds)
      .eq("status", "submitted"),
    assignmentIds.length > 0
      ? admin
          .from("plan_assignment_steps")
          .select("id", { count: "exact", head: true })
          .in("assignment_id", assignmentIds)
          .eq("status", "submitted")
      : Promise.resolve({ count: 0, data: null, error: null }),
  ]);

  return {
    challengeSubmissions: submissionsResult.count ?? 0,
    simulationCards: coachingResult.count ?? 0,
    planStepReviews: planStepsResult.count ?? 0,
    certSignoffs: (certsResult.data ?? []).length,
  };
}

export function seUserIdsFromProfiles(profiles: Profile[]): string[] {
  return profiles.filter((profile) => getAccessTier(profile.role) === "se").map((profile) => profile.id);
}
