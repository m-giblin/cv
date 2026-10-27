import type { PlanStep } from "@/lib/types";

/**
 * Who the new hire should expect to review a step. With a mentor assigned, the mentor gets the
 * submission and reviews everyday steps and test-outs; the manager signs off the other stage gates.
 * Without a mentor, everything goes to the manager.
 */
export function stepReviewer<P>(step: Pick<PlanStep, "type" | "isSegmentGate"> | null | undefined, mentor: P | undefined, manager: P | undefined): P | undefined {
  if (!step) return manager;
  if (!mentor) return manager;
  if (step.isSegmentGate && step.type !== "mentor_review") return manager;
  return mentor;
}
