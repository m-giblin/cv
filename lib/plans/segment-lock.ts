import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isStepLockedForSegment, parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";

export class StepSegmentLockedError extends Error {
  constructor(segmentIndex: number, unlockedSegmentMax: number) {
    super(
      `This step is locked until segment ${segmentIndex - 1} is complete. You are on segment ${unlockedSegmentMax}.`,
    );
    this.name = "StepSegmentLockedError";
  }
}

export async function assertAssignmentStepNotLocked(
  supabase: SupabaseClient<Database>,
  assignmentStepId: string,
) {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("assignment_id, plan_step_id")
    .eq("id", assignmentStepId)
    .maybeSingle();

  if (!step) {
    throw new Error("Plan step not found.");
  }

  const [assignmentResult, planStepResult] = await Promise.all([
    supabase
      .from("plan_assignments")
      .select("unlocked_segment_max")
      .eq("id", step.assignment_id)
      .maybeSingle(),
    supabase
      .from("plan_steps")
      .select("metadata, sort_order")
      .eq("id", step.plan_step_id)
      .maybeSingle(),
  ]);

  const assignment = assignmentResult.data;
  const planStep = planStepResult.data;

  if (!assignment || !planStep) {
    throw new Error("Plan step not found.");
  }

  const { segmentIndex } = parsePlanStepMetadata(planStep.metadata, planStep.sort_order);
  const unlockedSegmentMax = assignment.unlocked_segment_max ?? 1;

  if (isStepLockedForSegment(segmentIndex, unlockedSegmentMax)) {
    throw new StepSegmentLockedError(segmentIndex ?? 0, unlockedSegmentMax);
  }
}
