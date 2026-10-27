import type { PlanStep } from "@/lib/types";

/**
 * Who the new hire should expect to review a step. With a mentor assigned, the mentor approves
 * everyday steps and check-ins; the hiring manager signs off every stage gate, test-outs included.
 * Without a mentor, everything goes to the manager. Mirrors canMentorApproveStep.
 */
export function stepReviewer<P>(step: Pick<PlanStep, "type" | "isSegmentGate"> | null | undefined, mentor: P | undefined, manager: P | undefined): P | undefined {
  if (!step) return manager;
  if (!mentor) return manager;
  if (step.isSegmentGate) return manager;
  return mentor;
}
