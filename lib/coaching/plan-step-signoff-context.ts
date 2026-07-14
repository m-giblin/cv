import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseAdHocStepId } from "@/lib/plans/ad-hoc-steps";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";

export async function resolvePlanStepSignoffContext(
  supabase: SupabaseClient<Database>,
  stepId: string,
): Promise<{ seUserId: string; isManagerGate: boolean } | null> {
  const adHocId = parseAdHocStepId(stepId);
  if (adHocId) {
    const { data: row } = await supabase
      .from("plan_ad_hoc_steps")
      .select("is_manager_gate, assignment_id")
      .eq("id", adHocId)
      .maybeSingle();
    if (!row) return null;
    const { data: assignment } = await supabase
      .from("plan_assignments")
      .select("user_id")
      .eq("id", row.assignment_id)
      .maybeSingle();
    if (!assignment) return null;
    return { seUserId: assignment.user_id, isManagerGate: row.is_manager_gate };
  }

  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("assignment_id, plan_step_id")
    .eq("id", stepId)
    .maybeSingle();
  if (!step) return null;

  const [{ data: assignment }, { data: planStep }] = await Promise.all([
    supabase.from("plan_assignments").select("user_id").eq("id", step.assignment_id).maybeSingle(),
    supabase.from("plan_steps").select("metadata, sort_order").eq("id", step.plan_step_id).maybeSingle(),
  ]);

  if (!assignment) return null;
  const meta = parsePlanStepMetadata(planStep?.metadata ?? null, planStep?.sort_order ?? 1);
  return { seUserId: assignment.user_id, isManagerGate: meta.isSegmentGate ?? false };
}
