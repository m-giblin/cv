import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { maybeUnlockNextSegment } from "@/lib/plans/segment-gates";
import { assertStepAccessible } from "@/lib/plans/step-prerequisites";
import {
  canManagerSignOffStep,
  canMentorEndorseStep,
  isMentorCoachingStep,
} from "@/lib/plans/review-policy";
import type { PlanStepType } from "@/lib/types";
import { createNotification } from "@/lib/notifications/create-notification";

export { StepSegmentLockedError } from "@/lib/plans/segment-lock";

export async function recalculatePlanProgress(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
) {
  const [{ data: steps }, { data: adHocSteps }] = await Promise.all([
    supabase.from("plan_assignment_steps").select("status").eq("assignment_id", assignmentId),
    supabase.from("plan_ad_hoc_steps").select("status").eq("assignment_id", assignmentId),
  ]);

  const allStatuses = [
    ...(steps ?? []).map((step) => step.status),
    ...(adHocSteps ?? []).map((step) => step.status),
  ];
  const total = allStatuses.length;
  const validated = allStatuses.filter((status) => status === "reviewed").length;

  const progress = total > 0 ? Math.round((validated / total) * 100) : 0;

  await supabase
    .from("plan_assignments")
    .update({
      progress_percent: progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
    })
    .eq("id", assignmentId);
}

async function getAssignmentStepContext(
  supabase: SupabaseClient<Database>,
  assignmentStepId: string,
) {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("id, assignment_id, plan_step_id, notes, status")
    .eq("id", assignmentStepId)
    .maybeSingle();

  if (!step) {
    throw new Error("Plan step not found.");
  }

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("user_id, mentor_id, assigned_by")
    .eq("id", step.assignment_id)
    .maybeSingle();

  if (!assignment) {
    throw new Error("Plan assignment not found.");
  }

  return { step, assignment };
}

async function getPlanStepMeta(
  supabase: SupabaseClient<Database>,
  planStepId: string,
): Promise<{ stepType: PlanStepType; isSegmentGate: boolean }> {
  const { data: planStep } = await supabase
    .from("plan_steps")
    .select("step_type, metadata, sort_order")
    .eq("id", planStepId)
    .maybeSingle();

  if (!planStep) {
    return { stepType: "custom", isSegmentGate: false };
  }

  const meta = parsePlanStepMetadata(planStep.metadata, planStep.sort_order);
  return {
    stepType: planStep.step_type as PlanStepType,
    isSegmentGate: meta.isSegmentGate,
  };
}

async function getReviewerContext(
  supabase: SupabaseClient<Database>,
  reviewerId: string,
  assigneeUserId: string,
) {
  const [{ data: reviewer }, { data: assignee }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", reviewerId).maybeSingle(),
    supabase.from("profiles").select("manager_id").eq("id", assigneeUserId).maybeSingle(),
  ]);

  return {
    reviewerRole: reviewer?.role ?? "basic_se",
    assigneeManagerId: assignee?.manager_id ?? null,
  };
}

/** SE submits work — awaits manager/mentor validation. Never marks the step complete. */
export async function submitAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    userId: string;
    notes?: string;
  },
) {
  const { step, assignment } = await getAssignmentStepContext(supabase, params.assignmentStepId);

  if (assignment.user_id !== params.userId) {
    throw new Error("Not authorized to submit this step.");
  }

  await assertStepAccessible(supabase, params.assignmentStepId);

  if (step.status === "reviewed") {
    throw new Error("This step is already validated.");
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({
      status: "submitted",
      completed_at: null,
      notes: params.notes ?? step.notes,
    })
    .eq("id", params.assignmentStepId);

  if (error) {
    throw new Error(error.message);
  }

  await recalculatePlanProgress(supabase, step.assignment_id);

  await supabase.from("activity_logs").insert({
    user_id: params.userId,
    event_type: "plan_step_completed",
    title: "Submitted onboarding plan step for review",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      plan_step_id: step.plan_step_id,
      validation_status: "submitted",
    },
  });

  return { assignmentId: step.assignment_id, planStepId: step.plan_step_id };
}

/** Mentor endorses a coaching check-in — awaits manager live sign-off. */
export async function endorseAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    reviewerId: string;
    feedback?: string;
  },
) {
  const { step, assignment } = await getAssignmentStepContext(supabase, params.assignmentStepId);
  const { stepType, isSegmentGate } = await getPlanStepMeta(supabase, step.plan_step_id);

  if (
    !canMentorEndorseStep({
      reviewerId: params.reviewerId,
      mentorId: assignment.mentor_id,
      stepType,
      isSegmentGate,
    })
  ) {
    throw new Error("Only the assigned mentor can endorse coaching check-ins.");
  }

  if (step.status !== "submitted") {
    throw new Error("Step must be submitted before mentor endorsement.");
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({
      status: "under_review",
      completed_at: null,
      notes: params.feedback ?? step.notes,
    })
    .eq("id", params.assignmentStepId);

  if (error) {
    throw new Error(error.message);
  }

  await recalculatePlanProgress(supabase, step.assignment_id);

  const { assigneeManagerId } = await getReviewerContext(supabase, params.reviewerId, assignment.user_id);

  if (assigneeManagerId) {
    await createNotificationForManager(supabase, {
      managerId: assigneeManagerId,
      seUserId: assignment.user_id,
      title: "Mentor endorsed — manager sign-off needed",
      body: "A mentor check-in is ready for your live validation.",
      actionUrl: "/manager?section=inbox",
    });
  }

  await supabase.from("activity_logs").insert({
    user_id: assignment.user_id,
    actor_id: params.reviewerId,
    event_type: "manager_feedback_received",
    title: "Mentor endorsed plan step — awaiting manager sign-off",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      plan_step_id: step.plan_step_id,
      validation_status: "under_review",
    },
  });

  return { assignmentId: step.assignment_id, userId: assignment.user_id };
}

async function createNotificationForManager(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    seUserId: string;
    title: string;
    body: string;
    actionUrl: string;
  },
) {
  await createNotification(supabase, {
    userId: params.managerId,
    title: params.title,
    body: params.body,
    actionUrl: params.actionUrl,
  });
}

/** Manager approves — step counts toward plan progress (live sign-off). */
export async function approveAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    reviewerId: string;
    feedback?: string;
  },
) {
  const { step, assignment } = await getAssignmentStepContext(supabase, params.assignmentStepId);
  const { stepType, isSegmentGate } = await getPlanStepMeta(supabase, step.plan_step_id);
  const { reviewerRole, assigneeManagerId } = await getReviewerContext(
    supabase,
    params.reviewerId,
    assignment.user_id,
  );

  const isMentor = assignment.mentor_id === params.reviewerId;

  if (isMentor && isMentorCoachingStep(stepType, isSegmentGate)) {
    return endorseAssignmentStep(supabase, params);
  }

  if (
    !canManagerSignOffStep({
      reviewerId: params.reviewerId,
      assigneeManagerId,
      assignedById: assignment.assigned_by,
      reviewerRole,
    })
  ) {
    throw new Error("Only the hiring manager can sign off on this step.");
  }

  if (isSegmentGate && !canManagerSignOffStep({
    reviewerId: params.reviewerId,
    assigneeManagerId,
    assignedById: assignment.assigned_by,
    reviewerRole,
  })) {
    throw new Error("Segment gates require manager live sign-off.");
  }

  const allowedStatuses = stepType === "mentor_review" ? ["submitted", "under_review"] : ["submitted"];
  if (!allowedStatuses.includes(step.status)) {
    throw new Error("Step is not ready for manager sign-off.");
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({
      status: "reviewed",
      completed_at: new Date().toISOString(),
      notes: params.feedback ?? step.notes,
    })
    .eq("id", params.assignmentStepId);

  if (error) {
    throw new Error(error.message);
  }

  await recalculatePlanProgress(supabase, step.assignment_id);

  await maybeUnlockNextSegment(supabase, step.assignment_id, step.plan_step_id);

  await supabase.from("activity_logs").insert({
    user_id: assignment.user_id,
    actor_id: params.reviewerId,
    event_type: "manager_feedback_received",
    title: "Plan step validated by reviewer",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      plan_step_id: step.plan_step_id,
      validation_status: "reviewed",
    },
  });

  return { assignmentId: step.assignment_id, userId: assignment.user_id };
}

/** Manager or mentor sends back — SE must redo the activity. */
export async function rejectAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    reviewerId: string;
    feedback: string;
  },
) {
  const { step, assignment } = await getAssignmentStepContext(supabase, params.assignmentStepId);
  const { stepType, isSegmentGate } = await getPlanStepMeta(supabase, step.plan_step_id);
  const { reviewerRole, assigneeManagerId } = await getReviewerContext(
    supabase,
    params.reviewerId,
    assignment.user_id,
  );

  const isMentor = assignment.mentor_id === params.reviewerId;
  const canManager = canManagerSignOffStep({
    reviewerId: params.reviewerId,
    assigneeManagerId,
    assignedById: assignment.assigned_by,
    reviewerRole,
  });

  if (isMentor && !isMentorCoachingStep(stepType, isSegmentGate)) {
    throw new Error("Mentors cannot reject capability steps — manager sign-off only.");
  }

  if (!isMentor && !canManager) {
    throw new Error("Not authorized to reject this step.");
  }

  if (isMentor && !canMentorEndorseStep({
    reviewerId: params.reviewerId,
    mentorId: assignment.mentor_id,
    stepType,
    isSegmentGate,
  })) {
    throw new Error("Not authorized to reject this step.");
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({
      status: "in_progress",
      completed_at: null,
      notes: params.feedback,
    })
    .eq("id", params.assignmentStepId);

  if (error) {
    throw new Error(error.message);
  }

  await recalculatePlanProgress(supabase, step.assignment_id);

  await supabase.from("activity_logs").insert({
    user_id: assignment.user_id,
    actor_id: params.reviewerId,
    event_type: "manager_feedback_received",
    title: "Plan step needs revision",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      plan_step_id: step.plan_step_id,
      validation_status: "rejected",
    },
  });

  return { assignmentId: step.assignment_id, userId: assignment.user_id };
}

/** @deprecated Use submitAssignmentStep — kept for internal callers migrating to submit. */
export async function completeAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    userId: string;
    status?: "submitted";
    notes?: string;
  },
) {
  return submitAssignmentStep(supabase, {
    assignmentStepId: params.assignmentStepId,
    userId: params.userId,
    notes: params.notes,
  });
}

export async function submitSimulationPlanSteps(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    simulationAssignmentId?: string | null;
    templateId?: string | null;
  },
) {
  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", params.userId)
    .neq("status", "completed");

  if (!assignments?.length) {
    return null;
  }

  let templateId = params.templateId ?? null;

  if (!templateId && params.simulationAssignmentId) {
    const { data: simulation } = await supabase
      .from("simulation_assignments")
      .select("template_id")
      .eq("id", params.simulationAssignmentId)
      .maybeSingle();

    templateId = simulation?.template_id ?? null;
  }

  for (const assignment of assignments) {
    const { data: assignmentSteps } = await supabase
      .from("plan_assignment_steps")
      .select("id, plan_step_id, status")
      .eq("assignment_id", assignment.id)
      .in("status", ["not_started", "in_progress"]);

    for (const assignmentStep of assignmentSteps ?? []) {
      const { data: planStep } = await supabase
        .from("plan_steps")
        .select("step_type, simulation_template_id")
        .eq("id", assignmentStep.plan_step_id)
        .maybeSingle();

      if (planStep?.step_type !== "simulation") {
        continue;
      }

      if (
        templateId &&
        planStep.simulation_template_id &&
        planStep.simulation_template_id !== templateId
      ) {
        continue;
      }

      return submitAssignmentStep(supabase, {
        assignmentStepId: assignmentStep.id,
        userId: params.userId,
      });
    }
  }

  return null;
}

export async function approvePlanStepsByType(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    stepType: string;
    reviewerId: string;
    feedback?: string;
  },
) {
  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", params.userId);

  for (const assignment of assignments ?? []) {
    const { data: steps } = await supabase
      .from("plan_assignment_steps")
      .select("id, plan_step_id, status")
      .eq("assignment_id", assignment.id)
      .eq("status", "submitted");

    for (const step of steps ?? []) {
      const { data: planStep } = await supabase
        .from("plan_steps")
        .select("step_type")
        .eq("id", step.plan_step_id)
        .maybeSingle();

      if (planStep?.step_type === params.stepType) {
        await approveAssignmentStep(supabase, {
          assignmentStepId: step.id,
          reviewerId: params.reviewerId,
          feedback: params.feedback,
        });
      }
    }
  }
}

export async function rejectPlanStepsByType(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    stepType: string;
    reviewerId: string;
    feedback: string;
  },
) {
  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", params.userId);

  for (const assignment of assignments ?? []) {
    const { data: steps } = await supabase
      .from("plan_assignment_steps")
      .select("id, plan_step_id")
      .eq("assignment_id", assignment.id)
      .eq("status", "submitted");

    for (const step of steps ?? []) {
      const { data: planStep } = await supabase
        .from("plan_steps")
        .select("step_type")
        .eq("id", step.plan_step_id)
        .maybeSingle();

      if (planStep?.step_type === params.stepType) {
        await rejectAssignmentStep(supabase, {
          assignmentStepId: step.id,
          reviewerId: params.reviewerId,
          feedback: params.feedback,
        });
      }
    }
  }
}

export async function linkDealPrepPlanSteps(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    sessionId: string;
    accountName: string;
    assignmentStepId?: string;
  },
) {
  if (params.assignmentStepId) {
    await submitAssignmentStep(supabase, {
      assignmentStepId: params.assignmentStepId,
      userId: params.userId,
      notes: `Deal prep completed for ${params.accountName} (session ${params.sessionId}).`,
    });
    return;
  }

  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", params.userId)
    .neq("status", "completed");

  if (!assignments?.length) {
    return;
  }

  for (const assignment of assignments) {
    const { data: assignmentSteps } = await supabase
      .from("plan_assignment_steps")
      .select("id, plan_step_id, status")
      .eq("assignment_id", assignment.id)
      .in("status", ["not_started", "in_progress"]);

    for (const assignmentStep of assignmentSteps ?? []) {
      const { data: planStep } = await supabase
        .from("plan_steps")
        .select("step_type")
        .eq("id", assignmentStep.plan_step_id)
        .maybeSingle();

      if (planStep?.step_type !== "deal_prep") {
        continue;
      }

      await submitAssignmentStep(supabase, {
        assignmentStepId: assignmentStep.id,
        userId: params.userId,
        notes: `Deal prep completed for ${params.accountName} (session ${params.sessionId}).`,
      });
      return;
    }
  }
}
