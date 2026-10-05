"use client";

import { format, formatDistanceToNow } from "date-fns";
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
import { IdBadge } from "@/components/ui/id-badge";
import { Tag } from "@/components/ui/tag";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { CertSummary, CohortBenchmark, QuarterlyAlert, SimTrend } from "@/lib/manager/growth-insights";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { buildGates } from "@/lib/manager/team-status";
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
};

function stepTag(step: PlanStep) {
  if (step.status === "reviewed" || step.status === "completed") return <Tag tone="success">✓ Validated</Tag>;
  if (step.status === "under_review") return <Tag tone="signal">● Mentor endorsed</Tag>;
  if (step.status === "submitted") return <Tag tone="signal">● Your sign-off</Tag>;
  if (step.status === "in_progress") return <Tag tone="blue">• In progress</Tag>;
  return <Tag>• Not started</Tag>;
}

function certTag(status: string) {
  if (status === "approved") return <Tag tone="success">✓ Cleared</Tag>;
  if (status === "submitted") return <Tag tone="signal">● Ready</Tag>;
  if (status === "in_progress") return <Tag tone="blue">• In progress</Tag>;
  return <Tag>• Not yet</Tag>;
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-divider pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-extrabold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function LineList({ children }: { children: ReactNode }) {
  return <ul className="overflow-hidden rounded-[14px] border border-line bg-white">{children}</ul>;
}

function LineRow({ children }: { children: ReactNode }) {
  return <li className="flex items-start justify-between gap-3 border-b border-divider px-4 py-3 last:border-b-0">{children}</li>;
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
    return <p className="label-mono">Loading field activity…</p>;
  }
  if (lab.length === 0 && engagement.length === 0) {
    return <p className="text-sm text-muted">No ISC Lab sessions or buyer engagement recorded recently.</p>;
  }
  return (
    <LineList>
      {lab.slice(0, 3).map((row) => (
        <LineRow key={`lab-${row.id}`}>
          <span className="min-w-0">
            <span className="label-mono">ISC Lab</span>
            <span className="block truncate text-sm text-ink">{row.query}</span>
          </span>
          <span className="shrink-0 font-mono text-xs text-muted">{format(new Date(row.createdAt), "dd MMM")}</span>
        </LineRow>
      ))}
      {engagement.slice(0, 3).map((row, index) => (
        <LineRow key={`eng-${index}-${row.createdAt}`}>
          <span className="min-w-0">
            <span className="label-mono">{row.eventType.replaceAll("_", " ")}</span>
            <span className="block truncate text-sm text-ink">
              {row.accountName} · {row.resourceLabel}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs text-muted">{format(new Date(row.createdAt), "dd MMM")}</span>
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

  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;
  const steps = [...(plan?.steps ?? [])].sort((a, b) => a.order - b.order);
  const validated = steps.filter((step) => step.status === "reviewed" || step.status === "completed").length;
  const gates = buildGates(certSummary);
  const pendingSubmissions = submissions.filter((item) => item.status === "submitted");
  const pendingCards = coachingCards.filter((card) => card.managerReviewStatus === "pending" && !card.isPractice);
  const awaitingSteps = steps.filter((step) => step.status === "submitted" || step.status === "under_review");
  const sentBackCards = coachingCards.filter((card) => card.managerReviewStatus === "needs_revision");
  const sentBackSubmissions = submissions.filter((item) => item.status === "in_progress" && item.managerFeedback);
  const healthTone =
    coaching.health === "on_track" ? "success" : coaching.health === "waiting_on_se" ? "blue" : "danger";
  const healthSymbol = coaching.health === "on_track" ? "✓" : coaching.health === "waiting_on_se" ? "•" : "▲";

  const stats = [
    { label: "Ramp", value: steps.length ? `${validated}/${steps.length}` : "—" },
    { label: "Sim avg", value: String(coaching.latestSimScore ?? coaching.avgSimScore ?? "—") },
    {
      label: "Dev goals",
      value: coaching.devGoalsTotal > 0 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}` : "—",
    },
    { label: "Reviews", value: String(openReviewCount) },
  ];

  return (
    <Drawer
      footer={
        <div className="flex flex-wrap items-center gap-3.5">
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
        </div>
      }
      onClose={onClose}
      open
      title={
        <span className="flex flex-col gap-1.5">
          <span className="label-mono">
            {profile.level} SE · {profile.email}
          </span>
          <span className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.015em]">{profile.fullName}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-5 text-[15px] text-ink-2">
        <IdBadge
          footer={
            certSummary.nextGateLabel ? (
              <span className="text-on-blue">
                Next stamp: <span className="font-bold text-white">{certSummary.nextGateLabel}</span>
              </span>
            ) : (
              <span className="text-on-blue">Every gate for this level is cleared.</span>
            )
          }
          gates={gates.map((gate) => ({ ...gate, label: gate.label.split(" ")[0] ?? gate.label }))}
          idLine={`${profile.level} · ${plan?.name ?? "No ramp plan"}`}
          initials={initials(profile.fullName)}
          name={profile.fullName}
        />

        <dl className="grid grid-cols-4 overflow-hidden rounded-[14px] border border-line bg-white">
          {stats.map((stat) => (
            <div className="flex flex-col gap-1 border-r border-divider px-3 py-2.5 last:border-r-0" key={stat.label}>
              <dt className="label-mono">{stat.label}</dt>
              <dd className="text-[22px] leading-none font-extrabold tracking-[-0.03em] text-blue">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tag className="bg-transparent" tone={healthTone}>
              {healthSymbol} {coaching.healthLabel}
            </Tag>
            <span className="font-mono text-xs text-muted">{coaching.lastActiveLabel}</span>
          </div>
          <p className="text-ink">{coaching.storyLine}</p>
          {coaching.currentFocus ? (
            <p className="text-sm">
              <span className="font-bold text-ink">Current focus:</span> {coaching.currentFocus}
            </p>
          ) : null}
          <div className="rounded-[14px] bg-blue-soft px-4 py-3">
            <p className="label-mono">1:1 talking points</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink">
              {coaching.talkingPoints.slice(0, 4).map((point) => (
                <li className="flex gap-2" key={point}>
                  <span aria-hidden className="text-blue">
                    •
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {openReviewCount > 0 ? (
          <Section
            action={
              <Link className="link text-sm" href={managerSectionHref("inbox")}>
                Open inbox
              </Link>
            }
            title={`Waiting on you · ${openReviewCount}`}
          >
            <LineList>
              {pendingSubmissions.map((submission) => (
                <LineRow key={submission.id}>
                  <span className="min-w-0">
                    <span className="label-mono">Challenge</span>
                    <span className="block font-bold text-ink">
                      {challenges.find((c) => c.id === submission.challengeId)?.title ?? "Challenge submission"}
                    </span>
                  </span>
                  {submission.submittedAt ? (
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                    </span>
                  ) : null}
                </LineRow>
              ))}
              {pendingCards.map((card) => (
                <LineRow key={card.id}>
                  <span className="min-w-0">
                    <span className="label-mono">Sim card</span>
                    <span className="block font-bold text-ink">
                      {card.simulationContext?.persona ?? "Simulation coaching card"}
                    </span>
                  </span>
                  <span className="text-xl font-extrabold tracking-[-0.03em] text-ink">{card.score}</span>
                </LineRow>
              ))}
              {awaitingSteps.map((step) => (
                <LineRow key={step.id}>
                  <span className="min-w-0">
                    <span className="label-mono">{step.isSegmentGate ? "◆ Gate step" : "Plan step"}</span>
                    <span className="block font-bold text-ink">{step.title}</span>
                  </span>
                  {stepTag(step)}
                </LineRow>
              ))}
              {certSummary.items
                .filter((cert) => cert.status === "submitted")
                .map((cert) => (
                  <LineRow key={cert.type}>
                    <span className="min-w-0">
                      <span className="label-mono">Cert gate</span>
                      <span className="block font-bold text-ink">{cert.label}</span>
                    </span>
                    {certTag(cert.status)}
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
                    <span className="label-mono">Sim card · {card.score}</span>
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
                    <span className="label-mono">Challenge</span>
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
                {plan.name}
                {mentor ? (
                  <>
                    {" "}
                    · Mentor <span className="font-bold text-ink">{mentor.fullName}</span>
                  </>
                ) : null}
              </p>
              <ol className="overflow-hidden rounded-[14px] border border-line bg-white">
                {steps.map((step, index) => (
                  <li
                    className={`flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0 ${
                      step.isSegmentGate ? "bg-blue-soft" : ""
                    }`}
                    key={step.id}
                  >
                    <span className="w-7 shrink-0 text-lg leading-none font-extrabold text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{step.title}</span>
                      <span className="label-mono">
                        {step.isSegmentGate ? "◆ Gate · " : ""}
                        {step.type.replaceAll("_", " ")}
                        {step.dueDate ? ` · due ${format(new Date(step.dueDate), "dd MMM")}` : ""}
                      </span>
                    </span>
                    {stepTag(step)}
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
                  <span className="text-sm font-bold text-ink">{gate.label}</span>
                  {certTag(status)}
                </LineRow>
              );
            })}
          </LineList>
          {coaching.careerReadiness !== null ? (
            <p className="text-sm">
              <span className="font-bold text-ink">{coaching.careerReadiness}%</span> ready for the next level.
            </p>
          ) : null}
        </Section>

        <Section title="Assign a simulation">
          <SimulationAssignForm
            assignees={[profile]}
            defaultAssigneeId={profile.id}
            teamAssignees={teamAssignees ?? profiles}
          />
        </Section>

        <Section title="Simulation trend">
          <SimTrendChart trend={simTrend} />
          {cohortBenchmark ? (
            <p className="text-sm">
              {cohortBenchmark.simComparisonLabel} · {cohortBenchmark.onboardingComparisonLabel}
            </p>
          ) : null}
          {coaching.topGaps.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {coaching.topGaps.map((gap) => (
                <Tag key={gap} tone="warning">
                  ▲ {gap}
                </Tag>
              ))}
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
            <p className={`rounded-[14px] px-4 py-3 text-sm ${quarterlyAlert.overdue ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>
              {quarterlyAlert.overdue ? "▲ " : "• "}
              {quarterlyAlert.label}
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
                        <span className="label-mono">
                          {quarter} · {review.status.replaceAll("_", " ")}
                          {review.dueDate ? ` · due ${format(new Date(review.dueDate), "dd MMM")}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <Tag tone={onTrack ? "success" : "warning"}>
                      {onTrack ? "✓" : "•"} {goal.overallStatus.replaceAll("_", " ")}
                    </Tag>
                  </LineRow>
                );
              })}
            </LineList>
          ) : (
            <p className="text-sm">No development plan yet.</p>
          )}
        </Section>

        <Section title="Field activity">
          <FieldActivity fullName={profile.fullName} />
        </Section>

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

        <Section title="Recent activity">
          {activity.length > 0 ? (
            <LineList>
              {activity.slice(0, 10).map((item) => (
                <LineRow key={item.id}>
                  <span className="text-sm text-ink">{item.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </LineRow>
              ))}
            </LineList>
          ) : (
            <p className="text-sm">No activity recorded yet.</p>
          )}
        </Section>
      </div>
    </Drawer>
  );
}
