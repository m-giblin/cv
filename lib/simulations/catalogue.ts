import type { SupabaseClient } from "@supabase/supabase-js";
import { isDraftSimulationPrompt, parseSimPrompt } from "@/lib/admin/practice-library";
import type { Database } from "@/lib/database.types";
import { OBJECTION_DRILL_MARKER } from "@/lib/playbooks/drills";
import { isElevatorPitchTemplate, type SimulationDifficulty } from "@/lib/simulations/prompt-template";
import type { AssignmentStatus, SimulationAssignment } from "@/lib/types";

export type ScenarioKind = "Scenario" | "Roleplay" | "Elevator pitch" | "Objection drill";

export type CatalogueTemplate = {
  id: string;
  name: string;
  persona: string;
  vertical: string;
  difficulty: SimulationDifficulty;
  kind: ScenarioKind;
  competency: string | null;
};

export type RampSimulationStep = {
  stepId: string;
  title: string;
  templateId: string | null;
  sortOrder: number;
  status: AssignmentStatus | null;
  dueDate: string | null;
};

export type CatalogueEntry = {
  key: string;
  title: string;
  detail: string;
  href: string;
  /** "Not started", "In progress", "Done". */
  status: "Not started" | "In progress" | "Done";
  dueDate?: string | null;
  tags: string[];
};

export type SimulationCatalogue = {
  ramp: CatalogueEntry[];
  assigned: CatalogueEntry[];
  inProgress: CatalogueEntry[];
  browse: Array<{ difficulty: SimulationDifficulty; label: string; blurb: string; entries: CatalogueEntry[] }>;
};

const OPEN: AssignmentStatus[] = ["not_started", "in_progress"];
const DONE: AssignmentStatus[] = ["submitted", "under_review", "reviewed", "completed"];

const DIFFICULTY_GROUPS: Array<{ difficulty: SimulationDifficulty; label: string; blurb: string }> = [
  { difficulty: "foundational", label: "Foundational", blurb: "Start here. Patient buyers, plain language, one idea per scenario." },
  { difficulty: "intermediate", label: "Intermediate", blurb: "Skeptical buyers with competing vendors and a few objections." },
  { difficulty: "advanced", label: "Advanced", blurb: "Hostile buyers, surprises mid-call, and value you have to earn." },
];

/** Plain-language scenarios first; they are what a new hire's ramp links to. */
const KIND_ORDER: ScenarioKind[] = ["Scenario", "Elevator pitch", "Roleplay", "Objection drill"];

export function scenarioKind(template: { name: string; persona: string; promptBody: string }): ScenarioKind {
  if (template.promptBody.includes(OBJECTION_DRILL_MARKER) || /objection/i.test(`${template.name} ${template.persona}`)) {
    return "Objection drill";
  }
  if (isElevatorPitchTemplate(template.promptBody) || /elevator pitch/i.test(template.name)) return "Elevator pitch";
  if (template.promptBody.includes("STEP 1 — PERSONA CARD") || template.promptBody.includes("{{solution}}")) return "Roleplay";
  return "Scenario";
}

/** "Dynamic (AI-generated buyer)" reads as noise in a list; the template name says enough. */
function personaLine(persona: string) {
  return /^dynamic\b/i.test(persona) ? "AI-generated buyer" : persona;
}

function statusLabel(status: AssignmentStatus | null | undefined): CatalogueEntry["status"] {
  if (status && DONE.includes(status)) return "Done";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function sessionHref(params: Record<string, string>, testMode: boolean) {
  const query = new URLSearchParams(params);
  if (testMode) query.set("test", "1");
  return `/practice/simulations?${query.toString()}`;
}

/**
 * The Simulations landing page: the person's ramp steps, what others assigned them, what they
 * started themselves, then every scenario they can open, easiest first.
 */
export function buildSimulationCatalogue(input: {
  userId: string;
  simulations: Pick<SimulationAssignment, "id" | "assignedTo" | "assignedBy" | "persona" | "vertical" | "status" | "templateId">[];
  templates: CatalogueTemplate[];
  rampSteps: RampSimulationStep[];
  assignerNames?: Record<string, string>;
  testMode?: boolean;
}): SimulationCatalogue {
  const testMode = input.testMode ?? false;
  const templateById = new Map(input.templates.map((template) => [template.id, template]));
  const mine = input.simulations.filter((simulation) => simulation.assignedTo === input.userId);
  const open = mine.filter((simulation) => OPEN.includes(simulation.status));
  const openFor = (templateId: string | null) =>
    templateId ? open.filter((simulation) => simulation.templateId === templateId) : [];

  const ramp = [...input.rampSteps]
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.sortOrder - b.sortOrder)
    .map((step): CatalogueEntry => {
      const template = step.templateId ? templateById.get(step.templateId) : undefined;
      const running = openFor(step.templateId).some((simulation) => simulation.status === "in_progress");
      const status = statusLabel(step.status && step.status !== "not_started" ? step.status : running ? "in_progress" : null);
      return {
        key: `step-${step.stepId}`,
        title: step.title,
        detail: template ? personaLine(template.persona) : "Simulation step on your ramp",
        href: sessionHref(step.templateId ? { step: step.stepId, template: step.templateId } : { step: step.stepId }, testMode),
        status,
        dueDate: step.dueDate,
        tags: template ? [template.kind, template.competency].filter((tag): tag is string => Boolean(tag)) : [],
      };
    });
  const rampTemplates = new Set(input.rampSteps.map((step) => step.templateId).filter(Boolean));

  const toEntry = (simulation: (typeof open)[number], detail: string): CatalogueEntry => {
    const template = simulation.templateId ? templateById.get(simulation.templateId) : undefined;
    return {
      key: `sim-${simulation.id}`,
      title: template?.name ?? [personaLine(simulation.persona), simulation.vertical].filter(Boolean).join(", "),
      detail,
      href: sessionHref({ assignment: simulation.id }, testMode),
      status: statusLabel(simulation.status),
      tags: template ? [template.kind, template.competency].filter((tag): tag is string => Boolean(tag)) : [],
    };
  };
  const byProgress = (a: (typeof open)[number], b: (typeof open)[number]) =>
    Number(b.status === "in_progress") - Number(a.status === "in_progress");

  const assigned = open
    .filter((simulation) => simulation.assignedBy !== input.userId)
    .sort(byProgress)
    .map((simulation) => {
      const name = input.assignerNames?.[simulation.assignedBy];
      return toEntry(simulation, name ? `Assigned by ${name}` : "Assigned to you");
    });

  const inProgress = open
    .filter((simulation) => simulation.assignedBy === input.userId && !rampTemplates.has(simulation.templateId ?? ""))
    .sort(byProgress)
    .map((simulation) => toEntry(simulation, "Started by you"));

  const browse = DIFFICULTY_GROUPS.map((group) => ({
    ...group,
    entries: input.templates
      .filter((template) => template.difficulty === group.difficulty)
      .sort(
        (a, b) =>
          KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name),
      )
      .map((template): CatalogueEntry => {
        const running = openFor(template.id);
        return {
          key: `template-${template.id}`,
          title: template.name,
          detail: [personaLine(template.persona), template.vertical].filter(Boolean).join(", "),
          href: sessionHref({ template: template.id }, testMode),
          status: statusLabel(running.find((simulation) => simulation.status === "in_progress")?.status ?? null),
          tags: [template.kind, template.competency].filter((tag): tag is string => Boolean(tag)),
        };
      }),
  })).filter((group) => group.entries.length > 0);

  return { ramp, assigned, inProgress, browse };
}

/** Loads what the catalogue needs with the signed-in user's client, so RLS scopes it to their tenant. */
export async function loadSimulationCatalogueInputs(
  supabase: SupabaseClient<Database>,
  params: { userId: string; tenantId: string | null; assignerIds: string[] },
): Promise<{ templates: CatalogueTemplate[]; rampSteps: RampSimulationStep[]; assignerNames: Record<string, string> }> {
  const templatesQuery = supabase
    .from("simulation_templates")
    .select("id, name, persona, vertical, difficulty, prompt_body, tenant_id")
    .order("name");
  const [templatesResult, plansResult, assignersResult] = await Promise.all([
    params.tenantId ? templatesQuery.or(`tenant_id.eq.${params.tenantId},tenant_id.is.null`) : templatesQuery,
    supabase.from("plan_assignments").select("id, plan_id").eq("user_id", params.userId),
    params.assignerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", params.assignerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);

  const templates: CatalogueTemplate[] = (templatesResult.data ?? [])
    .filter((row) => !isDraftSimulationPrompt(row.prompt_body))
    .map((row) => ({
      id: row.id,
      name: row.name,
      persona: row.persona,
      vertical: row.vertical,
      difficulty: row.difficulty,
      kind: scenarioKind({ name: row.name, persona: row.persona, promptBody: row.prompt_body }),
      competency: parseSimPrompt(row.prompt_body).competency,
    }));

  const plans = plansResult.data ?? [];
  let rampSteps: RampSimulationStep[] = [];
  if (plans.length) {
    const { data: steps } = await supabase
      .from("plan_steps")
      .select("id, plan_id, title, sort_order, simulation_template_id")
      .in("plan_id", [...new Set(plans.map((plan) => plan.plan_id))])
      .eq("step_type", "simulation");
    const { data: progress } = steps?.length
      ? await supabase
          .from("plan_assignment_steps")
          .select("plan_step_id, status, due_date")
          .in("assignment_id", plans.map((plan) => plan.id))
          .in("plan_step_id", steps.map((step) => step.id))
      : { data: [] };
    const progressByStep = new Map((progress ?? []).map((row) => [row.plan_step_id, row]));
    rampSteps = (steps ?? []).map((step) => ({
      stepId: step.id,
      title: step.title,
      templateId: step.simulation_template_id,
      sortOrder: step.sort_order,
      status: progressByStep.get(step.id)?.status ?? null,
      dueDate: progressByStep.get(step.id)?.due_date ?? null,
    }));
  }

  const assignerNames = Object.fromEntries(
    (assignersResult.data ?? [])
      .filter((row) => row.full_name)
      .map((row) => [row.id, row.full_name!.split(" ")[0]!]),
  );

  return { templates, rampSteps, assignerNames };
}
