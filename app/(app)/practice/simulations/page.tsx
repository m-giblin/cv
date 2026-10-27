import { redirect } from "next/navigation";
import { SpacedReinforcementRedirect } from "@/components/practice/spaced-reinforcement-redirect";
import { SimulationsShell } from "@/components/simulation/simulations-shell";
import { requireSimulationsPageAccess } from "@/lib/auth/require-access";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";
import {
  ensureTemplateAssignment,
  reusableAssignmentId,
  templateIdForPlanStep,
} from "@/lib/simulations/start-linked-simulation";
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
      redirect(`/practice/simulations?assignment=${opened}`);
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
  const { assignment } = resolved;

  const isSe = tier === "se";
  const testMode = tier === "admin" && params.test === "1";

  return (
    <>
      {isSe && params.autoAssign === "1" ? (
        <SpacedReinforcementRedirect autoAssign competency={params.reinforce} />
      ) : null}
      <SimulationsShell
        assignment={assignment}
        key={assignment.id}
        testMode={testMode}
        tier={tier}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </>
  );
}
