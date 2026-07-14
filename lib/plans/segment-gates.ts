import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { createNotification } from "@/lib/notifications/create-notification";
import { shouldUnlockNextSegment } from "@/lib/plans/segment-gate-logic";
import { issueSegmentCertificate } from "@/lib/plans/segment-certificates";

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

  const nextSegment = Math.min(4, segmentIndex + 1);

  await supabase
    .from("plan_assignments")
    .update({ unlocked_segment_max: nextSegment })
    .eq("id", assignmentId);

  await issueSegmentCertificate(supabase, {
    assignmentId,
    userId: assignment.user_id,
    segmentIndex,
    programId: null,
  });

  await createNotification(supabase, {
    userId: assignment.user_id,
    title: `Segment ${segmentIndex} complete — Days ${segmentIndex * 30 + 1}–${nextSegment * 30} unlocked`,
    body: "Your assessment gate was approved. The next 30-day mastery bucket is now available.",
    actionUrl: "/my-plan",
  });
}
