import {
  Bot,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity-feed";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/demo-data";

export default function DashboardPage() {
  const data = getDashboardData("alex");
  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const myActivity = data.activity.filter((item) => item.userId === data.currentUser.id);
  const coachingCards = data.coachingCards.filter((card) => card.userId === data.currentUser.id);
  const openSimulation = data.simulations.find((simulation) => simulation.assignedTo === data.currentUser.id);
  const submittedChallenges = data.submissions.filter((submission) => submission.userId === data.currentUser.id);

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white md:flex-row md:items-center">
          <div>
            <Badge tone="blue">Personal dashboard</Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome back, {data.currentUser.fullName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Track your onboarding plan, complete deliberate practice, and route coaching cards to your manager without extra admin work.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/challenges">Generate Challenge</Link>
            </Button>
            <Button asChild className="border border-white/20 bg-white/10 hover:bg-white/20">
              <Link href="/simulations">Start Simulation</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={TrendingUp} label="Plan progress" value={`${plan?.progress ?? 0}%`} helper="Across current onboarding plan" />
          <MetricCard icon={BrainCircuit} label="Challenges" value={`${submittedChallenges.length}`} helper="Submitted or under review" />
          <MetricCard icon={Bot} label="Simulations" value={openSimulation ? "1 open" : "0 open"} helper={openSimulation?.persona ?? "No active assignment"} />
          <MetricCard icon={MessageSquareText} label="Coaching cards" value={`${coachingCards.length}`} helper="Manager-visible practice signal" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>{plan?.name ?? "No active plan"}</CardTitle>
              <CardDescription>
                Mentor-supported onboarding path with automatic progress roll-up to your manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Target completion: {plan?.targetCompletion ?? "Not set"}</span>
                  <span className="font-semibold text-slate-950">{plan?.progress ?? 0}%</span>
                </div>
                <Progress value={plan?.progress ?? 0} />
              </div>
              <div className="mt-6 space-y-3">
                {plan?.steps.map((step) => (
                  <div className="rounded-2xl border border-slate-200 p-4" key={step.id}>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{step.order}. {step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                      </div>
                      <StatusBadge status={step.status} />
                    </div>
                    {step.dueDate ? (
                      <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Due {step.dueDate}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Practice queue</CardTitle>
                <CardDescription>High-signal work items ready for action.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.challenges.slice(0, 2).map((challenge) => (
                    <div className="rounded-2xl bg-slate-50 p-4" key={challenge.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{challenge.title}</p>
                        <Badge tone={challenge.isAiGenerated ? "purple" : "slate"}>{challenge.isAiGenerated ? "AI" : "Curated"}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{challenge.estimatedMinutes} min • {challenge.linkedSolutions.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Timeline events visible to your management chain.</CardDescription>
              </CardHeader>
              <ActivityFeed activity={myActivity} profiles={data.profiles} />
            </Card>
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                <CardTitle>Latest coaching cards</CardTitle>
              </div>
              <CardDescription>Structured simulation feedback for reflection and manager review.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              {coachingCards.map((card) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={card.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-950">Score {card.score}</p>
                    <Badge tone={card.managerReviewStatus === "reviewed" ? "green" : "amber"}>
                      {card.managerReviewStatus}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">Strengths</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-500">
                    {card.strengths.map((strength) => <li key={strength}>{strength}</li>)}
                  </ul>
                  <p className="mt-3 text-sm font-medium text-slate-700">Next improvement</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{card.recommendedImprovements[0]}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
