import type { SupabaseClient } from "@supabase/supabase-js";
import { isDraftSimulationPrompt } from "@/lib/admin/practice-library";
import type { Database } from "@/lib/database.types";
import {
  buildPromptSnapshot,
  buildPromptVars,
  isParameterizedTemplate,
  resolveSimulationStartMessage,
} from "@/lib/simulations/prompt-template";
import type { SimulationAssignment } from "@/lib/types";

const OPEN_STATUSES = ["not_started", "in_progress"] as const;

/** An assignment the learner can resume for this template, preferring one already in progress. */
export function reusableAssignmentId(
  simulations: Pick<SimulationAssignment, "id" | "assignedTo" | "templateId" | "status">[],
  userId: string,
  templateId: string,
): string | null {
  const open = simulations.filter(
    (simulation) =>
      simulation.assignedTo === userId &&
      simulation.templateId === templateId &&
      (simulation.status === "not_started" || simulation.status === "in_progress"),
  );
  return open.find((simulation) => simulation.status === "in_progress")?.id ?? open[0]?.id ?? null;
}

/**
 * Opens the simulation a ramp step points at. Reuses an open assignment for that template,
 * otherwise creates one from the template so Start does not fall through to another scenario.
 */
export async function ensureTemplateAssignment(
  supabase: SupabaseClient<Database>,
  params: { userId: string; templateId: string },
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("simulation_assignments")
    .select("id, status")
    .eq("assigned_to", params.userId)
    .eq("template_id", params.templateId)
    .in("status", [...OPEN_STATUSES])
    .limit(5);

  const rows = existing ?? [];
  const inProgress = rows.find((row) => row.status === "in_progress");
  if (inProgress) return inProgress.id;
  if (rows[0]) return rows[0].id;

  const { data: template } = await supabase
    .from("simulation_templates")
    .select(
      "id, name, persona, vertical, solution_focus, difficulty, prompt_body, practice_rounds_before_submit, tenant_id",
    )
    .eq("id", params.templateId)
    .maybeSingle();

  if (!template || isDraftSimulationPrompt(template.prompt_body)) return null;

  const promptBody = isParameterizedTemplate(template.prompt_body)
    ? buildPromptSnapshot(
        template.prompt_body,
        buildPromptVars({
          solutionFocus: template.solution_focus,
          vertical: template.vertical,
          difficulty: template.difficulty,
        }),
      )
    : template.prompt_body;

  const { data: created, error } = await supabase
    .from("simulation_assignments")
    .insert({
      template_id: template.id,
      assigned_to: params.userId,
      assigned_by: params.userId,
      persona: template.persona,
      vertical: template.vertical,
      solution_focus: template.solution_focus,
      difficulty: template.difficulty,
      status: "not_started",
      transcript: [],
      tenant_id: template.tenant_id,
      session_data: {
        promptSnapshot: promptBody,
        aiRoleplay: true,
        simulationKind: "ai_roleplay",
        startMessage: resolveSimulationStartMessage(template.name, promptBody),
        practiceRoundsRequired: template.practice_rounds_before_submit ?? 1,
        practiceRoundsCompleted: 0,
      },
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
