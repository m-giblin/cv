type PlanStepForMatch = { step_type: string; challenge_id?: string | null } | null | undefined;

/**
 * Whether a review decision applies to this plan step. When the review is for a
 * specific challenge, only the step linked to that challenge counts, so one
 * decision can never approve or reject another challenge's step.
 */
export function planStepMatchesReview(
  planStep: PlanStepForMatch,
  target: { stepType: string; challengeId?: string },
): boolean {
  if (planStep?.step_type !== target.stepType) return false;
  return target.challengeId === undefined || planStep.challenge_id === target.challengeId;
}
