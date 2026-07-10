import type { PlanStepType } from "@/lib/types";

/** Mentor coaching check-ins — mentor may endorse; manager still signs off for progress. */
export function isMentorCoachingStep(stepType: PlanStepType, isSegmentGate?: boolean): boolean {
  return stepType === "mentor_review" && !isSegmentGate;
}

/** Segment gates and capability checkpoints require the hiring manager (or admin). */
export function requiresManagerSignoff(stepType: PlanStepType, isSegmentGate?: boolean): boolean {
  if (isSegmentGate) return true;
  if (stepType === "mentor_review") return true;
  return true;
}

export function isDirectManager(reviewerId: string, assigneeManagerId: string | null): boolean {
  return Boolean(assigneeManagerId && assigneeManagerId === reviewerId);
}

export function canMentorEndorseStep(params: {
  reviewerId: string;
  mentorId: string | null;
  stepType: PlanStepType;
  isSegmentGate?: boolean;
}): boolean {
  if (!params.mentorId || params.mentorId !== params.reviewerId) return false;
  return isMentorCoachingStep(params.stepType, params.isSegmentGate);
}

export function canManagerSignOffStep(params: {
  reviewerId: string;
  assigneeManagerId: string | null;
  assignedById: string | null;
  reviewerRole: string;
}): boolean {
  if (params.reviewerRole === "director" || params.reviewerRole === "admin") return true;
  if (isDirectManager(params.reviewerId, params.assigneeManagerId)) return true;
  if (params.assignedById && params.assignedById === params.reviewerId) return true;
  if (params.reviewerRole === "manager") {
    return isDirectManager(params.reviewerId, params.assigneeManagerId) || params.assignedById === params.reviewerId;
  }
  return false;
}
