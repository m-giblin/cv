import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

type PlanStepRow = Database["public"]["Tables"]["plan_steps"]["Row"];

async function resolveTenantIdForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId?: string | null,
): Promise<string> {
  if (tenantId) return tenantId;

  const { data } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  return data?.tenant_id ?? DEFAULT_TENANT_ID;
}

async function resolveProgramIdForPlan(
  supabase: SupabaseClient<Database>,
  planId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("enablement_program_segments")
    .select("program_id")
    .eq("plan_id", planId)
    .maybeSingle();
  return data?.program_id ?? null;
}

export async function assignPlanToUser(
  supabase: SupabaseClient<Database>,
  params: {
    planId: string;
    userId: string;
    mentorId: string | null;
    assignedBy: string;
    startDate: string;
    targetCompletion: string | null;
    tenantId?: string | null;
  },
) {
  const tenantId = await resolveTenantIdForUser(supabase, params.userId, params.tenantId);

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
      program_id: await resolveProgramIdForPlan(supabase, params.planId),
      tenant_id: tenantId,
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
