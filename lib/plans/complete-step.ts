import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export async function recalculatePlanProgress(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
) {
  const { data: steps } = await supabase
    .from("plan_assignment_steps")
    .select("status")
    .eq("assignment_id", assignmentId);

  const total = steps?.length ?? 0;
  const validated = steps?.filter((step) => step.status === "reviewed").length ?? 0;

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

/** Manager or mentor approves — step counts toward plan progress. */
export async function approveAssignmentStep(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentStepId: string;
    reviewerId: string;
    feedback?: string;
  },
) {
  const { step, assignment } = await getAssignmentStepContext(supabase, params.assignmentStepId);

  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", params.reviewerId)
    .maybeSingle();

  const { data: assignee } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", assignment.user_id)
    .maybeSingle();

  const isMentor = assignment.mentor_id === params.reviewerId;
  const isManager = assignee?.manager_id === params.reviewerId;
  const isAssigner = assignment.assigned_by === params.reviewerId;
  const isElevatedReviewer =
    reviewer?.role === "manager" ||
    reviewer?.role === "director" ||
    reviewer?.role === "admin" ||
    reviewer?.role === "mentor";

  if (!isManager && !isMentor && !isAssigner && !isElevatedReviewer) {
    throw new Error("Not authorized to approve this step.");
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

  const isMentor = assignment.mentor_id === params.reviewerId;
  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", params.reviewerId)
    .maybeSingle();

  const { data: assignee } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", assignment.user_id)
    .maybeSingle();

  const isManager = assignee?.manager_id === params.reviewerId;

  if (
    !isManager &&
    !isMentor &&
    reviewer?.role !== "manager" &&
    reviewer?.role !== "director" &&
    reviewer?.role !== "admin"
  ) {
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
