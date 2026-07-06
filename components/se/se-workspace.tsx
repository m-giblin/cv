import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Mail,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { CompetencyGapsCard } from "@/components/development/competency-gaps-card";
import { PracticeFeedbackStrip } from "@/components/se/practice-feedback-strip";
import { RampWeekRunway } from "@/components/se/ramp-week-runway";
import { ShadowLogQuickCard } from "@/components/se/shadow-log-quick-card";
import { StatusBadge } from "@/components/status-badge";
import { DashboardData, PlanStep } from "@/lib/types";
import type { CertNextAction } from "@/lib/se/cert-next-action";
import { isNorthstarUiEnabled } from "@/lib/feature-flags";
import { currentRampWeek, rampWeekLabel } from "@/lib/plans/ramp-week";
import { doThisNowCopy, planStepTypeLabel } from "@/lib/plans/step-labels";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";
import { SeWorkspaceLegacy } from "@/components/se/se-workspace-legacy";

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
  if (!isNorthstarUiEnabled()) {
    return <SeWorkspaceLegacy certNextAction={certNextAction} data={data} />;
  }

  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const openSimulation = data.simulations.find((sim) => sim.assignedTo === userId);
  const actionSteps = plan?.steps.filter((step) => stepNeedsSeAction(step.status)) ?? [];
  const awaitingReview = plan?.steps.filter((step) => step.status === "submitted") ?? [];
  const nextStep = actionSteps[0];
  const validatedCount = plan?.steps.filter((s) => stepIsValidated(s.status)).length ?? 0;
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);

  const needsRevisionCards = data.coachingCards.filter(
    (c) => c.userId === userId && c.managerReviewStatus === "needs_revision",
  );

  const needsRevisionChallenges = data.submissions.filter(
    (s) => s.userId === userId && s.status === "in_progress" && Boolean(s.managerFeedback),
  );

  const needsRevision = needsRevisionCards.length > 0 || needsRevisionChallenges.length > 0;

  const simCards = data.coachingCards
    .filter((c) => c.userId === userId && !c.isPractice)
    .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime());

  const lastSim = simCards[0];
  const simAvg =
    simCards.length > 0
      ? Math.round(simCards.slice(0, 5).reduce((total, card) => total + card.score, 0) / Math.min(5, simCards.length))
      : null;

  const feedbackCount =
    data.submissions.filter(
      (s) => s.userId === userId && (s.managerFeedback || s.managerGrade !== null) && s.status === "reviewed",
    ).length +
    data.coachingCards.filter(
      (c) => c.userId === userId && c.managerReviewStatus === "reviewed" && c.managerComments,
    ).length;

  const myActivity = data.activity.filter((item) => item.userId === userId).slice(0, 5);

  const shadowStep =
    actionSteps.find((step) => step.type === "shadow_meeting_log") ??
    plan?.steps.find((step) => step.type === "shadow_meeting_log" && !stepIsValidated(step.status));

  const onboardingComplete =
    plan && actionSteps.length === 0 && awaitingReview.length === 0 && plan.steps.length > 0;

  const nowCopy = nextStep ? doThisNowCopy(nextStep) : null;
  const rampWeek = plan?.startDate ? currentRampWeek(plan.startDate) : null;

  return (
    <div className="space-y-5">
      {needsRevision ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-amber-950">Revision requested</p>
            <p className="text-sm text-amber-900/80">Review manager feedback, then redo and resubmit.</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 sm:mt-0">
            {needsRevisionCards.length > 0 ? (
              <Link className="text-sm font-semibold text-amber-950 underline" href="/simulations?focus=simulation">
                Redo simulation
              </Link>
            ) : null}
            {needsRevisionChallenges.length > 0 ? (
              <Link className="text-sm font-semibold text-amber-950 underline" href="/challenges?focus=challenge">
                Redo challenge
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="border-b border-stone-200/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">
              {onboardingComplete ? "My workspace · field ready" : "My workspace · onboarding"}
            </p>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">
              Hi {data.currentUser.fullName.split(" ")[0]} — here&apos;s what&apos;s next
            </h1>
            <p className="text-sm text-stone-600">
              {plan ? rampWeekLabel(plan) : "Your enablement home base"}
              {manager ? ` · Manager: ${manager.fullName}` : ""}
            </p>
            {plan ? (
              <span className="mt-2 inline-block rounded-full border border-[#0033a1]/20 bg-[#e8f2fc]/60 px-2.5 py-0.5 text-[10px] font-semibold text-[#0033a1]">
                Ramp assigned{rampWeek ? ` · calendar week ${rampWeek}` : ""}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {plan ? (
              <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center">
                <p className="text-[10px] font-medium uppercase text-stone-500">Plan</p>
                <p className="text-lg font-bold text-[#0033a1]">{plan.progress}%</p>
              </div>
            ) : null}
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-violet-700">Sim avg</p>
              <p className="text-lg font-bold text-violet-900">{simAvg ?? "—"}</p>
            </div>
            {certNextAction ? (
              <div
                className={`rounded-lg border px-3 py-2 text-center ${
                  certNextAction.status === "submitted"
                    ? "border-amber-200 bg-amber-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="text-[10px] font-medium uppercase text-amber-800">Cert</p>
                <p className="text-xs font-bold leading-tight text-amber-900">
                  {certNextAction.status === "submitted" ? "With manager" : "In progress"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                <p className="text-[10px] font-medium uppercase text-emerald-800">Cert</p>
                <p className="text-lg font-bold text-emerald-900">—</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        {plan ? <RampWeekRunway plan={plan} /> : null}

        {nextStep ? (
          <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[#0033a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0033a1]">
                  {nowCopy?.eyebrow ?? "Do this now"}
                </span>
                <h2 className="mt-1.5 text-lg font-bold text-stone-900">{nextStep.title}</h2>
                {nowCopy?.hint ? <p className="mt-1 text-xs text-stone-600">{nowCopy.hint}</p> : null}
                {!nowCopy?.hint && nextStep.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-600">{nextStep.description}</p>
                ) : null}
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 font-semibold text-stone-600">
                    {planStepTypeLabel(nextStep.type)}
                  </span>
                  Step {validatedCount + 1}/{plan?.steps.length ?? 0}
                  {nextStep.dueDate ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Due {nextStep.dueDate}
                    </span>
                  ) : null}
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878]"
                href={planStepHref(nextStep)}
              >
                {nowCopy?.cta ?? planStepActionLabel(nextStep)}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : awaitingReview.length > 0 ? (
          <div className="ns-card ns-card-peach col-span-12 p-4 lg:col-span-4">
            <StatusBadge status="submitted" />
            <p className="mt-2 font-bold text-stone-900">
              {awaitingReview.length} step{awaitingReview.length === 1 ? "" : "s"} awaiting review
            </p>
            <p className="text-xs text-stone-600">Your manager or mentor is validating your work.</p>
          </div>
        ) : certNextAction ? (
          <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-4">
            <span className="text-[10px] font-bold uppercase text-[#0033a1]">Field readiness</span>
            <h2 className="mt-1 text-lg font-bold text-stone-900">{certNextAction.label}</h2>
            <Link className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0033a1]" href={certNextAction.href}>
              Submit evidence <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : onboardingComplete ? (
          <div className="ns-card ns-card-sage col-span-12 p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="font-bold text-stone-900">All plan steps validated</p>
            </div>
            <Link className="mt-2 inline-block text-xs font-semibold text-[#0033a1]" href="/growth">
              Continue on growth plan →
            </Link>
          </div>
        ) : !plan ? (
          <div className="ns-card col-span-12 border border-dashed border-stone-300 p-4 lg:col-span-4">
            <p className="font-semibold text-stone-900">No active onboarding plan yet</p>
            <p className="mt-1 text-xs text-stone-600">Your manager assigns ramps from the team overview.</p>
          </div>
        ) : null}

        <div className="col-span-12 lg:col-span-4">
          <PracticeFeedbackStrip card={lastSim} needsRevision={needsRevisionCards.length > 0} />
        </div>

        {plan && plan.steps.length > 0 ? (
          <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-4">
            <h2 className="text-sm font-bold text-stone-900">Onboarding checklist</h2>
            <p className="text-xs text-stone-500">
              {actionSteps.length} need action · {validatedCount}/{plan.steps.length} validated
            </p>
            <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
              {plan.steps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step, index) => {
                  const validated = stepIsValidated(step.status);
                  const waiting = step.status === "submitted";
                  const isCurrent = step.id === nextStep?.id;

                  if (waiting) {
                    return (
                      <li className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2" key={step.id}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-900">{step.title}</span>
                          <span className="text-[10px] font-semibold text-stone-500">{planStepTypeLabel(step.type)}</span>
                        </div>
                        <StatusBadge status={step.status} />
                      </li>
                    );
                  }

                  return (
                    <li key={step.id}>
                      <Link
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                          isCurrent
                            ? "border-[#0033a1]/30 bg-[#e8f2fc]/60"
                            : validated
                              ? "border-stone-200 bg-stone-50/80 opacity-65"
                              : "border-stone-200 bg-white hover:border-[#0033a1]/20"
                        }`}
                        href={planStepHref(step)}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            validated
                              ? "bg-emerald-100 text-emerald-700"
                              : isCurrent
                                ? "bg-[#0033a1] text-white"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {validated ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate font-medium ${validated ? "line-through text-stone-500" : "text-stone-900"}`}>
                            {step.title}
                          </span>
                          <span className="text-[10px] font-semibold text-stone-500">{planStepTypeLabel(step.type)}</span>
                        </div>
                        {step.dueDate && !validated ? (
                          <span className="shrink-0 text-[10px] text-stone-500">{step.dueDate}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : null}

        <div className="col-span-12 lg:col-span-4">
          <ShadowLogQuickCard shadowStep={shadowStep} />
        </div>

        {openSimulation && !lastSim ? (
          <div className="ns-card ns-card-blue col-span-12 p-4 lg:col-span-4">
            <p className="text-[10px] font-medium uppercase text-stone-500">Assigned simulation</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{openSimulation.persona}</p>
            <Link className="mt-1 text-[11px] font-semibold text-[#0033a1] hover:underline" href="/simulations">
              Open flight simulator →
            </Link>
          </div>
        ) : null}

        {myActivity.length > 0 ? (
          <div className="ns-card ns-card-blue col-span-12 p-4 md:col-span-6 lg:col-span-4">
            <h2 className="text-sm font-bold text-stone-900">Recent activity</h2>
            <ActivityFeed activity={myActivity} profiles={data.profiles} />
          </div>
        ) : null}

        <div className="ns-card col-span-12 border border-stone-200 bg-white p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Jump to</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "My plan", href: "/my-plan", icon: ClipboardList },
              { label: "Learn", href: "/learn", icon: Sparkles },
              { label: "Development", href: "/development", icon: Target },
              { label: "Certifications", href: "/certifications", icon: Trophy },
              { label: "Feedback", href: "/feedback", icon: MessageSquare },
              { label: "Simulations", href: "/simulations", icon: Bot },
              { label: "Challenges", href: "/challenges", icon: BrainCircuit },
              { label: "Market pulse", href: "/market-pulse", icon: TrendingUp },
            ].map((item) => (
              <Link
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-[#FDFBF7] px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[#0033a1]/30 hover:text-[#0033a1]"
                href={item.href}
                key={item.label}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </div>
          {manager ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-600">
              <Mail className="h-3.5 w-3.5 text-[#0033a1]" />
              Manager: {manager.fullName}
            </p>
          ) : null}
          {feedbackCount > 0 ? (
            <Link className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033a1]" href="/feedback">
              <MessageSquare className="h-3.5 w-3.5" />
              {feedbackCount} manager feedback
            </Link>
          ) : null}
        </div>

        <div className="col-span-12">
          <CompetencyGapsCard data={data} />
        </div>
      </div>
    </div>
  );
}
