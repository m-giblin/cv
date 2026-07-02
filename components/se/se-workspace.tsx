import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Mail,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CompetencyGapsCard } from "@/components/development/competency-gaps-card";
import { ActivityFeed } from "@/components/activity-feed";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardData, PlanStep } from "@/lib/types";
import type { CertNextAction } from "@/lib/se/cert-next-action";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";

function stepIsValidated(status: PlanStep["status"]) {
  return status === "reviewed";
}

function stepNeedsSeAction(status: PlanStep["status"]) {
  return status === "not_started" || status === "in_progress";
}

export function SeWorkspace({
  data,
  certNextAction,
}: {
  data: DashboardData;
  certNextAction?: CertNextAction | null;
}) {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const openSimulation = data.simulations.find((sim) => sim.assignedTo === userId);
  const actionSteps = plan?.steps.filter((step) => stepNeedsSeAction(step.status)) ?? [];
  const awaitingReview = plan?.steps.filter((step) => step.status === "submitted") ?? [];
  const nextStep = actionSteps[0];
  const openChallenge = data.challenges[0];
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);

  const needsRevisionCards = data.coachingCards.filter(
    (c) => c.userId === userId && c.managerReviewStatus === "needs_revision",
  );

  const feedbackCount =
    data.submissions.filter(
      (s) => s.userId === userId && (s.managerFeedback || s.managerGrade !== null) && s.status === "reviewed",
    ).length +
    data.coachingCards.filter(
      (c) => c.userId === userId && c.managerReviewStatus === "reviewed" && c.managerComments,
    ).length;

  const myActivity = data.activity.filter((item) => item.userId === userId).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Revision required — manager sent work back */}
      {needsRevisionCards.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-amber-950">Revision requested</p>
              <p className="mt-1 text-sm text-amber-900/80">
                Your manager sent work back — review their feedback, then redo and resubmit.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  needsRevisionCards.length > 0
                    ? "/simulations?focus=simulation"
                    : nextStep
                      ? planStepHref(nextStep)
                      : "/dashboard"
                }
              >
                Redo now
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Top bar — greeting + plan progress */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sp-blue">My workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-sp-navy sm:text-3xl">
            Hi {data.currentUser.fullName.split(" ")[0]} — here&apos;s what&apos;s next
          </h1>
          {plan ? (
            <p className="mt-1 text-sm text-sp-navy-muted">{plan.name}</p>
          ) : (
            <p className="mt-1 text-sm text-sp-navy-muted">Your enablement home base</p>
          )}
        </div>
        {plan ? (
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-sp-navy">Plan progress</span>
              <span className="font-bold text-sp-blue">{plan.progress}%</span>
            </div>
            <Progress className="mt-2" value={plan.progress} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Primary column — next action + full checklist */}
        <div className="space-y-6 xl:col-span-8">
          {/* Hero next-step card */}
          {nextStep ? (
            <Card className="overflow-hidden border-sp-blue/15 bg-gradient-to-br from-white via-sp-blue-soft/20 to-sp-magenta-soft/10">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <Badge tone="magenta">Do this now</Badge>
                    <h2 className="mt-3 text-xl font-bold text-sp-navy sm:text-2xl">{nextStep.title}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-sp-navy-muted">{nextStep.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <StatusBadge status={nextStep.status} />
                      {nextStep.dueDate ? (
                        <span className="inline-flex items-center gap-1 text-xs text-sp-navy-muted">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Due {nextStep.dueDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild className="shrink-0" size="lg">
                    <Link href={planStepHref(nextStep)}>{planStepActionLabel(nextStep)}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : awaitingReview.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="flex items-center gap-3 p-6">
                <StatusBadge status="submitted" />
                <div>
                  <p className="font-bold text-sp-navy">
                    {awaitingReview.length} step{awaitingReview.length === 1 ? "" : "s"} awaiting review
                  </p>
                  <p className="text-sm text-sp-navy-muted">
                    Your manager or mentor is validating your work. You&apos;ll be notified when approved or if you need
                    to try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : certNextAction ? (
            <Card className="overflow-hidden border-sp-magenta/15 bg-gradient-to-br from-white via-sp-magenta-soft/10 to-sp-blue-soft/20">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge tone="magenta">Field readiness</Badge>
                  <h2 className="mt-2 text-xl font-bold text-sp-navy">{certNextAction.label}</h2>
                  <p className="mt-1 text-sm text-sp-navy-muted">
                    Submit evidence for this certification gate and get manager sign-off.
                  </p>
                </div>
                <Button asChild className="shrink-0" size="lg" variant="magenta">
                  <Link href={certNextAction.href}>Submit evidence</Link>
                </Button>
              </CardContent>
            </Card>
          ) : plan && actionSteps.length === 0 && awaitingReview.length === 0 ? (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="flex items-center gap-3 p-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-bold text-sp-navy">All plan steps validated</p>
                  <p className="text-sm text-sp-navy-muted">Keep sharp with practice sims and your development goals.</p>
                </div>
              </CardContent>
            </Card>
          ) : !plan ? (
            <Card className="border-dashed border-sp-blue/25">
              <CardContent className="p-6 text-center">
                <p className="font-semibold text-sp-navy">No active onboarding plan yet</p>
                <p className="mt-2 text-sm text-sp-navy-muted">
                  Your manager assigns plans from the enablement team. Reach out to get started.
                </p>
                {manager ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-sp-blue">
                    <Mail className="h-4 w-4" />
                    Manager: {manager.fullName}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Full plan checklist */}
          {plan && plan.steps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Onboarding checklist</CardTitle>
                <CardDescription>
                  {actionSteps.length} step{actionSteps.length === 1 ? "" : "s"} need your action
                  {awaitingReview.length > 0
                    ? ` • ${awaitingReview.length} awaiting manager/mentor review`
                    : ""}
                </CardDescription>
              </CardHeader>
              <div className="space-y-1">
                {plan.steps
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => {
                    const validated = stepIsValidated(step.status);
                    const waiting = step.status === "submitted";
                    const isCurrent = step.id === nextStep?.id;

                    if (waiting) {
                      return (
                        <div
                          className="flex items-center gap-4 rounded-xl bg-amber-50/80 px-4 py-3"
                          key={step.id}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-sp-navy">{step.title}</p>
                            <p className="text-xs text-sp-navy-muted">Awaiting review</p>
                          </div>
                          <StatusBadge status={step.status} />
                        </div>
                      );
                    }

                    return (
                      <Link
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 transition ${
                          isCurrent
                            ? "bg-sp-magenta-soft/25 ring-1 ring-sp-magenta/20"
                            : validated
                              ? "opacity-60 hover:opacity-80"
                              : "hover:bg-sp-blue-soft/25"
                        }`}
                        href={planStepHref(step)}
                        key={step.id}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            validated
                              ? "bg-green-100 text-green-700"
                              : isCurrent
                                ? "bg-sp-magenta text-white"
                                : "bg-sp-blue-soft text-sp-blue"
                          }`}
                        >
                          {validated ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${
                              validated ? "line-through text-sp-navy-muted" : "text-sp-navy"
                            }`}
                          >
                            {step.title}
                          </p>
                          {step.dueDate && !validated ? (
                            <p className="text-xs text-sp-navy-muted">Due {step.dueDate}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={step.status} />
                      </Link>
                    );
                  })}
              </div>
            </Card>
          ) : null}

          <CompetencyGapsCard data={data} />
        </div>

        {/* Sidebar — quick actions + context */}
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Jump straight into practice</CardDescription>
            </CardHeader>
            <div className="grid gap-2">
              <Button asChild className="h-auto justify-start gap-3 px-4 py-3" variant="outline">
                <Link href={nextStep?.type === "challenge" ? planStepHref(nextStep) : "/challenges?focus=challenge"}>
                  <BrainCircuit className="h-5 w-5 shrink-0 text-sp-blue" />
                  <span className="text-left">
                    <span className="block font-bold">Practice a challenge</span>
                    <span className="block text-xs font-normal text-sp-navy-muted">
                      {openChallenge?.title ?? "Submit evidence for review"}
                    </span>
                  </span>
                </Link>
              </Button>
              <Button asChild className="h-auto justify-start gap-3 px-4 py-3" variant="outline">
                <Link href={nextStep?.type === "simulation" ? planStepHref(nextStep) : "/simulations?focus=simulation"}>
                  <Bot className="h-5 w-5 shrink-0 text-sp-magenta" />
                  <span className="text-left">
                    <span className="block font-bold">Run a simulation</span>
                    <span className="block text-xs font-normal text-sp-navy-muted">
                      {openSimulation?.persona ?? "Role-play + coaching card"}
                    </span>
                  </span>
                </Link>
              </Button>
              <Button asChild className="h-auto justify-start gap-3 px-4 py-3" variant="outline">
                <Link href="/prep">
                  <Sparkles className="h-5 w-5 shrink-0 text-sp-magenta" />
                  <span className="text-left">
                    <span className="block font-bold">Deal prep</span>
                    <span className="block text-xs font-normal text-sp-navy-muted">AI brief before a customer call</span>
                  </span>
                </Link>
              </Button>
              <Button asChild className="h-auto justify-start gap-3 px-4 py-3" variant="outline">
                <Link href="/growth">
                  <TrendingUp className="h-5 w-5 shrink-0 text-sp-blue" />
                  <span className="text-left">
                    <span className="block font-bold">My growth</span>
                    <span className="block text-xs font-normal text-sp-navy-muted">Career map + practice cadence</span>
                  </span>
                </Link>
              </Button>
            </div>
          </Card>

          {feedbackCount > 0 ? (
            <Card className="border-sp-magenta/20 bg-sp-magenta-soft/10">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-sp-magenta" />
                  <div>
                    <p className="text-sm font-bold text-sp-navy">Manager feedback</p>
                    <p className="text-xs text-sp-navy-muted">{feedbackCount} review{feedbackCount === 1 ? "" : "s"} waiting</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="magenta">
                  <Link href="/feedback">View</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {manager ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sp-blue-soft text-sm font-bold text-sp-blue">
                  {manager.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-sp-navy-muted">Your manager</p>
                  <p className="text-sm font-bold text-sp-navy">{manager.fullName}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {myActivity.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <ActivityFeed activity={myActivity} profiles={data.profiles} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
