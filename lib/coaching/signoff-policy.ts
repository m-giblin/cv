export type SignoffTier = "light" | "standard" | "hard";

export type ReviewSignoffContext = {
  reviewType:
    | "coaching_card"
    | "challenge_submission"
    | "plan_step"
    | "certification"
    | "deal_prep"
    | "pitch"
    | "mentor_review";
  isManagerGate?: boolean;
};

export function signoffTierForReview(context: ReviewSignoffContext): SignoffTier {
  if (context.reviewType === "certification" || context.isManagerGate) {
    return "hard";
  }
  if (context.reviewType === "coaching_card" || context.reviewType === "plan_step") {
    return "standard";
  }
  return "light";
}

export const MIN_FIELD_LENGTH: Record<SignoffTier, { strength: number; gap: number; nextAction: number }> = {
  light: { strength: 12, gap: 0, nextAction: 12 },
  standard: { strength: 18, gap: 18, nextAction: 18 },
  hard: { strength: 18, gap: 18, nextAction: 18 },
};

export const CADENCE_GATE_DAYS = 14;
