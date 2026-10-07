"use client";

import { differenceInCalendarDays, format } from "date-fns";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ManagerAddAdHocTask } from "@/components/manager/manager-add-ad-hoc-task";
import { ManagerCoachingNotes } from "@/components/manager/manager-coaching-notes";
import { ManagerPlanAssignPanel } from "@/components/manager/manager-plan-assign-panel";
import { ManagerReassignMentor } from "@/components/manager/manager-reassign-mentor";
import { MentorNotesForManager } from "@/components/manager/mentor-notes-for-manager";
import { SimTrendChart } from "@/components/manager/sim-trend-chart";
import { SimulationAssignForm } from "@/components/manager/simulation-assign-form";
import { Drawer } from "@/components/ui/drawer";
import { ScoreBar } from "@/components/ui/bars";
import { Stamp, type StampState } from "@/components/ui/stamp";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { CertSummary, CohortBenchmark, QuarterlyAlert, SimTrend } from "@/lib/manager/growth-insights";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { READINESS_TARGET, buildGates, rampWeekFor } from "@/lib/manager/team-status";
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
import { initials } from "@/lib/utils";

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
  mentorNotes?: { mentorName: string; notes: string; updatedAt: string } | null;
  /** Approved certification types; lets the workbench rebuild the coaching summary client-side. */
  approvedCerts?: string[];
};

function sentence(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortDate(iso: string) {
  return format(new Date(iso), "EEE, MMM d");
}

/** "Today", "1 day", "4 days". */
function ageLabel(iso: string, now: number) {
  const days = Math.max(0, differenceInCalendarDays(now, new Date(iso)));
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function scoreTone(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-blue";
}

function stepStatus(step: PlanStep) {
  if (step.status === "reviewed" || step.status === "completed") return <StatusPill tone="success">Validated</StatusPill>;
  if (step.status === "under_review") return <StatusPill tone="warning">Mentor endorsed</StatusPill>;
  if (step.status === "submitted") return <StatusPill tone="warning">Needs your sign-off</StatusPill>;
  if (step.status === "in_progress") return <StatusPill tone="blue">In progress</StatusPill>;
  return <StatusPill tone="neutral">Not started</StatusPill>;
}

function certStatus(status: string) {
  if (status === "approved") return <StatusPill tone="success">Cleared</StatusPill>;
  if (status === "submitted") return <StatusPill tone="warning">Ready for review</StatusPill>;
  if (status === "in_progress") return <StatusPill tone="blue">In progress</StatusPill>;
  return <StatusPill tone="neutral">Not yet</StatusPill>;
}

const GATE_CAPTION: Record<StampState, string> = {
  earned: "cleared",
  ready: "ready for review",
  partial: "in progress",
  none: "not yet",
};

const HEALTH_TONE: Record<SeCoachingSummary["health"], StatusTone> = {
  on_track: "success",
  waiting_on_se: "blue",
  coach_now: "warning",
  stalled: "warning",
  at_risk: "danger",
};

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  // The first section sits right under the column label, so it needs no divider above it.
  return (
    <section className="flex flex-col gap-3 border-t border-divider pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-caps">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function LineList({ children }: { children: ReactNode }) {
  return <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">{children}</ul>;
}

function LineRow({ children }: { children: ReactNode }) {
  return <li className="flex items-start justify-between gap-3 border-b border-divider px-4 py-3 last:border-b-0">{children}</li>;
}

/** Small muted kind label above a row title ("Challenge", "Sim card"). */
function Kind({ children }: { children: ReactNode }) {
  return <span className="block text-[13px] text-muted">{children}</span>;
}

type LabInteraction = { id: string; personName: string; query: string; createdAt: string };
type EngagementRow = { seName: string; accountName: string; eventType: string; resourceLabel: string; createdAt: string };

/** ISC Lab and buyer engagement, filtered to this SE (moved here from the old Command Center). */
function FieldActivity({ fullName }: { fullName: string }) {
  const [lab, setLab] = useState<LabInteraction[] | null>(null);
  const [engagement, setEngagement] = useState<EngagementRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/manager/isc-lab-stats")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { interactions?: LabInteraction[] } | null) => {
        if (!cancelled) setLab((body?.interactions ?? []).filter((row) => row.personName === fullName));
      })
      .catch(() => !cancelled && setLab([]));
    void fetch("/api/engagement/team?days=14")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { rows?: EngagementRow[] } | null) => {
        if (!cancelled) setEngagement((body?.rows ?? []).filter((row) => row.seName === fullName));
      })
      .catch(() => !cancelled && setEngagement([]));
    return () => {
      cancelled = true;
    };
  }, [fullName]);

  if (lab === null || engagement === null) {
    return <p className="text-sm text-muted">Loading field activity</p>;
  }
  if (lab.length === 0 && engagement.length === 0) {
    return <p className="text-sm text-muted">No ISC Lab sessions or buyer engagement recorded recently.</p>;
  }
  return (
    <LineList>
      {lab.slice(0, 3).map((row) => (
        <LineRow key={`lab-${row.id}`}>
          <span className="min-w-0">
            <Kind>ISC Lab</Kind>
            <span className="block truncate text-sm text-ink">{row.query}</span>
          </span>
          <span className="shrink-0 text-[13px] text-muted">{shortDate(row.createdAt)}</span>
        </LineRow>
      ))}
      {engagement.slice(0, 3).map((row, index) => (
        <LineRow key={`eng-${index}-${row.createdAt}`}>
          <span className="min-w-0">
            <Kind>{sentence(row.eventType)}</Kind>
            <span className="block truncate text-sm text-ink">
              {row.accountName}, {row.resourceLabel}
            </span>
          </span>
          <span className="shrink-0 text-[13px] text-muted">{shortDate(row.createdAt)}</span>
        </LineRow>
      ))}
    </LineList>
  );
}

/** SE detail as an accessible 440px drawer (focus trap, Esc, focus return). */
export function ManagerSeDetailPanel({
  snapshot,
  challenges,
  profiles,
  plans,
  mentors,
  teamAssignees,
  onClose,
}: {
  snapshot: SeManagerSnapshot;
  challenges: Challenge[];
  profiles: Profile[];
  plans: UserPlan[];
  mentors: Profile[];
  /** Full manager org — enables Assign to all SEs. */
  teamAssignees?: Profile[];
  /** Must be stable (useCallback): the drawer re-runs its focus trap when it changes. */
  onClose: () => void;
}) {
  const {
    profile,
    plan,
    developmentPlan,
    submissions,
    coachingCards,
    activity,
    openReviewCount,
    coaching,
    simTrend,
    cohortBenchmark,
    quarterlyAlert,
    certSummary,
    managerNotes,
    mentorNotes,
    mentor,
  } = snapshot;

  const [now] = useState(() => Date.now());
  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;
  const steps = [...(plan?.steps ?? [])].sort((a, b) => a.order - b.order);
  const validated = steps.filter((step) => step.status === "reviewed" || step.status === "completed").length;
  const gates = buildGates(certSummary);
  const pendingSubmissions = submissions.filter((item) => item.status === "submitted");
  const pendingCards = coachingCards.filter((card) => card.managerReviewStatus === "pending" && !card.isPractice);
  const awaitingSteps = steps.filter((step) => step.status === "submitted" || step.status === "under_review");
  const sentBackCards = coachingCards.filter((card) => card.managerReviewStatus === "needs_revision");
  const sentBackSubmissions = submissions.filter((item) => item.status === "in_progress" && item.managerFeedback);
  const rampWeek = rampWeekFor(plan, now);
  const subline = rampWeek !== null ? `${profile.level}, week ${rampWeek}` : profile.level;
  const simScore = coaching.latestSimScore ?? coaching.avgSimScore;

  const stats: Array<{ label: string; value: ReactNode }> = [
    { label: "Ramp", value: steps.length ? `${validated}/${steps.length}` : "None" },
    {
      label: "Sim score",
      value: simScore ?? "None",
    },
    {
      label: "Dev goals",
      value: coaching.devGoalsTotal > 0 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}` : "None",
    },
    { label: "Reviews", value: openReviewCount },
  ];

  return (
    <Drawer
      footer={
        <>
          <button
            className="btn-primary"
            onClick={() => {
              downloadOneOnOneIcs({
                name: profile.fullName,
                email: profile.email,
                level: profile.level,
                talkingPoints: coaching.talkingPoints.slice(0, 4),
              });
              toast.success(`1:1 invite for ${firstName} downloaded`);
            }}
            type="button"
          >
            Schedule 1:1
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(coaching.talkingPoints.join("\n"))
                .then(() => toast.success("Talking points copied"))
                .catch(() => toast.error("Couldn't copy to the clipboard"));
            }}
            type="button"
          >
            Copy talking points
          </button>
        </>
      }
      mainLabel="Overview"
      onClose={onClose}
      open
      side={
        <>
          <Section title="Mentor and notes">
            {plan ? (
              <ManagerReassignMentor
                assignmentId={plan.id}
                currentMentorId={plan.mentorId}
                mentors={mentors}
                seName={profile.fullName}
              />
            ) : null}
            {mentorNotes ? (
              <MentorNotesForManager
                mentorName={mentorNotes.mentorName}
                notes={mentorNotes.notes}
                updatedAt={mentorNotes.updatedAt}
              />
            ) : null}
            <ManagerCoachingNotes initialNotes={managerNotes} seUserId={profile.id} />
          </Section>

          <Section title="Assign a simulation">
            <div className="rounded-[14px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
              <SimulationAssignForm
                assignees={[profile]}
                defaultAssigneeId={profile.id}
                submitVariant="secondary"
                teamAssignees={teamAssignees ?? profiles}
              />
            </div>
          </Section>

          <Section title="Field activity">
            <FieldActivity fullName={profile.fullName} />
          </Section>

          <Section title="Recent activity">
            {activity.length > 0 ? (
              <LineList>
                {activity.slice(0, 10).map((item) => (
                  <LineRow key={item.id}>
                    <span className="text-sm text-ink">{item.title}</span>
                    <span className="shrink-0 text-[13px] text-muted">{shortDate(item.createdAt)}</span>
                  </LineRow>
                ))}
              </LineList>
            ) : (
              <p className="text-sm">No activity recorded yet.</p>
            )}
          </Section>
        </>
      }
      sideLabel="Coach"
      title={
        <span className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-blue-soft text-[15px] font-bold text-blue"
          >
            {initials(profile.fullName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">{profile.fullName}</span>
            <span className="text-sm font-normal tracking-normal text-muted">{subline}</span>
          </span>
        </span>
      }
    >
      <>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <StatusPill tone={HEALTH_TONE[coaching.health]}>{coaching.healthLabel}</StatusPill>
          <span className="text-[13px] text-muted">{coaching.lastActiveLabel}</span>
          <a className="link min-w-0 truncate text-[13px]" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </div>

        <dl className="grid grid-cols-4 overflow-hidden rounded-[14px] border border-line bg-white">
          {stats.map((stat) => (
            <div className="flex flex-col gap-1.5 border-r border-divider px-3 py-3 last:border-r-0" key={stat.label}>
              <dt className="label-caps whitespace-nowrap">{stat.label}</dt>
              <dd
                className={`num text-[24px] leading-none font-extrabold tracking-[-0.03em] ${
                  stat.label === "Sim score" && typeof simScore === "number" ? scoreTone(simScore) : "text-blue"
                }`}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-3">
          <p className="text-ink">{coaching.storyLine}</p>
          {coaching.currentFocus ? (
            <p className="text-sm">
              <span className="font-bold text-ink">Current focus:</span> {coaching.currentFocus}
            </p>
          ) : null}
          {coaching.talkingPoints.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="label-caps">1:1 talking points</h3>
              <ol className="overflow-hidden rounded-[14px] border border-line bg-white">
                {coaching.talkingPoints.slice(0, 4).map((point) => (
                  <li className="border-b border-divider px-4 py-2.5 text-sm text-ink last:border-b-0" key={point}>
                    {point}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        {openReviewCount > 0 ? (
          <Section
            action={
              <Link className="link text-sm" href={managerSectionHref("inbox")}>
                Open inbox
              </Link>
            }
            title={`Waiting on you (${openReviewCount})`}
          >
            <LineList>
              {pendingSubmissions.map((submission) => (
                <LineRow key={submission.id}>
                  <span className="min-w-0">
                    <Kind>Challenge</Kind>
                    <span className="block font-bold text-ink">
                      {challenges.find((c) => c.id === submission.challengeId)?.title ?? "Challenge submission"}
                    </span>
                  </span>
                  {submission.submittedAt ? (
                    <span className="shrink-0 text-[13px] text-muted">{ageLabel(submission.submittedAt, now)}</span>
                  ) : null}
                </LineRow>
              ))}
              {pendingCards.map((card) => (
                <LineRow key={card.id}>
                  <span className="min-w-0">
                    <Kind>Sim card</Kind>
                    <span className="block font-bold text-ink">
                      {card.simulationContext?.persona ?? "Simulation coaching card"}
                    </span>
                  </span>
                  <span className={`num text-xl font-extrabold tracking-[-0.03em] ${scoreTone(card.score)}`}>
                    {card.score}
                  </span>
                </LineRow>
              ))}
              {awaitingSteps.map((step) => (
                <LineRow key={step.id}>
                  <span className="min-w-0">
                    <Kind>{step.isSegmentGate ? "Gate step" : "Plan step"}</Kind>
                    <span className="block font-bold text-ink">{step.title}</span>
                  </span>
                  {stepStatus(step)}
                </LineRow>
              ))}
              {certSummary.items
                .filter((cert) => cert.status === "submitted")
                .map((cert) => (
                  <LineRow key={cert.type}>
                    <span className="min-w-0">
                      <Kind>Certification gate</Kind>
                      <span className="block font-bold text-ink">{cert.label}</span>
                    </span>
                    {certStatus(cert.status)}
                  </LineRow>
                ))}
            </LineList>
          </Section>
        ) : null}

        {sentBackCards.length > 0 || sentBackSubmissions.length > 0 ? (
          <Section title="Sent back for changes">
            <LineList>
              {sentBackCards.map((card) => (
                <LineRow key={card.id}>
                  <span className="min-w-0">
                    <Kind>
                      Sim card, scored <span className={`num font-bold ${scoreTone(card.score)}`}>{card.score}</span>
                    </Kind>
                    <span className="block font-bold text-ink">{card.simulationContext?.persona ?? "Simulation"}</span>
                    {card.managerComments ? (
                      <span className="mt-1 line-clamp-3 block text-sm">{card.managerComments}</span>
                    ) : null}
                  </span>
                </LineRow>
              ))}
              {sentBackSubmissions.map((submission) => (
                <LineRow key={submission.id}>
                  <span className="min-w-0">
                    <Kind>Challenge</Kind>
                    <span className="block font-bold text-ink">
                      {challenges.find((c) => c.id === submission.challengeId)?.title ?? "Challenge"}
                    </span>
                    {submission.managerFeedback ? (
                      <span className="mt-1 line-clamp-3 block text-sm">{submission.managerFeedback}</span>
                    ) : null}
                  </span>
                </LineRow>
              ))}
            </LineList>
          </Section>
        ) : null}

        <Section title="Ramp plan">
          {plan ? (
            <>
              <p className="text-sm">
                <span className="font-bold text-ink">{plan.name}</span>
                {mentor ? (
                  <>
                    . Mentored by <span className="font-bold text-ink">{mentor.fullName}</span>.
                  </>
                ) : null}
              </p>
              <ol className="overflow-hidden rounded-[14px] border border-line bg-white">
                {steps.map((step, index) => (
                  <li className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0" key={step.id}>
                    <span className="num w-6 shrink-0 pt-px text-[13px] font-bold text-muted">{index + 1}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="block text-sm font-bold text-ink">{step.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {step.isSegmentGate ? <Tag tone="blue">Gate</Tag> : null}
                        <Tag>{sentence(step.type)}</Tag>
                        {step.dueDate ? <span className="text-[13px] text-muted">Due {shortDate(step.dueDate)}</span> : null}
                      </span>
                    </span>
                    <span className="shrink-0">{stepStatus(step)}</span>
                  </li>
                ))}
              </ol>
              <ManagerAddAdHocTask assignmentId={plan.id} personName={profile.fullName} />
            </>
          ) : (
            <>
              <p className="text-sm">No ramp plan assigned yet.</p>
              <ManagerPlanAssignPanel
                assignees={[profile]}
                compact
                defaultUserId={profile.id}
                mentors={mentors}
                onAssigned={onClose}
                plans={plans}
              />
            </>
          )}
        </Section>

        <Section title="Certification gates">
          <LineList>
            {gates.map((gate) => {
              const status = certSummary.items.find((item) => item.type === gate.id)?.status ?? "not_started";
              return (
                <LineRow key={gate.id}>
                  <span className="flex min-w-0 items-center gap-3">
                    <Stamp label={`${gate.label}: ${GATE_CAPTION[gate.state]}`} size={24} state={gate.state} />
                    <span className="text-sm font-bold text-ink">{gate.label}</span>
                  </span>
                  {certStatus(status)}
                </LineRow>
              );
            })}
          </LineList>
          <p className="text-sm">
            {certSummary.nextGateLabel ? (
              <>
                Next gate: <span className="font-bold text-ink">{certSummary.nextGateLabel}</span>.
              </>
            ) : (
              "Every gate for this level is cleared."
            )}
          </p>
          {coaching.careerReadiness !== null ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <span className={`num font-bold ${scoreTone(coaching.careerReadiness)}`}>{coaching.careerReadiness}%</span>{" "}
                ready for the next level.
              </p>
              <ScoreBar target={READINESS_TARGET} value={coaching.careerReadiness} />
            </div>
          ) : null}
        </Section>

        <Section title="Simulation trend">
          <SimTrendChart trend={simTrend} />
          {cohortBenchmark ? (
            <div className="flex flex-col gap-1 text-sm">
              <p>{cohortBenchmark.simComparisonLabel}</p>
              <p>{cohortBenchmark.onboardingComparisonLabel}</p>
            </div>
          ) : null}
          {coaching.topGaps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Biggest gaps</span>
              <div className="flex flex-wrap gap-1.5">
                {coaching.topGaps.map((gap) => (
                  <Tag key={gap} tone="warning">
                    {gap}
                  </Tag>
                ))}
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          action={
            <Link className="link text-sm" href={`/development?profile=${profile.id}`}>
              Open plan
            </Link>
          }
          title="Development goals"
        >
          {quarterlyAlert && quarterlyAlert.pendingGoals > 0 ? (
            <p className="flex flex-col gap-1 text-sm">
              <StatusPill tone={quarterlyAlert.overdue ? "danger" : "warning"}>
                {quarterlyAlert.overdue ? "Overdue" : "Due soon"}
              </StatusPill>
              <span>{quarterlyAlert.label}</span>
            </p>
          ) : null}
          {developmentPlan && developmentPlan.goals.length > 0 ? (
            <LineList>
              {developmentPlan.goals.map((goal) => {
                const quarter = currentQuarter();
                const review = goal.quarterlyReviews.find(
                  (item) => item.quarter === quarter && item.year === developmentPlan.year,
                );
                const onTrack = goal.overallStatus === "on_track" || goal.overallStatus === "achieved";
                return (
                  <LineRow key={goal.id}>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{goal.title}</span>
                      {review ? (
                        <span className="block text-[13px] text-muted">
                          {quarter} review {review.status.replaceAll("_", " ")}
                          {review.dueDate ? `, due ${shortDate(review.dueDate)}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <StatusPill tone={onTrack ? "success" : "warning"}>{sentence(goal.overallStatus)}</StatusPill>
                  </LineRow>
                );
              })}
            </LineList>
          ) : (
            <p className="text-sm">No development plan yet.</p>
          )}
        </Section>

      </>
    </Drawer>
  );
}
