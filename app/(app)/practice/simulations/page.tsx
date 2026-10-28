import { redirect } from "next/navigation";
import { SpacedReinforcementRedirect } from "@/components/practice/spaced-reinforcement-redirect";
import { SimulationCatalogue } from "@/components/simulation/simulation-catalogue";
import { SimulationsShell } from "@/components/simulation/simulations-shell";
import { requireSimulationsPageAccess } from "@/lib/auth/require-access";
import { findActiveMentor } from "@/lib/mentoring/share-with-mentor";
import { buildSimulationCatalogue, loadSimulationCatalogueInputs } from "@/lib/simulations/catalogue";
import { assignmentForSession } from "@/lib/simulations/persona-card";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";
import {
  ensureTemplateAssignment,
  reusableAssignmentId,
  templateIdForPlanStep,
} from "@/lib/simulations/start-linked-simulation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { profileLevelLabel } from "@/lib/utils/level-label";

type SimulationsPageProps = {
  searchParams: Promise<{
    assignment?: string;
    template?: string;
    step?: string;
    reinforce?: string;
    autoAssign?: string;
    test?: string;
  }>;
};

export const metadata = { title: "Simulations · Practice" };

/**
 * The SE's mentor, when this is free practice they can share with them. A simulation on their own
 * ramp is submitted to the step instead, so it returns null there (and when they have no mentor).
 */
async function mentorForFreePractice(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  templateId: string | null | undefined,
) {
  const admin = createAdminClient();
  if (!admin) return null;
  const [mentor, { data: plans }] = await Promise.all([
    findActiveMentor(admin, userId),
    templateId
      ? supabase.from("plan_assignments").select("plan_id").eq("user_id", userId).neq("status", "completed")
      : Promise.resolve({ data: [] as Array<{ plan_id: string }> }),
  ]);
  if (!mentor) return null;
  if (templateId && plans?.length) {
    const { count } = await supabase
      .from("plan_steps")
      .select("id", { count: "exact", head: true })
      .in("plan_id", plans.map((plan) => plan.plan_id))
      .eq("simulation_template_id", templateId);
    if (count) return null;
  }
  return mentor.mentorName;
}

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const { data, tier } = await requireSimulationsPageAccess();
  const params = await searchParams;
  let templateId = params.template?.trim() ?? "";
  const stepId = params.step?.trim() ?? "";
  if (!templateId && stepId) {
    const supabase = await createClient();
    templateId = supabase ? ((await templateIdForPlanStep(supabase, stepId)) ?? "") : "";
    if (!templateId) {
      return (
        <p className="m-[var(--gutter)] text-sm text-muted" role="status">
          This ramp step is not linked to a simulation.
        </p>
      );
    }
  }
  const isSe = tier === "se";
  const testMode = tier === "admin" && params.test === "1";
  const reinforcement =
    isSe && params.autoAssign === "1" ? <SpacedReinforcementRedirect autoAssign competency={params.reinforce} /> : null;

  // No scenario named: show the catalogue rather than dropping into someone else's default roleplay.
  if (!templateId && !params.assignment?.trim()) {
    const userId = data.currentUser.id;
    const supabase = await createClient();
    const assignerIds = [
      ...new Set(
        data.simulations
          .filter((simulation) => simulation.assignedTo === userId && simulation.assignedBy !== userId && simulation.assignedBy !== "system")
          .map((simulation) => simulation.assignedBy),
      ),
    ];
    const inputs = supabase
      ? await loadSimulationCatalogueInputs(supabase, { userId, tenantId: data.currentUser.tenantId ?? null, assignerIds })
      : { templates: [], rampSteps: [], assignerNames: {} };
    const catalogue = buildSimulationCatalogue({ userId, simulations: data.simulations, testMode, ...inputs });
    return (
      <>
        {reinforcement}
        <SimulationCatalogue catalogue={catalogue} testMode={testMode} />
      </>
    );
  }

  let focusAssignmentId = params.assignment;
  if (templateId) {
    const reusable = reusableAssignmentId(data.simulations, data.currentUser.id, templateId);
    const supabase = reusable ? null : await createClient();
    const opened = reusable ?? (supabase ? await ensureTemplateAssignment(supabase, { userId: data.currentUser.id, templateId }) : null);
    if (!opened) {
      return (
        <p className="m-[var(--gutter)] text-sm text-muted" role="status">
          That simulation could not be opened. It may still be a draft.
        </p>
      );
    }
    if (params.assignment !== opened) {
      redirect(`/practice/simulations?assignment=${opened}${testMode ? "&test=1" : ""}`);
    }
    focusAssignmentId = opened;
  }
  const resolved = resolveSimulationAssignment(
    data.simulations,
    data.currentUser.id,
    focusAssignmentId,
  );
  if (!resolved.assignment) {
    return (
      <p className="m-[var(--gutter)] text-sm text-muted" role="status">
        That simulation is not assigned to you.
      </p>
    );
  }
  // The transcript is read here so the first persona message can lose its printed card before it renders.
  const supabase = await createClient();
  const { data: stored } = supabase
    ? await supabase.from("simulation_assignments").select("transcript").eq("id", resolved.assignment.id).maybeSingle()
    : { data: null };
  const assignment = assignmentForSession(
    resolved.assignment,
    Array.isArray(stored?.transcript) ? (stored.transcript as unknown as typeof resolved.assignment.transcript) : null,
  );
  const mentorName =
    supabase && assignment.assignedTo === data.currentUser.id
      ? await mentorForFreePractice(supabase, data.currentUser.id, assignment.templateId)
      : null;

  return (
    <>
      {reinforcement}
      <SimulationsShell
        assignment={assignment}
        key={assignment.id}
        mentorName={mentorName}
        testMode={testMode}
        tier={tier}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </>
  );
}
