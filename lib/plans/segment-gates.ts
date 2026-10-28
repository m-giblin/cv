import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { createNotification } from "@/lib/notifications/create-notification";
import { nextPartIndex, shouldUnlockNextSegment } from "@/lib/plans/segment-gate-logic";
import { issueSegmentCertificate } from "@/lib/plans/segment-certificates";
import { RAMP_SEGMENT_NAMES } from "@/lib/se/ramp-model";
import { createAdminClient } from "@/lib/supabase/admin";

export async function maybeUnlockNextSegment(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
  approvedPlanStepId: string,
) {
  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("id, user_id, unlocked_segment_max, plan_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return;

  const { data: approvedStep } = await supabase
    .from("plan_steps")
    .select("id, metadata, sort_order")
    .eq("id", approvedPlanStepId)
    .maybeSingle();

  if (!approvedStep) return;

  const { segmentIndex, isSegmentGate } = parsePlanStepMetadata(
    approvedStep.metadata,
    approvedStep.sort_order,
  );

  if (!segmentIndex || !isSegmentGate) return;
  if (segmentIndex < assignment.unlocked_segment_max) return;

  const { data: segmentSteps } = await supabase
    .from("plan_steps")
    .select("id, metadata")
    .eq("plan_id", assignment.plan_id);

  const segmentStepIds = (segmentSteps ?? [])
    .filter((step) => {
      const meta = parsePlanStepMetadata(step.metadata, 0);
      return meta.segmentIndex === segmentIndex;
    })
    .map((step) => step.id);

  if (segmentStepIds.length === 0) return;

  const { data: assignmentSteps } = await supabase
    .from("plan_assignment_steps")
    .select("plan_step_id, status")
    .eq("assignment_id", assignmentId)
    .in("plan_step_id", segmentStepIds);

  if ((assignmentSteps ?? []).length !== segmentStepIds.length) return;

  const segmentStepStatuses = (assignmentSteps ?? []).map((row) => {
    const meta = parsePlanStepMetadata(
      segmentSteps?.find((step) => step.id === row.plan_step_id)?.metadata ?? null,
      0,
    );
    return { isGate: meta.isSegmentGate, status: row.status };
  });

  if (
    !shouldUnlockNextSegment({
      segmentIndex,
      isSegmentGate,
      unlockedSegmentMax: assignment.unlocked_segment_max,
      segmentStepStatuses,
    })
  ) {
    return;
  }

  // A stage (one plan) has one or more parts; only a gate before another part opens something here.
  // The last part's gate closes the stage, and the next stage's own notice says what comes next.
  const followingPart = nextPartIndex(
    (segmentSteps ?? []).map((step) => parsePlanStepMetadata(step.metadata, 0).segmentIndex),
    segmentIndex,
  );
  const hasNextPart = followingPart !== null;
  const nextSegment = followingPart ?? Math.min(4, segmentIndex + 1);
  const multiPart = hasNextPart || segmentIndex > 1;

  await supabase
    .from("plan_assignments")
    .update({ unlocked_segment_max: nextSegment })
    .eq("id", assignmentId);

  const [{ data: plan }, { data: stageLinks }] = await Promise.all([
    supabase.from("onboarding_plans").select("name").eq("id", assignment.plan_id).maybeSingle(),
    // Program setup, read like advance-program does: the manager's session may not see the links.
    ((createAdminClient() as SupabaseClient<Database> | null) ?? supabase)
      .from("enablement_program_segments")
      .select("segment_index")
      .eq("plan_id", assignment.plan_id)
      .limit(1),
  ]);
  const partName = (index: number) => RAMP_SEGMENT_NAMES[index - 1] ?? `part ${index}`;

  await issueSegmentCertificate(supabase, {
    assignmentId,
    userId: assignment.user_id,
    segmentIndex,
    programId: null,
    label: plan?.name ? (multiPart ? `${plan.name}, ${partName(segmentIndex)}` : plan.name) : null,
    stageNumber: stageLinks?.[0]?.segment_index ?? null,
    multiPart,
  });

  if (hasNextPart) {
    await createNotification(supabase, {
      userId: assignment.user_id,
      title: `${partName(nextSegment)} unlocked`,
      body: `Your manager signed off the gate, so the next part of ${plan?.name ?? "your stage"} is open on My ramp.`,
      actionUrl: "/my-plan",
    });
  }
}
