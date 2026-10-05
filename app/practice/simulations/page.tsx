import { AppShell } from "@/components/app-shell";
import { SpacedReinforcementRedirect } from "@/components/practice/spaced-reinforcement-redirect";
import { SimulationsShell } from "@/components/simulation/simulations-shell";
import { requireSimulationsPageAccess } from "@/lib/auth/require-access";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";
import { profileLevelLabel } from "@/lib/utils/level-label";

type SimulationsPageProps = {
  searchParams: Promise<{
    assignment?: string;
    reinforce?: string;
    autoAssign?: string;
    test?: string;
  }>;
};

export const metadata = { title: "Simulations · Practice" };

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const { data, tier } = await requireSimulationsPageAccess();
  const params = await searchParams;
  const { assignment } = resolveSimulationAssignment(
    data.simulations,
    data.currentUser.id,
    params.assignment,
  );

  const isSe = tier === "se";
  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      {isSe && params.autoAssign === "1" ? (
        <SpacedReinforcementRedirect autoAssign competency={params.reinforce} />
      ) : null}
      <SimulationsShell
        assignment={assignment}
        testMode={testMode}
        tier={tier}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </AppShell>
  );
}
