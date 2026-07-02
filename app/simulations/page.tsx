import { Bot, Library, Route } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/demo-data";

export default function SimulationsPage() {
  const data = getDashboardData("alex");
  const assignment = data.simulations.find((simulation) => simulation.assignedTo === "alex") ?? data.simulations[0];

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <Badge tone="blue">Simulation practice</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Persona-based role-play with structured coaching</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Assign vertical personas, run multi-turn practice, generate coaching cards, collect SE reflection, and route manager review into the progress timeline.
          </p>
        </section>

        <SimulationWorkspace assignment={assignment} />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-blue-600" />
                Assignment library
              </CardTitle>
              <CardDescription>Reusable templates can import Matt&apos;s existing high-quality prompts.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {data.simulations.map((simulation) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={simulation.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{simulation.persona}</p>
                      <p className="mt-1 text-xs text-slate-500">{simulation.vertical} • {simulation.solutionFocus}</p>
                    </div>
                    <StatusBadge status={simulation.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                Coaching history
              </CardTitle>
              <CardDescription>Manager-visible simulation outcomes and next recommended practice.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.coachingCards.map((card) => {
                const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
                const owner = data.profiles.find((profile) => profile.id === card.userId);

                return (
                  <div className="rounded-2xl border border-slate-200 p-4" key={card.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{simulation?.persona ?? "Simulation"}</p>
                        <p className="mt-1 text-xs text-slate-500">{owner?.fullName} • score {card.score}</p>
                      </div>
                      <Badge tone={card.managerReviewStatus === "reviewed" ? "green" : "amber"}>
                        {card.managerReviewStatus}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{card.recommendedImprovements[0]}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Simulation routing</CardTitle>
              <CardDescription className="mt-2">
                Completed sessions create `coaching_cards`, notify the assigned manager, and log `simulation_completed` plus `coaching_card_reviewed` events for hierarchy dashboards.
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
