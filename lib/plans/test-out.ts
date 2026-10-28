import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";

/** Kept on each step a gate sign-off closes, so the new hire and mentor can see why it's done. */
export const TESTED_OUT_NOTE = "Tested out: the manager signed off this stage's gates.";

type StepRow = { id: string; plan_step_id: string; status: string; notes: string | null };

/**
 * Passing a stage's gates proves the stage, so an experienced hire who tests out early isn't left
 * with the stage's other steps open forever. Once every gate is reviewed (counting the one being
 * approved now), the steps still open are the ones to close. Pure, so it is unit tested.
 */
export function stepsToTestOut(gateIds: string[], steps: StepRow[], approvedPlanStepId: string): StepRow[] {
  if (!gateIds.length) return [];
  const reviewed = new Set(steps.filter((step) => step.status === "reviewed").map((step) => step.plan_step_id));
  if (!gateIds.every((id) => reviewed.has(id) || id === approvedPlanStepId)) return [];
  return steps.filter((step) => step.status !== "reviewed" && !gateIds.includes(step.plan_step_id));
}

/** Closes a stage's open steps once all its gates are signed off. Returns how many it closed. */
export async function closeStageAfterGates(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
  approvedPlanStepId: string,
): Promise<number> {
  const { data: assignment } = await supabase.from("plan_assignments").select("plan_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return 0;
  const [{ data: planSteps }, { data: steps }] = await Promise.all([
    supabase.from("plan_steps").select("id, metadata, sort_order").eq("plan_id", assignment.plan_id),
    supabase.from("plan_assignment_steps").select("id, plan_step_id, status, notes").eq("assignment_id", assignmentId),
  ]);
  const gateIds = (planSteps ?? [])
    .filter((step) => parsePlanStepMetadata(step.metadata, step.sort_order).isSegmentGate)
    .map((step) => step.id);
  const toClose = stepsToTestOut(gateIds, (steps ?? []) as StepRow[], approvedPlanStepId);
  const now = new Date().toISOString();
  for (const step of toClose) {
    // Anything the new hire wrote stays; the note only fills an empty step.
    await supabase
      .from("plan_assignment_steps")
      .update({ status: "reviewed", completed_at: now, notes: step.notes?.trim() ? step.notes : TESTED_OUT_NOTE })
      .eq("id", step.id);
  }
  return toClose.length;
}
