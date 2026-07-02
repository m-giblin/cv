import Link from "next/link";
import { Bot, Library, Route } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { PageHeader } from "@/components/page-hero";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";

type SimulationsPageProps = {
  searchParams: Promise<{ focus?: string; step?: string; template?: string }>;
};

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const { data, source, tier } = await requireAppAccess("/simulations");
  const params = await searchParams;
  const isFocused = params.focus === "simulation";
  const { assignment, isPractice } = resolveSimulationAssignment(data.simulations, data.currentUser.id);

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHeader
          description={
            tier === "se"
              ? "Practice with a customer persona, get a coaching card, and share results with your manager."
              : "Assign vertical personas, run multi-turn practice, generate coaching cards, collect SE reflection, and route manager review into the progress timeline."
          }
          eyebrow="Simulation practice"
          title={tier === "se" ? "Your role-play practice" : "Persona-based role-play with structured coaching"}
        />

        {tier !== "se" ? (
          <Card className="border-sp-blue/20 bg-sp-blue-soft/20">
            <CardHeader>
              <CardTitle>Assign simulations to your team</CardTitle>
              <CardDescription>
                Managers select prompt templates and assign SEs on the{" "}
                <Link className="font-semibold text-sp-blue hover:text-sp-blue-deep" href="/manager#assign-simulations">
                  Manager home → Assign simulation
                </Link>{" "}
                panel (searchable template table + overrides).
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {tier === "se" ? (
          <div
            className={`overflow-hidden rounded-3xl border border-sp-blue/10 bg-white shadow-sm ${
              isFocused ? "ring-2 ring-sp-magenta/30" : ""
            }`}
          >
            {isPractice ? (
              <div className="border-b border-sp-blue/10 bg-sp-blue-soft/40 px-5 py-3">
                <p className="text-sm text-sp-navy-muted">
                  <span className="font-semibold text-sp-navy">Practice mode</span> — SLED roleplay with AIS / SLED / Medium defaults.
                  Your manager can assign a custom Solution, Vertical, and Difficulty.
                </p>
              </div>
            ) : null}
            <div className="p-4 sm:p-6">
              <SimulationWorkspace assignment={assignment} userLevel={profileLevelLabel(data.currentUser)} />
            </div>
          </div>
        ) : (
          <div className={isFocused ? "rounded-3xl ring-2 ring-sp-magenta/30" : undefined}>
            <SimulationWorkspace assignment={assignment} userLevel={profileLevelLabel(data.currentUser)} />
          </div>
        )}

        {tier === "se" ? (
          data.coachingCards.filter((card) => card.userId === data.currentUser.id).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-sp-magenta" />
                  Your coaching history
                </CardTitle>
                <CardDescription>Past simulation scores and manager review status.</CardDescription>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.coachingCards
                  .filter((card) => card.userId === data.currentUser.id)
                  .map((card) => {
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
                                  : card.managerReviewStatus === "needs_revision"
                                    ? "amber"
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
                        {card.recommendedImprovements[0] ? (
                          <p className="mt-3 text-sm leading-6 text-sp-navy-muted">{card.recommendedImprovements[0]}</p>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </Card>
          ) : null
        ) : (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-sp-blue" />
                Assignment library
              </CardTitle>
              <CardDescription>Reusable templates can import existing high-quality prompts.</CardDescription>
            </CardHeader>
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-sp-magenta" />
                Coaching history
              </CardTitle>
              <CardDescription>Manager-visible simulation outcomes and next recommended practice.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.coachingCards.map((card) => {
                const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
                const owner = data.profiles.find((profile) => profile.id === card.userId);

                return (
                  <div className="rounded-2xl border border-sp-magenta/10 bg-sp-magenta-soft/20 p-4" key={card.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-sp-navy">{simulation?.persona ?? "Simulation"}</p>
                        <p className="mt-1 text-xs text-sp-navy-muted">
                          {owner?.fullName} • score {card.score}
                        </p>
                      </div>
                      <Badge
                        tone={
                          card.managerReviewStatus === "reviewed"
                            ? "green"
                            : card.managerReviewStatus === "needs_revision"
                              ? "amber"
                              : "amber"
                        }
                      >
                        {card.managerReviewStatus === "needs_revision"
                          ? "Needs revision"
                          : card.managerReviewStatus}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-sp-navy-muted">{card.recommendedImprovements[0]}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
        )}

        {tier !== "se" ? (
        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-sp-blue-soft p-3 text-sp-blue">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Simulation routing</CardTitle>
              <CardDescription className="mt-2">
                Completed sessions create coaching cards, notify the assigned manager, and log simulation events for hierarchy dashboards.
              </CardDescription>
            </div>
          </div>
        </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
