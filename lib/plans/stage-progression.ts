import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";

export type StageLink = {
  segmentIndex: number;
  planId: string;
};

/** The stage immediately after this plan, when the plan is one stage of a program. */
export function stageAfter(stages: StageLink[], planId: string): StageLink | null {
  const current = stages.find((stage) => stage.planId === planId);
  if (!current) return null;
  return stages.find((stage) => stage.segmentIndex === current.segmentIndex + 1) ?? null;
}

/** The stage immediately before this plan. */
export function stageBefore(stages: StageLink[], planId: string): StageLink | null {
  const current = stages.find((stage) => stage.planId === planId);
  if (!current) return null;
  return stages.find((stage) => stage.segmentIndex === current.segmentIndex - 1) ?? null;
}

/**
 * Later stages stay closed until a manager has approved the previous stage's gate.
 * The first stage, and plans that are not part of a program, can be assigned directly.
 */
export async function assertPriorStageApproved(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<void> {
  const { data: memberships, error: membershipError } = await supabase
    .from("enablement_program_segments")
    .select("program_id, segment_index, plan_id")
    .eq("plan_id", planId);
  if (membershipError) throw new Error(membershipError.message);
  const membership = memberships?.[0];
  if (!membership || membership.segment_index <= 1) return;

  const { data: segmentRows, error: segmentError } = await supabase
    .from("enablement_program_segments")
    .select("segment_index, plan_id")
    .eq("program_id", membership.program_id);
  if (segmentError) throw new Error(segmentError.message);

  const stages = (segmentRows ?? []).map((row) => ({ segmentIndex: row.segment_index, planId: row.plan_id }));
  const previous = stageBefore(stages, planId);
  if (!previous) return;

  const { data: previousPlan, error: planError } = await supabase
    .from("onboarding_plans")
    .select("name")
    .eq("id", previous.planId)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  const previousName = previousPlan?.name ?? "the previous stage";

  const { data: stepRows, error: stepError } = await supabase
    .from("plan_steps")
    .select("id, metadata, sort_order")
    .eq("plan_id", previous.planId);
  if (stepError) throw new Error(stepError.message);
  const gateIds = (stepRows ?? [])
    .filter((step) => parsePlanStepMetadata(step.metadata, step.sort_order).isSegmentGate)
    .map((step) => step.id);
  if (gateIds.length === 0) {
    throw new Error(`${previousName} has no approval gate, so the next program cannot be assigned.`);
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", previous.planId);
  if (assignmentError) throw new Error(assignmentError.message);
  const assignmentIds = (assignments ?? []).map((row) => row.id);
  if (assignmentIds.length === 0) {
    throw new Error(`A manager has to approve ${previousName} before this program can be assigned.`);
  }

  const { data: progress, error: progressError } = await supabase
    .from("plan_assignment_steps")
    .select("status, plan_step_id")
    .in("assignment_id", assignmentIds)
    .in("plan_step_id", gateIds);
  if (progressError) throw new Error(progressError.message);
  // A stage can have several gates (test-outs plus the final sign-off); every one must be approved.
  const reviewedGates = new Set((progress ?? []).filter((row) => row.status === "reviewed").map((row) => row.plan_step_id));
  const approved = gateIds.every((id) => reviewedGates.has(id));
  if (!approved) {
    throw new Error(`A manager has to approve ${previousName} before this program can be assigned.`);
  }
}
