import { Bot, ChevronRight, Library, Route } from "lucide-react";
import { MobilePracticeBanner } from "@/components/practice/mobile-practice-banner";
import { AppShell } from "@/components/app-shell";
import { HandoffCard } from "@/components/dashboard/handoff-practice-layout";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";
import { GapPracticePanel } from "@/components/practice/gap-practice-panel";
import { SpacedReinforcementRedirect } from "@/components/practice/spaced-reinforcement-redirect";
import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";

type SimulationsPageProps = {
  searchParams: Promise<{
    focus?: string;
    step?: string;
    template?: string;
    assignment?: string;
    reinforce?: string;
    autoAssign?: string;
  }>;
};

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const { data, tier } = await requireAppAccess("/simulations");
  const params = await searchParams;
  const isFocused = params.focus === "simulation";
  const { assignment, isPractice } = resolveSimulationAssignment(
    data.simulations,
    data.currentUser.id,
    params.assignment,
  );

  const myCoachingCards =
    tier === "se" ? data.coachingCards.filter((card) => card.userId === data.currentUser.id) : data.coachingCards;

  const gapRecommendations =
    tier === "se"
      ? recommendChallengesForGaps(
          data,
          data.currentUser.id,
          new Set(
            data.submissions
              .filter((s) => s.userId === data.currentUser.id && s.status === "reviewed")
              .map((s) => s.challengeId),
          ),
          2,
        )
      : [];

  const isSe = tier === "se";

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <MobilePracticeBanner />
      <SEPageLayout
        eyebrow="Practice · AI roleplay"
        eyebrowColor="#cc27b0"
        subtitle={
          isSe
            ? "Three steps: roleplay → AI coaching feedback → submit to your manager."
            : "Run a live roleplay to preview the SE experience."
        }
        title={isSe ? "Simulations" : "Persona role-play"}
      >
        {isSe ? <GapPracticePanel recommendations={gapRecommendations} variant="simulations" /> : null}

        {isSe && params.autoAssign === "1" ? (
          <SpacedReinforcementRedirect autoAssign competency={params.reinforce} />
        ) : null}

        <HandoffCard
          accentLeft="#cc27b0"
          className={isFocused ? "ring-2 ring-[#cc27b0]/30" : undefined}
        >
          {isPractice ? (
            <div className="border-b border-sp-blue/10 bg-sp-blue-soft/40 px-5 py-2.5 text-sm text-sp-navy-muted">
              <span className="font-semibold text-sp-navy">Practice mode</span> — default SLED persona. Your manager can
              assign a custom scenario.
            </div>
          ) : null}
          <div className="p-4 sm:p-5">
            <SimulationWorkspace assignment={assignment} userLevel={profileLevelLabel(data.currentUser)} />
          </div>
        </HandoffCard>

        {isSe && myCoachingCards.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
            <div className="border-b border-[#f1f5f9] px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#0a1628]">
                <Route className="h-5 w-5 text-sp-magenta" />
                Past coaching scores
              </h2>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {myCoachingCards.map((card) => {
                const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
                return (
                  <div className="rounded-2xl border border-sp-magenta/10 bg-sp-magenta-soft/20 p-4" key={card.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-sp-navy">
                          {card.simulationContext?.persona ?? simulation?.persona ?? "Simulation"}
                        </p>
                        <p className="mt-1 text-xs text-sp-navy-muted">Score {card.score}</p>
                      </div>
                      <Badge
                        tone={
                          card.isPractice
                            ? "blue"
                            : card.managerReviewStatus === "reviewed"
                              ? "green"
                              : "amber"
                        }
                      >
                        {card.isPractice
                          ? "Practice"
                          : card.managerReviewStatus === "needs_revision"
                            ? "Needs revision"
                            : card.managerReviewStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {tier !== "se" ? (
          <details className="group rounded-2xl border border-sp-blue/15 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-sp-navy [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Library className="h-4 w-4 text-sp-blue" />
                Team assignments & coaching history
              </span>
              <ChevronRight className="h-4 w-4 text-stone-400 transition group-open:rotate-90" />
            </summary>
            <div className="space-y-6 border-t border-sp-blue/10 px-5 py-5">
              <div className="overflow-x-auto rounded-2xl border border-sp-blue/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Persona</th>
                      <th className="px-4 py-3 font-semibold">Solution</th>
                      <th className="px-4 py-3 font-semibold">Vertical</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.simulations.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sp-navy-muted" colSpan={4}>
                          No formal assignments yet.
                        </td>
                      </tr>
                    ) : (
                      data.simulations.map((simulation) => (
                        <tr className="border-b border-sp-blue/5" key={simulation.id}>
                          <td className="px-4 py-3 font-medium text-sp-navy">{simulation.persona}</td>
                          <td className="px-4 py-3 text-sp-navy-muted">{simulation.solutionFocus}</td>
                          <td className="px-4 py-3 text-sp-navy-muted">{simulation.vertical}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={simulation.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {myCoachingCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myCoachingCards.map((card) => {
                    const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
                    const owner = data.profiles.find((profile) => profile.id === card.userId);
                    return (
                      <div className="rounded-2xl border border-sp-magenta/10 bg-sp-magenta-soft/20 p-4" key={card.id}>
                        <p className="text-sm font-bold text-sp-navy">{simulation?.persona ?? "Simulation"}</p>
                        <p className="mt-1 text-xs text-sp-navy-muted">
                          {owner?.fullName} · score {card.score}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-sp-navy-muted">No coaching cards yet.</p>
              )}

              <p className="flex items-start gap-2 text-xs text-sp-navy-muted">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-sp-blue" />
                Completed sessions create coaching cards and notify managers automatically.
              </p>
            </div>
          </details>
        ) : null}
      </SEPageLayout>
    </AppShell>
  );
}
