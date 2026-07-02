"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Mail,
  MessageSquare,
  RotateCcw,
  Target,
  TrendingUp,
  User,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ManagerCoachingNotes } from "@/components/manager/manager-coaching-notes";
import { SimTrendChart } from "@/components/manager/sim-trend-chart";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { healthBadgeTone } from "@/lib/manager/se-coaching-summary";
import type {
  CertSummary,
  CohortBenchmark,
  QuarterlyAlert,
  SimTrend,
} from "@/lib/manager/growth-insights";
import type {
  ActivityLog,
  Challenge,
  ChallengeSubmission,
  CoachingCard,
  DevelopmentPlan,
  PlanStep,
  Profile,
  SimulationAssignment,
  UserPlan,
} from "@/lib/types";
import { currentQuarter } from "@/lib/development/plan-utils";
import { formatPercent, initials } from "@/lib/utils";

export type SeManagerSnapshot = {
  profile: Profile;
  plan?: UserPlan;
  developmentPlan?: DevelopmentPlan | null;
  mentor?: Profile;
  submissions: ChallengeSubmission[];
  coachingCards: CoachingCard[];
  simulations: SimulationAssignment[];
  activity: ActivityLog[];
  openReviewCount: number;
  coaching: SeCoachingSummary;
  simTrend: SimTrend;
  cohortBenchmark: CohortBenchmark | null;
  quarterlyAlert: QuarterlyAlert | null;
  certSummary: CertSummary;
  managerNotes: string;
};

function stepStatusTone(step: PlanStep) {
  if (step.status === "reviewed" || step.status === "completed") return "green";
  if (step.status === "submitted" || step.status === "under_review") return "amber";
  if (step.status === "in_progress") return "blue";
  return "slate";
}

function stepStatusLabel(step: PlanStep) {
  if (step.status === "reviewed") return "Validated";
  if (step.status === "submitted") return "Awaiting your review";
  if (step.status === "in_progress") return "In progress";
  if (step.status === "not_started") return "Not started";
  return step.status.replaceAll("_", " ");
}

export function ManagerSeDetailPanel({
  snapshot,
  challenges,
  profiles,
  onClose,
}: {
  snapshot: SeManagerSnapshot;
  challenges: Challenge[];
  profiles: Profile[];
  onClose: () => void;
}) {
  const {
    profile,
    plan,
    developmentPlan,
    mentor,
    submissions,
    coachingCards,
    simulations,
    activity,
    openReviewCount,
    coaching,
    simTrend,
    cohortBenchmark,
    quarterlyAlert,
    certSummary,
    managerNotes,
  } = snapshot;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const validatedSteps = plan?.steps.filter((s) => s.status === "reviewed") ?? [];
  const awaitingReviewSteps = plan?.steps.filter((s) => s.status === "submitted") ?? [];
  const inProgressSteps = plan?.steps.filter((s) => s.status === "in_progress") ?? [];

  const pendingSubmissions = submissions.filter((s) => s.status === "submitted");
  const pendingCoaching = coachingCards.filter((c) => c.managerReviewStatus === "pending");

  const sentBackCards = coachingCards.filter((c) => c.managerReviewStatus === "needs_revision");
  const sentBackSubmissions = submissions.filter(
    (s) => s.status === "in_progress" && s.managerFeedback,
  );

  const approvedCards = coachingCards.filter((c) => c.managerReviewStatus === "reviewed");
  const approvedSubmissions = submissions.filter((s) => s.status === "reviewed");

  const activeSimulation = simulations.find(
    (sim) => sim.status === "in_progress" || sim.status === "submitted",
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close SE detail panel"
        className="absolute inset-0 bg-sp-navy/40 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />

      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl shadow-sp-navy/20">
        {/* Header */}
        <div className="border-b border-sp-blue/10 bg-gradient-to-br from-sp-blue-soft/40 via-white to-sp-magenta-soft/30 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta text-sm font-bold text-white">
                {initials(profile.fullName)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-sp-navy">{profile.fullName}</h2>
                  <Badge tone={healthBadgeTone(coaching.health)}>{coaching.healthLabel}</Badge>
                </div>
                <p className="mt-0.5 text-sm capitalize text-sp-navy-muted">
                  {profile.level} • {profile.role.replaceAll("_", " ")}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-sp-navy-muted">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </p>
              </div>
            </div>
            <button
              className="rounded-lg p-2 text-sp-navy-muted transition hover:bg-sp-blue-soft/60 hover:text-sp-navy"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {plan ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-sp-navy">{plan.name}</span>
                <span className="font-bold text-sp-blue">{formatPercent(plan.progress)}</span>
              </div>
              <Progress className="mt-2 h-2" value={plan.progress} />
              <p className="mt-2 text-xs text-sp-navy-muted">
                Started {format(new Date(plan.startDate), "MMM d, yyyy")}
                {plan.targetCompletion
                  ? ` • Target ${format(new Date(plan.targetCompletion), "MMM d, yyyy")}`
                  : null}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-sp-navy-muted">No active onboarding plan assigned.</p>
          )}

          {mentor ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-sp-navy-muted">
              <User className="h-3.5 w-3.5" />
              Mentor: {mentor.fullName}
            </p>
          ) : null}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-px border-b border-sp-blue/10 bg-sp-blue/10 sm:grid-cols-4">
          {[
            { label: "Onboarding", value: `${coaching.onboardingProgress}%`, tone: "text-sp-blue" },
            { label: "Dev goals", value: coaching.devGoalsTotal > 0 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}` : "—", tone: "text-sp-magenta" },
            { label: "Sim avg", value: coaching.latestSimScore ?? coaching.avgSimScore ?? "—", tone: "text-sp-navy" },
            { label: "Certs", value: coaching.certsLabel, tone: "text-green-700" },
          ].map((stat) => (
            <div className="bg-white px-3 py-3 text-center" key={stat.label}>
              <p className={`text-lg font-bold ${stat.tone}`}>{stat.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sp-navy-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Coaching narrative */}
          <section className="rounded-xl border border-sp-blue/15 bg-sp-blue-soft/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
              <MessageSquare className="h-4 w-4 text-sp-blue" />
              Coaching snapshot
            </h3>
            <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{coaching.storyLine}</p>
            <p className="mt-1 text-xs text-sp-navy-muted">{coaching.lastActiveLabel}</p>
            {coaching.currentFocus ? (
              <p className="mt-2 text-sm font-semibold text-sp-navy">Current focus: {coaching.currentFocus}</p>
            ) : null}
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-navy-muted">1:1 talking points</p>
              <ul className="mt-2 space-y-1.5">
                {coaching.talkingPoints.slice(0, 4).map((point) => (
                  <li className="text-sm leading-5 text-sp-navy" key={point}>
                    • {point}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <ManagerCoachingNotes initialNotes={managerNotes} seUserId={profile.id} />

          {quarterlyAlert && quarterlyAlert.pendingGoals > 0 ? (
            <section
              className={`rounded-xl border p-4 ${quarterlyAlert.overdue ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/50"}`}
            >
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <Clock className="h-4 w-4" />
                Quarterly development review
              </h3>
              <p className="mt-2 text-sm text-sp-navy">{quarterlyAlert.label}</p>
              <Link
                className="mt-2 inline-block text-xs font-semibold text-sp-blue hover:text-sp-blue-deep"
                href={`/development?profile=${profile.id}`}
              >
                Run quarterly attestation →
              </Link>
            </section>
          ) : null}

          <section className="rounded-xl border border-sp-magenta/15 bg-sp-magenta-soft/10 p-4">
            <h3 className="text-sm font-bold text-sp-navy">Simulation trend</h3>
            <p className="mt-1 text-xs text-sp-navy-muted">Latest vs history — are they getting better?</p>
            <div className="mt-3">
              <SimTrendChart trend={simTrend} />
            </div>
          </section>

          {cohortBenchmark ? (
            <section className="rounded-xl border border-sp-blue/15 bg-sp-blue-soft/20 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <Users className="h-4 w-4 text-sp-blue" />
                Cohort comparison · {cohortBenchmark.cohortLabel} ({cohortBenchmark.cohortSize} SEs)
              </h3>
              <p className="mt-2 text-sm text-sp-navy">{cohortBenchmark.simComparisonLabel}</p>
              <p className="mt-1 text-sm text-sp-navy-muted">{cohortBenchmark.onboardingComparisonLabel}</p>
            </section>
          ) : null}

          <section className="rounded-xl border border-green-200/80 bg-green-50/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <Trophy className="h-4 w-4 text-green-700" />
                Certification gates
              </h3>
              <Link
                className="text-xs font-semibold text-sp-blue hover:text-sp-blue-deep"
                href={`/certifications?profile=${profile.id}`}
              >
                Open certification gates →
              </Link>
            </div>
            <p className="mt-2 text-sm text-sp-navy">
              {certSummary.approved} approved
              {certSummary.nextGateLabel ? (
                <>
                  {" "}
                  · Next gate: <strong>{certSummary.nextGateLabel}</strong> (
                  {certSummary.nextGateStatus?.replaceAll("_", " ") ?? "not started"})
                </>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {certSummary.items.map((item) => (
                <Badge
                  key={item.type}
                  tone={
                    item.status === "approved"
                      ? "green"
                      : item.status === "submitted"
                        ? "amber"
                        : "slate"
                  }
                >
                  {item.label}
                </Badge>
              ))}
            </div>
            {coaching.careerReadiness !== null ? (
              <p className="mt-3 text-xs text-sp-navy-muted">
                Career readiness: <strong className="text-sp-navy">{coaching.careerReadiness}%</strong> toward next
                level
              </p>
            ) : null}
          </section>

          {coaching.topGaps.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <TrendingUp className="h-4 w-4 text-sp-magenta" />
                Competency focus areas
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {coaching.topGaps.map((gap) => (
                  <Badge key={gap} tone="magenta">
                    {gap}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {developmentPlan && developmentPlan.goals.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                  <Target className="h-4 w-4 text-sp-magenta" />
                  Annual development goals
                </h3>
                <Link
                  className="text-xs font-semibold text-sp-blue hover:text-sp-blue-deep"
                  href={`/development?profile=${profile.id}`}
                >
                  Open full plan →
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {developmentPlan.goals.map((goal) => {
                  const quarter = currentQuarter();
                  const review = goal.quarterlyReviews.find(
                    (item) => item.quarter === quarter && item.year === developmentPlan.year,
                  );

                  return (
                  <div className="rounded-xl border border-sp-magenta/10 bg-sp-magenta-soft/15 px-3 py-2" key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-sp-navy">{goal.title}</p>
                      <Badge tone={goal.overallStatus === "on_track" || goal.overallStatus === "achieved" ? "green" : "amber"}>
                        {goal.overallStatus.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    {review ? (
                      <p className="mt-1 text-xs text-sp-navy-muted">
                        {quarter} {developmentPlan.year}: {review.status.replaceAll("_", " ")}
                        {review.dueDate ? ` · due ${format(new Date(review.dueDate), "MMM d")}` : null}
                      </p>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-sp-blue/20 px-4 py-3">
              <p className="text-sm font-semibold text-sp-navy">No annual development plan</p>
              <Link
                className="mt-1 inline-block text-xs font-semibold text-sp-blue hover:text-sp-blue-deep"
                href={`/development?profile=${profile.id}`}
              >
                Co-create goals on Development →
              </Link>
            </section>
          )}

          {/* Needs attention */}
          {openReviewCount > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <Clock className="h-4 w-4 text-amber-600" />
                Needs your review ({openReviewCount})
              </h3>
              <div className="mt-3 space-y-2">
                {pendingSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3" key={submission.id}>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="amber">Challenge</Badge>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-sp-navy">
                        {challenge?.title ?? "Challenge submission"}
                      </p>
                      {submission.submittedAt ? (
                        <p className="mt-1 text-xs text-sp-navy-muted">
                          Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {pendingCoaching.map((card) => (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3" key={card.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="magenta">Simulation</Badge>
                      <span className="text-xs font-bold text-sp-navy">Score {card.score}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-sp-navy">
                      {card.simulationContext?.persona ?? "Simulation coaching card"}
                    </p>
                  </div>
                ))}
                {awaitingReviewSteps.map((step) => (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3" key={step.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="amber">Plan step</Badge>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-sp-navy">{step.title}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-sp-navy-muted">
                Review these in the Action inbox on the left.
              </p>
            </section>
          ) : null}

          {/* Sent back for revision */}
          {sentBackCards.length > 0 || sentBackSubmissions.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <RotateCcw className="h-4 w-4 text-amber-700" />
                Sent back for revision
              </h3>
              <div className="mt-3 space-y-2">
                {sentBackCards.map((card) => (
                  <div className="rounded-xl border border-amber-200/80 bg-white p-3" key={card.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="amber">Simulation</Badge>
                      <span className="text-xs text-sp-navy-muted">
                        {card.reviewedAt
                          ? formatDistanceToNow(new Date(card.reviewedAt), { addSuffix: true })
                          : null}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-sp-navy">
                      {card.simulationContext?.persona ?? "Simulation"} — score {card.score}
                    </p>
                    {card.managerComments ? (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                        {card.managerComments}
                      </p>
                    ) : null}
                    {activeSimulation ? (
                      <p className="mt-2 text-xs font-medium text-sp-blue">
                        SE has an open assignment — waiting for redo
                      </p>
                    ) : null}
                  </div>
                ))}
                {sentBackSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-xl border border-amber-200/80 bg-white p-3" key={submission.id}>
                      <Badge tone="amber">Challenge</Badge>
                      <p className="mt-1 text-sm font-semibold text-sp-navy">
                        {challenge?.title ?? "Challenge"}
                      </p>
                      {submission.managerFeedback ? (
                        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                          {submission.managerFeedback}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Full plan checklist */}
          {plan && plan.steps.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <ClipboardList className="h-4 w-4 text-sp-blue" />
                Onboarding plan
              </h3>
              <div className="mt-3 space-y-1">
                {[...plan.steps]
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <div
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                        step.status === "submitted"
                          ? "bg-amber-50/80"
                          : step.status === "reviewed"
                            ? "bg-green-50/50"
                            : "bg-sp-blue-soft/20"
                      }`}
                      key={step.id}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          step.status === "reviewed"
                            ? "bg-green-100 text-green-800"
                            : step.status === "submitted"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-white text-sp-navy-muted"
                        }`}
                      >
                        {step.status === "reviewed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-sp-navy">{step.title}</p>
                        <p className="text-xs capitalize text-sp-navy-muted">
                          {step.type.replaceAll("_", " ")}
                        </p>
                      </div>
                      <Badge tone={stepStatusTone(step)}>{stepStatusLabel(step)}</Badge>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {/* Accomplishments */}
          {approvedCards.length > 0 || approvedSubmissions.length > 0 || validatedSteps.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Accomplishments
              </h3>
              <div className="mt-3 space-y-2">
                {validatedSteps.map((step) => (
                  <div className="rounded-xl border border-green-100 bg-green-50/40 px-3 py-2" key={step.id}>
                    <p className="text-sm font-medium text-sp-navy">{step.title}</p>
                    <p className="text-xs text-green-800">Plan step validated</p>
                  </div>
                ))}
                {approvedSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-xl border border-green-100 bg-green-50/40 px-3 py-2" key={submission.id}>
                      <p className="text-sm font-medium text-sp-navy">
                        {challenge?.title ?? "Challenge"}
                      </p>
                      <p className="text-xs text-green-800">
                        Approved
                        {submission.managerGrade ? ` • Grade ${submission.managerGrade}/5` : ""}
                      </p>
                    </div>
                  );
                })}
                {approvedCards.map((card) => (
                  <div className="rounded-xl border border-green-100 bg-green-50/40 px-3 py-2" key={card.id}>
                    <p className="text-sm font-medium text-sp-navy">
                      {card.simulationContext?.persona ?? "Simulation"} — score {card.score}
                    </p>
                    <p className="text-xs text-green-800">
                      Simulation approved
                      {card.managerGrade ? ` • Grade ${card.managerGrade}/5` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Activity timeline */}
          {activity.length > 0 ? (
            <section>
              <h3 className="text-sm font-bold text-sp-navy">Activity timeline</h3>
              <div className="mt-3">
                <ActivityFeed activity={activity.slice(0, 12)} profiles={profiles} />
              </div>
            </section>
          ) : (
            <p className="text-sm text-sp-navy-muted">No activity recorded yet for this SE.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
