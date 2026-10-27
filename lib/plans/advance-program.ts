import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { createNotification } from "@/lib/notifications/create-notification";
import { assignPlanToUser } from "@/lib/plans/assign-plan";
import { stageAfter, type StageLink } from "@/lib/plans/stage-progression";

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Manager approval of a stage gate assigns the next program. Nothing is assigned before that
 * approval, and the last stage has nowhere further to move.
 */
export async function enrollNextProgramStage(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
  approvedPlanStepId: string,
): Promise<string | null> {
  const { data: approvedStep } = await supabase
    .from("plan_steps")
    .select("id, metadata, sort_order")
    .eq("id", approvedPlanStepId)
    .maybeSingle();
  if (!approvedStep || !parsePlanStepMetadata(approvedStep.metadata, approvedStep.sort_order).isSegmentGate) {
    return null;
  }

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("user_id, mentor_id, assigned_by, plan_id, tenant_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) return null;

  const { data: memberships } = await supabase
    .from("enablement_program_segments")
    .select("program_id")
    .eq("plan_id", assignment.plan_id)
    .limit(1);
  const programId = memberships?.[0]?.program_id;
  if (!programId) return null;

  const { data: segmentRows } = await supabase
    .from("enablement_program_segments")
    .select("segment_index, plan_id")
    .eq("program_id", programId);
  const stages: StageLink[] = (segmentRows ?? []).map((row) => ({
    segmentIndex: row.segment_index,
    planId: row.plan_id,
  }));
  const next = stageAfter(stages, assignment.plan_id);
  if (!next) return null;

  // Test-out gates and the final sign-off all have to be approved before the next stage opens.
  const { data: planSteps } = await supabase.from("plan_steps").select("id, metadata, sort_order").eq("plan_id", assignment.plan_id);
  const gateIds = (planSteps ?? [])
    .filter((step) => parsePlanStepMetadata(step.metadata, step.sort_order).isSegmentGate)
    .map((step) => step.id);
  const { data: gateProgress } = await supabase
    .from("plan_assignment_steps")
    .select("plan_step_id, status")
    .eq("assignment_id", assignmentId)
    .in("plan_step_id", gateIds);
  const reviewed = new Set((gateProgress ?? []).filter((row) => row.status === "reviewed").map((row) => row.plan_step_id));
  if (!gateIds.every((id) => reviewed.has(id) || id === approvedPlanStepId)) return null;

  const { data: existing } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", assignment.user_id)
    .eq("plan_id", next.planId)
    .neq("status", "completed")
    .maybeSingle();
  if (existing) return existing.id;

  const { data: nextPlan } = await supabase.from("onboarding_plans").select("name").eq("id", next.planId).maybeSingle();
  const startDate = new Date().toISOString().slice(0, 10);
  const nextAssignmentId = await assignPlanToUser(supabase, {
    planId: next.planId,
    userId: assignment.user_id,
    mentorId: assignment.mentor_id,
    assignedBy: assignment.assigned_by ?? assignment.user_id,
    startDate,
    targetCompletion: addDays(startDate, 30),
    tenantId: assignment.tenant_id,
  });

  await createNotification(supabase, {
    userId: assignment.user_id,
    title: "Next program assigned",
    body: nextPlan?.name
      ? `Your manager approved the move. ${nextPlan.name} is now on your plan.`
      : "Your manager approved the move to the next program.",
    actionUrl: "/my-plan",
  });

  return nextAssignmentId;
}
