import { redirect } from "next/navigation";
import { SpacedReinforcementRedirect } from "@/components/practice/spaced-reinforcement-redirect";
import { SimulationsShell } from "@/components/simulation/simulations-shell";
import { requireSimulationsPageAccess } from "@/lib/auth/require-access";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";
import { ensureTemplateAssignment, reusableAssignmentId } from "@/lib/simulations/start-linked-simulation";
import { createClient } from "@/lib/supabase/server";
import { profileLevelLabel } from "@/lib/utils/level-label";

type SimulationsPageProps = {
  searchParams: Promise<{
    assignment?: string;
    template?: string;
    reinforce?: string;
    autoAssign?: string;
    test?: string;
  }>;
};

export const metadata = { title: "Simulations · Practice" };

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const { data, tier } = await requireSimulationsPageAccess();
  const params = await searchParams;
  const templateId = params.template?.trim() ?? "";
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
  const { assignment } = resolveSimulationAssignment(
    data.simulations,
    data.currentUser.id,
    focusAssignmentId,
  );

  const isSe = tier === "se";
  const testMode = tier === "admin" && params.test === "1";

  return (
    <>
      {isSe && params.autoAssign === "1" ? (
        <SpacedReinforcementRedirect autoAssign competency={params.reinforce} />
      ) : null}
      <SimulationsShell
        assignment={assignment}
        testMode={testMode}
        tier={tier}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </>
  );
}
