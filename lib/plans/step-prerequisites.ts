import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isStepLockedForSegment, parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";

export async function isAssignmentStepBlockedByPrerequisites(
  supabase: SupabaseClient<Database>,
  assignmentStepId: string,
): Promise<boolean> {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("plan_step_id, assignment_id, status")
    .eq("id", assignmentStepId)
    .maybeSingle();

  if (!step) return false;

  const { data: prereqs } = await supabase
    .from("plan_step_prerequisites")
    .select("prerequisite_plan_step_id")
    .eq("plan_step_id", step.plan_step_id);

  if (!prereqs?.length) return false;

  const prereqIds = prereqs.map((p) => p.prerequisite_plan_step_id);
  const { data: assignmentSteps } = await supabase
    .from("plan_assignment_steps")
    .select("plan_step_id, status")
    .eq("assignment_id", step.assignment_id)
    .in("plan_step_id", prereqIds);

  return !(assignmentSteps ?? []).every((row) => row.status === "reviewed");
}

export async function assertStepAccessible(
  supabase: SupabaseClient<Database>,
  assignmentStepId: string,
) {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("assignment_id, plan_step_id")
    .eq("id", assignmentStepId)
    .maybeSingle();

  if (!step) throw new Error("Plan step not found.");

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
  if (!assignment || !planStep) throw new Error("Plan step not found.");

  const { segmentIndex } = parsePlanStepMetadata(planStep.metadata, planStep.sort_order);
  if (isStepLockedForSegment(segmentIndex, assignment.unlocked_segment_max ?? 1)) {
    throw new Error("This step is locked until the prior segment gate is approved.");
  }

  const blocked = await isAssignmentStepBlockedByPrerequisites(supabase, assignmentStepId);
  if (blocked) {
    throw new Error("Complete prerequisite steps before submitting this step.");
  }
}
