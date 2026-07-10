import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { PlanStep } from "@/lib/types";
import { createNotification } from "@/lib/notifications/create-notification";
import { canManagerSignOffStep } from "@/lib/plans/review-policy";
import { recalculatePlanProgress } from "@/lib/plans/complete-step";

type AdHocRow = {
  id: string;
  assignment_id: string;
  title: string;
  description: string | null;
  step_type: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  is_manager_gate: boolean;
  sort_order: number;
};

export async function fetchAdHocStepsForAssignments(
  supabase: SupabaseClient<Database>,
  assignmentIds: string[],
): Promise<Map<string, PlanStep[]>> {
  if (assignmentIds.length === 0) {
    return new Map();
  }

  const { data } = await supabase
    .from("plan_ad_hoc_steps")
    .select(
      "id, assignment_id, title, description, step_type, status, due_date, notes, is_manager_gate, sort_order",
    )
    .in("assignment_id", assignmentIds)
    .order("sort_order");

  const byAssignment = new Map<string, PlanStep[]>();

  for (const row of (data ?? []) as AdHocRow[]) {
    const step: PlanStep = {
      id: `adhoc-${row.id}`,
      assignmentStepId: `adhoc-${row.id}`,
      title: row.title,
      description: row.description ?? "",
      type: "custom",
      order: 1000 + row.sort_order,
      status: row.status as PlanStep["status"],
      dueDate: row.due_date ?? undefined,
      isSegmentGate: row.is_manager_gate,
      locked: false,
    };
    const existing = byAssignment.get(row.assignment_id) ?? [];
    existing.push(step);
    byAssignment.set(row.assignment_id, existing);
  }

  return byAssignment;
}

export function parseAdHocStepId(assignmentStepId: string): string | null {
  if (!assignmentStepId.startsWith("adhoc-")) return null;
  return assignmentStepId.slice("adhoc-".length);
}

export async function submitAdHocStep(
  supabase: SupabaseClient<Database>,
  params: { adHocStepId: string; userId: string; notes?: string },
) {
  const { data: row } = await supabase
    .from("plan_ad_hoc_steps")
    .select("id, assignment_id, status, notes")
    .eq("id", params.adHocStepId)
    .maybeSingle();

  if (!row) throw new Error("Task not found.");

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("user_id, assigned_by")
    .eq("id", row.assignment_id)
    .maybeSingle();

  if (!assignment || assignment.user_id !== params.userId) {
    throw new Error("Not authorized to submit this task.");
  }

  const { error } = await supabase
    .from("plan_ad_hoc_steps")
    .update({
      status: "submitted",
      notes: params.notes ?? row.notes,
    })
    .eq("id", params.adHocStepId);

  if (error) throw new Error(error.message);

  await recalculatePlanProgress(supabase, row.assignment_id);

  const { data: assignee } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", assignment.user_id)
    .maybeSingle();

  if (assignee?.manager_id) {
    await createNotification(supabase, {
      userId: assignee.manager_id,
      title: "Custom ramp task ready for sign-off",
      body: "An employee submitted a manager-assigned task for live validation.",
      actionUrl: "/manager?section=inbox",
    });
  }

  return { assignmentId: row.assignment_id };
}

export async function reviewAdHocStep(
  supabase: SupabaseClient<Database>,
  params: {
    adHocStepId: string;
    reviewerId: string;
    decision: "approve" | "reject";
    feedback: string;
  },
) {
  const { data: row } = await supabase
    .from("plan_ad_hoc_steps")
    .select("id, assignment_id, status, is_manager_gate")
    .eq("id", params.adHocStepId)
    .maybeSingle();

  if (!row) throw new Error("Task not found.");

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("user_id, assigned_by")
    .eq("id", row.assignment_id)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found.");

  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role, manager_id")
    .eq("id", params.reviewerId)
    .maybeSingle();

  const { data: assignee } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", assignment.user_id)
    .maybeSingle();

  if (
    !canManagerSignOffStep({
      reviewerId: params.reviewerId,
      assigneeManagerId: assignee?.manager_id ?? null,
      assignedById: assignment.assigned_by,
      reviewerRole: reviewer?.role ?? "basic_se",
    })
  ) {
    throw new Error("Only the hiring manager can sign off on this task.");
  }

  const nextStatus = params.decision === "approve" ? "reviewed" : "in_progress";

  const { error } = await supabase
    .from("plan_ad_hoc_steps")
    .update({
      status: nextStatus,
      notes: params.feedback,
    })
    .eq("id", params.adHocStepId);

  if (error) throw new Error(error.message);

  await recalculatePlanProgress(supabase, row.assignment_id);

  return { userId: assignment.user_id };
}
