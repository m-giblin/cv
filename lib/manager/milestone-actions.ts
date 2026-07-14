import type { SupabaseClient } from "@supabase/supabase-js";
import { addCalendarDays } from "@/lib/plans/business-days";
import {
  approveAssignmentStep,
  recalculatePlanProgress,
} from "@/lib/plans/complete-step";
import { maybeUnlockNextSegment } from "@/lib/plans/segment-gates";
import { canManagerSignOffStep } from "@/lib/plans/review-policy";
import { createNotification } from "@/lib/notifications/create-notification";
import type { Database } from "@/lib/database.types";

export const MILESTONE_NUDGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export type MilestoneNudgeStatus = {
  canNudge: boolean;
  reason?: string;
  nextNudgeAt?: string | null;
  lastNudgedAt?: string | null;
};

function stepIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).assignment_step_id;
  return typeof value === "string" ? value : null;
}

export async function getMilestoneNudgeStatus(
  supabase: SupabaseClient<Database>,
  managerId: string,
  assignmentStepIds: string[],
): Promise<Record<string, MilestoneNudgeStatus>> {
  const result: Record<string, MilestoneNudgeStatus> = {};
  for (const id of assignmentStepIds) {
    result[id] = { canNudge: true };
  }
  if (assignmentStepIds.length === 0) return result;

  const { data } = await supabase
    .from("activity_logs")
    .select("created_at, metadata")
    .eq("actor_id", managerId)
    .eq("event_type", "manager_milestone_nudge")
    .order("created_at", { ascending: false })
    .limit(200);

  const latestByStep = new Map<string, string>();
  for (const row of data ?? []) {
    const stepId = stepIdFromMetadata(row.metadata);
    if (!stepId || !assignmentStepIds.includes(stepId) || latestByStep.has(stepId)) continue;
    latestByStep.set(stepId, row.created_at);
  }

  const now = Date.now();
  for (const stepId of assignmentStepIds) {
    const last = latestByStep.get(stepId);
    if (!last) continue;
    const elapsed = now - new Date(last).getTime();
    if (elapsed < MILESTONE_NUDGE_COOLDOWN_MS) {
      const nextNudgeAt = new Date(new Date(last).getTime() + MILESTONE_NUDGE_COOLDOWN_MS).toISOString();
      result[stepId] = {
        canNudge: false,
        reason: `Nudged recently — available ${formatCooldownDate(nextNudgeAt)}`,
        nextNudgeAt,
        lastNudgedAt: last,
      };
    } else {
      result[stepId] = { canNudge: true, lastNudgedAt: last };
    }
  }

  return result;
}

function formatCooldownDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function sendMilestoneNudge(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    seUserId: string;
    assignmentStepId: string;
    milestoneLabel: string;
  },
): Promise<{ success: true; nextNudgeAt: string } | { success: false; reason: string; nextNudgeAt?: string }> {
  const status = await getMilestoneNudgeStatus(supabase, params.managerId, [params.assignmentStepId]);
  const eligibility = status[params.assignmentStepId];
  if (eligibility && !eligibility.canNudge) {
    return {
      success: false,
      reason: eligibility.reason ?? "Nudge on cooldown",
      nextNudgeAt: eligibility.nextNudgeAt ?? undefined,
    };
  }

  await createNotification(supabase, {
    userId: params.seUserId,
    title: "Manager nudge — overdue milestone",
    body: `Your manager flagged "${params.milestoneLabel}" as overdue. Please complete or update your plan.`,
    actionUrl: "/my-plan",
  });

  await supabase.from("activity_logs").insert({
    user_id: params.seUserId,
    actor_id: params.managerId,
    event_type: "manager_milestone_nudge",
    title: `Manager nudged SE on milestone: ${params.milestoneLabel}`,
    metadata: {
      assignment_step_id: params.assignmentStepId,
      milestone_label: params.milestoneLabel,
    },
  });

  const nextNudgeAt = new Date(Date.now() + MILESTONE_NUDGE_COOLDOWN_MS).toISOString();
  return { success: true, nextNudgeAt };
}

function formatPlanDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function rescheduleMilestoneStep(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    assignmentId: string;
    assignmentStepId: string;
    shiftDays?: number;
    newDueDate?: string;
  },
): Promise<{
  success: true;
  previousDueDate: string;
  newDueDate: string;
  shiftDays: number;
  anchoredFrom: string;
  mode: "quick" | "custom";
}> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("id, start_date, user_id")
    .eq("id", params.assignmentId)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found.");

  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("id, due_date")
    .eq("id", params.assignmentStepId)
    .eq("assignment_id", params.assignmentId)
    .maybeSingle();

  if (!step?.due_date) throw new Error("Step not found or has no due date.");

  let newDueDate: string;
  let anchoredFrom: string;
  let shiftDays: number;
  let mode: "quick" | "custom";

  if (params.newDueDate) {
    if (params.newDueDate < today) {
      throw new Error("Pick today or a future date.");
    }
    newDueDate = params.newDueDate;
    anchoredFrom = params.newDueDate;
    mode = "custom";
    const fromMs = new Date(`${step.due_date}T12:00:00`).getTime();
    const toMs = new Date(`${newDueDate}T12:00:00`).getTime();
    shiftDays = Math.max(0, Math.round((toMs - fromMs) / 86_400_000));
  } else {
    const shift = params.shiftDays ?? 7;
    // Overdue items extend from today so the milestone actually clears the overdue list.
    anchoredFrom = step.due_date < today ? today : step.due_date;
    newDueDate = addCalendarDays(anchoredFrom, shift);
    shiftDays = shift;
    mode = "quick";
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({ due_date: newDueDate })
    .eq("id", params.assignmentStepId);

  if (error) throw new Error(error.message);

  await supabase.from("activity_logs").insert({
    user_id: assignment.user_id,
    actor_id: params.managerId,
    event_type: "manager_milestone_rescheduled",
    title: "Manager rescheduled plan milestone",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      previous_due_date: step.due_date,
      new_due_date: newDueDate,
      shift_days: shiftDays,
      reschedule_mode: mode,
    },
  });

  const notificationBody =
    mode === "custom"
      ? `Your manager moved this milestone from ${formatPlanDate(step.due_date)} to ${formatPlanDate(newDueDate)}.`
      : `Your manager moved this milestone from ${formatPlanDate(step.due_date)} to ${formatPlanDate(newDueDate)} (+${shiftDays} days).`;

  await createNotification(supabase, {
    userId: assignment.user_id,
    title: "Plan milestone rescheduled",
    body: notificationBody,
    actionUrl: "/my-plan",
  });

  return {
    success: true,
    previousDueDate: step.due_date,
    newDueDate,
    shiftDays,
    anchoredFrom,
    mode,
  };
}

async function getReviewerContext(
  supabase: SupabaseClient<Database>,
  reviewerId: string,
  assigneeUserId: string,
) {
  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", reviewerId)
    .maybeSingle();

  const { data: assignee } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", assigneeUserId)
    .maybeSingle();

  return {
    reviewerRole: reviewer?.role ?? "basic_se",
    assigneeManagerId: assignee?.manager_id ?? null,
  };
}

export async function completeMilestoneStep(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    assignmentStepId: string;
  },
): Promise<{ success: true; mode: "approved" | "waived" }> {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("id, assignment_id, plan_step_id, status, notes")
    .eq("id", params.assignmentStepId)
    .maybeSingle();

  if (!step) throw new Error("Step not found.");

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("user_id, assigned_by, mentor_id")
    .eq("id", step.assignment_id)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found.");

  const { reviewerRole, assigneeManagerId } = await getReviewerContext(
    supabase,
    params.managerId,
    assignment.user_id,
  );

  if (
    !canManagerSignOffStep({
      reviewerId: params.managerId,
      assigneeManagerId,
      assignedById: assignment.assigned_by,
      reviewerRole,
    })
  ) {
    throw new Error("Not authorized to complete this milestone.");
  }

  if (step.status === "submitted" || step.status === "under_review") {
    await approveAssignmentStep(supabase, {
      assignmentStepId: params.assignmentStepId,
      reviewerId: params.managerId,
      feedback: "Marked done from Program Tracker milestones.",
    });
    return { success: true, mode: "approved" };
  }

  if (step.status === "reviewed" || step.status === "completed") {
    throw new Error("This milestone is already complete.");
  }

  const { error } = await supabase
    .from("plan_assignment_steps")
    .update({
      status: "reviewed",
      completed_at: new Date().toISOString(),
      notes: step.notes ?? "Manager marked complete (overdue milestone).",
    })
    .eq("id", params.assignmentStepId);

  if (error) throw new Error(error.message);

  await recalculatePlanProgress(supabase, step.assignment_id);
  await maybeUnlockNextSegment(supabase, step.assignment_id, step.plan_step_id);

  await supabase.from("activity_logs").insert({
    user_id: assignment.user_id,
    actor_id: params.managerId,
    event_type: "manager_milestone_completed",
    title: "Manager marked overdue milestone complete",
    metadata: {
      assignment_step_id: params.assignmentStepId,
      plan_step_id: step.plan_step_id,
      validation_status: "reviewed",
    },
  });

  await createNotification(supabase, {
    userId: assignment.user_id,
    title: "Milestone marked complete",
    body: "Your manager marked an overdue plan milestone as complete.",
    actionUrl: "/my-plan",
  });

  return { success: true, mode: "waived" };
}
