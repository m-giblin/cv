import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type PlanStepRow = Database["public"]["Tables"]["plan_steps"]["Row"];

export async function assignPlanToUser(
  supabase: SupabaseClient<Database>,
  params: {
    planId: string;
    userId: string;
    mentorId: string | null;
    assignedBy: string;
    startDate: string;
    targetCompletion: string | null;
  },
) {
  const { data: assignment, error: assignmentError } = await supabase
    .from("plan_assignments")
    .insert({
      plan_id: params.planId,
      user_id: params.userId,
      mentor_id: params.mentorId,
      assigned_by: params.assignedBy,
      start_date: params.startDate,
      target_completion: params.targetCompletion,
      status: "not_started",
      progress_percent: 0,
    })
    .select("id")
    .single();

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const { data: steps, error: stepsError } = await supabase
    .from("plan_steps")
    .select("*")
    .eq("plan_id", params.planId)
    .order("sort_order");

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  const start = new Date(params.startDate);

  const assignmentSteps = ((steps ?? []) as PlanStepRow[]).map((step) => {
    const metadata =
      step.metadata && typeof step.metadata === "object" && !Array.isArray(step.metadata)
        ? (step.metadata as Record<string, unknown>)
        : {};
    const offsetDays = typeof metadata.dueOffsetDays === "number" ? metadata.dueOffsetDays : step.sort_order * 7;
    const due = new Date(start);
    due.setDate(due.getDate() + offsetDays);

    return {
      assignment_id: assignment.id,
      plan_step_id: step.id,
      status: "not_started" as const,
      due_date: due.toISOString().slice(0, 10),
    };
  });

  if (assignmentSteps.length > 0) {
    const { error: insertStepsError } = await supabase.from("plan_assignment_steps").insert(assignmentSteps);

    if (insertStepsError) {
      throw new Error(insertStepsError.message);
    }
  }

  return assignment.id;
}
