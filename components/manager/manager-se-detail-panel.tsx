"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  RotateCcw,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/activity-feed";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { ManagerCoachingNotes } from "@/components/manager/manager-coaching-notes";
import { ManagerOutlineBtn, healthBadgeStyle } from "@/components/manager/manager-ui-primitives";
import { ManagerPlanAssignPanel } from "@/components/manager/manager-plan-assign-panel";
import { SimulationAssignForm } from "@/components/manager/simulation-assign-form";
import { SimTrendChart } from "@/components/manager/sim-trend-chart";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
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
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
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

function certBadgeStyle(status: string) {
  if (status === "approved") return { bg: "#dcfce7", color: "#15803d", label: "Approved" };
  if (status === "submitted") return { bg: "#fef3c7", color: "#b45309", label: "Submitted" };
  if (status === "locked") return { bg: "#f1f5f9", color: "#94a3b8", label: "Locked" };
  return { bg: "#f1f5f9", color: "#64748b", label: "Not started" };
}

const SIM_QUICK_PICKS = ["CISO discovery", "SLED vertical", "Executive demo", "Bakeoff scenario"] as const;

export function ManagerSeDetailPanel({
  snapshot,
  challenges,
  profiles,
  plans,
  mentors,
  onClose,
}: {
  snapshot: SeManagerSnapshot;
  challenges: Challenge[];
  profiles: Profile[];
  plans: UserPlan[];
  mentors: Profile[];
  onClose: () => void;
}) {
  const {
    profile,
    plan,
    developmentPlan,
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

  const [selectedQuickPick, setSelectedQuickPick] = useState<string | null>(SIM_QUICK_PICKS[0]);
  const assignFormRef = useRef<HTMLDivElement>(null);

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

  const health = healthBadgeStyle(coaching.health);
  const rampPct = plan?.progress ?? coaching.onboardingProgress;

  const stats = [
    { val: `${coaching.onboardingProgress}%`, label: "Onboarding" },
    {
      val: coaching.devGoalsTotal > 0 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}` : "—",
      label: "Dev goals",
    },
    { val: String(coaching.latestSimScore ?? coaching.avgSimScore ?? "—"), label: "Sim avg" },
    { val: coaching.certsLabel, label: "Certs" },
  ];

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-40 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ background: "rgba(0,20,58,0.45)" }}
      />

      <div
        className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col overflow-hidden bg-white"
        style={{ boxShadow: "-24px 0 60px rgba(0,20,58,0.2)" }}
      >
        <div
          className="shrink-0 border-b border-[#e2eaf5] p-[18px_22px_14px]"
          style={{ background: "linear-gradient(135deg,#f0f7ff,#fdf0fa)" }}
        >
          <div className="flex items-start justify-between gap-[12px]">
            <div className="flex items-center gap-[12px]">
              <div
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{ background: avatarGradientForId(profile.id) }}
              >
                {initials(profile.fullName)}
              </div>
              <div>
                <div className="mb-[2px] flex items-center gap-[8px]">
                  <span className="font-display text-[16px] font-extrabold text-[#0a1628]">{profile.fullName}</span>
                  <span
                    className="rounded-full px-[8px] py-[2px] text-[9px] font-bold"
                    style={{ background: health.bg, color: health.color }}
                  >
                    {health.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b]">
                  {profile.level} · {profile.email}
                </p>
              </div>
            </div>
            <button className="rounded-md p-[4px] text-[#64748b] hover:bg-[#f1f5f9]" onClick={onClose} type="button">
              <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          </div>

          {plan ? (
            <div className="mt-[12px]">
              <div className="mb-[4px] flex justify-between">
                <span className="text-[11px] font-semibold text-[#475569]">{plan.name}</span>
                <span className="text-[11px] font-bold text-[#0071ce]">{formatPercent(rampPct)}</span>
              </div>
              <div className="h-[6px] overflow-hidden rounded-full bg-[#e8f2fc]">
                <div className="prog-fill h-full rounded-full bg-[#0071ce]" style={{ width: `${rampPct}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-[12px] space-y-3">
              <p className="text-[11px] text-[#64748b]">No onboarding plan assigned yet.</p>
              <ManagerPlanAssignPanel
                assignees={[profile]}
                compact
                defaultUserId={profile.id}
                mentors={mentors}
                onAssigned={onClose}
                plans={plans}
              />
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-4 border-b border-[#e2eaf5]">
          {stats.map((stat) => (
            <div className="border-r border-[#e2eaf5] p-[10px_12px] text-center last:border-r-0" key={stat.label}>
              <p className="font-display text-[18px] font-extrabold leading-none text-[#0a1628]">{stat.val}</p>
              <p className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-[14px] overflow-y-auto p-[18px_22px]">
          <div
            className="mb-[14px] rounded-[10px] p-[14px]"
            style={{ background: "#f0f7ff", border: "1px solid rgba(0,113,206,0.15)" }}
          >
            <p className="mb-[8px] flex items-center gap-[6px] text-[11.5px] font-bold text-[#0a1628]">
              <svg fill="none" height="13" stroke="#0071ce" strokeWidth="1.6" viewBox="0 0 16 16" width="13">
                <path d="M2 3h12v8H2z" />
                <path d="M2 6h12" />
              </svg>
              Coaching snapshot
            </p>
            <p className="text-[11.5px] leading-[1.6] text-[#374151]">{coaching.storyLine}</p>
            <p className="mt-1 text-[10.5px] text-[#94a3b8]">{coaching.lastActiveLabel}</p>
            {coaching.currentFocus ? (
              <p className="mt-2 text-[11px] font-semibold text-[#374151]">Current focus: {coaching.currentFocus}</p>
            ) : null}
            <div className="mt-[10px]">
              <p className="mb-[6px] text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]">1:1 talking points</p>
              {coaching.talkingPoints.slice(0, 4).map((point) => (
                <div className="mb-[4px] flex gap-[7px]" key={point}>
                  <span className="shrink-0 text-[#0071ce]">•</span>
                  <span className="text-[11px] leading-[1.5] text-[#374151]">{point}</span>
                </div>
              ))}
            </div>
            <ManagerOutlineBtn
              className="mt-[10px]"
              onClick={() => {
                void navigator.clipboard.writeText(coaching.talkingPoints.join("\n"));
                toast.success("Talking points copied to clipboard");
              }}
            >
              Copy for 1:1
            </ManagerOutlineBtn>
          </div>

          <div className="mb-[14px] rounded-[10px] border-[1.5px] border-[#e2eaf5] p-[14px]">
            <p className="mb-[4px] text-[11.5px] font-bold text-[#0a1628]">Assign simulation</p>
            <p className="mb-[10px] text-[11px] text-[#64748b]">Push practice to {profile.fullName.split(" ")[0]}</p>
            <div className="mb-[10px] flex flex-wrap gap-[8px]">
              {SIM_QUICK_PICKS.map((sim) => (
                <button
                  className="inline-flex items-center rounded-lg px-[13px] py-[6px] text-[11.5px] font-semibold"
                  key={sim}
                  onClick={() => {
                    setSelectedQuickPick(sim);
                    assignFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                  style={
                    selectedQuickPick === sim
                      ? { background: "#0071ce", color: "white" }
                      : { background: "white", color: "#334155", border: "1.5px solid #e2eaf5" }
                  }
                  type="button"
                >
                  {sim}
                </button>
              ))}
            </div>
            <div ref={assignFormRef}>
              <SimulationAssignForm
                assignees={[profile]}
                personaQuickPick={selectedQuickPick}
              />
            </div>
          </div>

          <ManagerCoachingNotes initialNotes={managerNotes} seUserId={profile.id} />

          {quarterlyAlert && quarterlyAlert.pendingGoals > 0 ? (
            <section
              className={`rounded-[10px] border p-[14px] ${quarterlyAlert.overdue ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/50"}`}
            >
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <Clock className="h-4 w-4" />
                Quarterly development review
              </h3>
              <p className="mt-2 text-[11px] text-[#374151]">{quarterlyAlert.label}</p>
              <Link
                className="mt-2 inline-block text-[11px] font-semibold text-[#0071ce] hover:underline"
                href={`/development?profile=${profile.id}`}
              >
                Run quarterly attestation →
              </Link>
            </section>
          ) : null}

          <section className="rounded-[10px] border border-[#e2eaf5] bg-white p-[14px]">
            <h3 className="text-[11.5px] font-bold text-[#0a1628]">Simulation trend</h3>
            <p className="mt-1 text-[11px] text-[#64748b]">Latest vs history — are they getting better?</p>
            <div className="mt-3">
              <SimTrendChart trend={simTrend} />
            </div>
          </section>

          {cohortBenchmark ? (
            <section className="rounded-[10px] border border-[#e2eaf5] bg-[#f8fafd] p-[14px]">
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <Users className="h-4 w-4 text-[#0071ce]" />
                Cohort comparison · {cohortBenchmark.cohortLabel} ({cohortBenchmark.cohortSize} SEs)
              </h3>
              <p className="mt-2 text-[11px] text-[#374151]">{cohortBenchmark.simComparisonLabel}</p>
              <p className="mt-1 text-[11px] text-[#64748b]">{cohortBenchmark.onboardingComparisonLabel}</p>
            </section>
          ) : null}

          <div
            className="mb-[14px] rounded-[10px] border-[1.5px] bg-[#f0fdf4] p-[14px]"
            style={{ borderColor: "rgba(16,185,129,0.2)" }}
          >
            <p className="mb-[8px] flex items-center gap-[6px] text-[11.5px] font-bold text-[#0a1628]">
              <Trophy className="h-4 w-4 text-[#16a34a]" />
              Certification gates
            </p>
            {certSummary.items.map((cert) => {
              const style = certBadgeStyle(cert.status);
              return (
                <div className="flex items-center justify-between border-b border-[#d1fae5] py-[7px] last:border-b-0" key={cert.type}>
                  <span className="text-[11.5px] text-[#1e293b]">{cert.label}</span>
                  <span
                    className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {style.label}
                  </span>
                </div>
              );
            })}
            {coaching.careerReadiness !== null ? (
              <p className="mt-3 text-[10.5px] text-[#64748b]">
                Career readiness: <strong className="text-[#0a1628]">{coaching.careerReadiness}%</strong> toward next level
              </p>
            ) : null}
          </div>

          {coaching.topGaps.length > 0 ? (
            <div
              className="rounded-[10px] border-[1.5px] bg-[#fdf0fa] p-[14px]"
              style={{ borderColor: "rgba(204,39,176,0.15)" }}
            >
              <p className="mb-[8px] text-[11.5px] font-bold text-[#0a1628]">Competency focus areas</p>
              <div className="flex flex-wrap gap-[6px]">
                {coaching.topGaps.map((gap) => (
                  <span
                    className="rounded-full bg-[#fdf0fa] px-[10px] py-[4px] text-[11px] font-semibold text-[#a51e8e]"
                    key={gap}
                    style={{ border: "1px solid rgba(204,39,176,0.2)" }}
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {developmentPlan && developmentPlan.goals.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                  <Target className="h-4 w-4 text-[#cc27b0]" />
                  Annual development goals
                </h3>
                <Link
                  className="text-[11px] font-semibold text-[#0071ce] hover:underline"
                  href={`/development?profile=${profile.id}`}
                >
                  Open full plan →
                </Link>
              </div>
              <div className="space-y-2">
                {developmentPlan.goals.map((goal) => {
                  const quarter = currentQuarter();
                  const review = goal.quarterlyReviews.find(
                    (item) => item.quarter === quarter && item.year === developmentPlan.year,
                  );

                  return (
                    <div className="rounded-[10px] border border-[#e2eaf5] bg-[#f8fafd] px-3 py-2" key={goal.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11.5px] font-semibold text-[#1e293b]">{goal.title}</p>
                        <Badge tone={goal.overallStatus === "on_track" || goal.overallStatus === "achieved" ? "green" : "amber"}>
                          {goal.overallStatus.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      {review ? (
                        <p className="mt-1 text-[10.5px] text-[#64748b]">
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
            <section className="rounded-[10px] border border-dashed border-[#e2eaf5] px-4 py-3">
              <p className="text-[11.5px] font-semibold text-[#0a1628]">No annual development plan</p>
              <Link
                className="mt-1 inline-block text-[11px] font-semibold text-[#0071ce] hover:underline"
                href={`/development?profile=${profile.id}`}
              >
                Co-create goals on Development →
              </Link>
            </section>
          )}

          {openReviewCount > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <Clock className="h-4 w-4 text-amber-600" />
                Needs your review ({openReviewCount})
              </h3>
              <div className="mt-3 space-y-2">
                {pendingSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-3" key={submission.id}>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="amber">Challenge</Badge>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="mt-1 text-[11.5px] font-semibold text-[#1e293b]">
                        {challenge?.title ?? "Challenge submission"}
                      </p>
                      {submission.submittedAt ? (
                        <p className="mt-1 text-[10.5px] text-[#64748b]">
                          Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {pendingCoaching.map((card) => (
                  <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-3" key={card.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="magenta">Simulation</Badge>
                      <span className="text-[11px] font-bold text-[#0a1628]">Score {card.score}</span>
                    </div>
                    <p className="mt-1 text-[11.5px] font-semibold text-[#1e293b]">
                      {card.simulationContext?.persona ?? "Simulation coaching card"}
                    </p>
                  </div>
                ))}
                {awaitingReviewSteps.map((step) => (
                  <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-3" key={step.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="amber">Plan step</Badge>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 text-[11.5px] font-semibold text-[#1e293b]">{step.title}</p>
                  </div>
                ))}
              </div>
              <Link className="mt-2 inline-block text-[11px] font-semibold text-[#0071ce] hover:underline" href="/manager">
                Open Action inbox to review →
              </Link>
            </section>
          ) : null}

          {sentBackCards.length > 0 || sentBackSubmissions.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <RotateCcw className="h-4 w-4 text-amber-700" />
                Sent back for revision
              </h3>
              <div className="mt-3 space-y-2">
                {sentBackCards.map((card) => (
                  <div className="rounded-[10px] border border-amber-200/80 bg-white p-3" key={card.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="amber">Simulation</Badge>
                      <span className="text-[10.5px] text-[#64748b]">
                        {card.reviewedAt
                          ? formatDistanceToNow(new Date(card.reviewedAt), { addSuffix: true })
                          : null}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] font-semibold text-[#1e293b]">
                      {card.simulationContext?.persona ?? "Simulation"} — score {card.score}
                    </p>
                    {card.managerComments ? (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-5 text-amber-950">
                        {card.managerComments}
                      </p>
                    ) : null}
                    {activeSimulation ? (
                      <p className="mt-2 text-[10.5px] font-medium text-[#0071ce]">
                        SE has an open assignment — waiting for redo
                      </p>
                    ) : null}
                  </div>
                ))}
                {sentBackSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-[10px] border border-amber-200/80 bg-white p-3" key={submission.id}>
                      <Badge tone="amber">Challenge</Badge>
                      <p className="mt-1 text-[11.5px] font-semibold text-[#1e293b]">
                        {challenge?.title ?? "Challenge"}
                      </p>
                      {submission.managerFeedback ? (
                        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-5 text-amber-950">
                          {submission.managerFeedback}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {plan && plan.steps.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <ClipboardList className="h-4 w-4 text-[#0071ce]" />
                Onboarding plan
              </h3>
              <div className="mt-3 space-y-1">
                {[...plan.steps]
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <div
                      className={`flex items-start gap-3 rounded-[10px] px-3 py-2.5 ${
                        step.status === "submitted"
                          ? "bg-amber-50/80"
                          : step.status === "reviewed"
                            ? "bg-green-50/50"
                            : "bg-[#f8fafd]"
                      }`}
                      key={step.id}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          step.status === "reviewed"
                            ? "bg-green-100 text-green-800"
                            : step.status === "submitted"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-white text-[#64748b]"
                        }`}
                      >
                        {step.status === "reviewed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-semibold text-[#1e293b]">{step.title}</p>
                        <p className="text-[10.5px] capitalize text-[#64748b]">{step.type.replaceAll("_", " ")}</p>
                      </div>
                      <Badge tone={stepStatusTone(step)}>{stepStatusLabel(step)}</Badge>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {approvedCards.length > 0 || approvedSubmissions.length > 0 || validatedSteps.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-2 text-[11.5px] font-bold text-[#0a1628]">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Accomplishments
              </h3>
              <div className="mt-3 space-y-2">
                {validatedSteps.map((step) => (
                  <div className="rounded-[10px] border border-green-100 bg-green-50/40 px-3 py-2" key={step.id}>
                    <p className="text-[11.5px] font-medium text-[#1e293b]">{step.title}</p>
                    <p className="text-[10.5px] text-green-800">Plan step validated</p>
                  </div>
                ))}
                {approvedSubmissions.map((submission) => {
                  const challenge = challenges.find((c) => c.id === submission.challengeId);
                  return (
                    <div className="rounded-[10px] border border-green-100 bg-green-50/40 px-3 py-2" key={submission.id}>
                      <p className="text-[11.5px] font-medium text-[#1e293b]">{challenge?.title ?? "Challenge"}</p>
                      <p className="text-[10.5px] text-green-800">
                        Approved
                        {submission.managerGrade ? ` • Grade ${submission.managerGrade}/5` : ""}
                      </p>
                    </div>
                  );
                })}
                {approvedCards.map((card) => (
                  <div className="rounded-[10px] border border-green-100 bg-green-50/40 px-3 py-2" key={card.id}>
                    <p className="text-[11.5px] font-medium text-[#1e293b]">
                      {card.simulationContext?.persona ?? "Simulation"} — score {card.score}
                    </p>
                    <p className="text-[10.5px] text-green-800">
                      Simulation approved
                      {card.managerGrade ? ` • Grade ${card.managerGrade}/5` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activity.length > 0 ? (
            <section>
              <h3 className="text-[11.5px] font-bold text-[#0a1628]">Activity timeline</h3>
              <div className="mt-3">
                <ActivityFeed activity={activity.slice(0, 12)} profiles={profiles} />
              </div>
            </section>
          ) : (
            <p className="text-[11px] text-[#64748b]">No activity recorded yet for this SE.</p>
          )}
        </div>
      </div>
    </>
  );
}
