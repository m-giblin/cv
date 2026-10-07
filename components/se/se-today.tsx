import Link from "next/link";
import { GateStampsCard } from "@/components/se/gate-stamps-card";
import { Greeting } from "@/components/se/greeting";
import { RampDefinitionCard } from "@/components/se/ramp-definition-card";
import { FlightStrip } from "@/components/ui/flight-strip";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { ASSIGNMENT_STATE_LABELS, dueLabel, type PlaybookAssignment } from "@/lib/playbooks/assignment-model";
import { Schedule } from "@/components/ui/schedule";
import { StatusPill } from "@/components/ui/status-pill";
import { planStepTypeLabel } from "@/lib/plans/step-labels";
import type { GateRow } from "@/lib/se/gate-matrix";
import {
  buildRampModel,
  dayAndMonth,
  daysUntil,
  formatDay,
  isStepValidated,
  isStepWithReviewer,
  numberWord,
  pad2,
  stepDetailHref,
  stepLifecycle,
  type RampModel,
} from "@/lib/se/ramp-model";
import type { DashboardData, PlanStep } from "@/lib/types";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function primaryLabel(step: PlanStep): string {
  return step.status === "in_progress"
    ? `Continue ${planStepTypeLabel(step.type).toLowerCase()}`
    : planStepActionLabel(step);
}

/** Serif accent and subtitle for the hero, from the SE's actual next step. */
function heroCopy(model: RampModel | null, reviewerFirst: string | null): { accent?: string; subtitle?: string } {
  if (!model) return { subtitle: "Your ramp plan shows up here once your manager assigns it." };
  const next = model.nextStep;
  if (!next) return { accent: "Field ready.", subtitle: "Every ramp step is validated. Keep your certification gates moving." };
  const word = capitalize(numberWord(model.nextStepNumber));
  const after = model.upcoming[0];
  if (isStepWithReviewer(next.status)) {
    return {
      accent: `Step ${numberWord(model.nextStepNumber)} is with ${reviewerFirst ?? "your manager"}.`,
      subtitle: after ? `While you wait, ${after.title} is next.` : "It is the last step on your ramp.",
    };
  }
  return {
    accent: `Step ${numberWord(model.nextStepNumber)} is yours.`,
    subtitle: after
      ? `One validation stands between you and ${after.title}.`
      : `${word} is the last step on your ramp.`,
  };
}

function scheduleMeta(step: PlanStep, model: RampModel, minutes: number | null): string {
  const segment = model.segments.find((item) => item.index === (step.segmentIndex ?? 0));
  if (step.isSegmentGate) return segment ? `Closes the ${segment.label.toLowerCase()} segment` : "Closes this segment";
  if (step.locked) return "Unlocks when the current gate clears";
  const type = planStepTypeLabel(step.type);
  return minutes ? `${type}, about ${minutes} min` : type;
}

/** SE › Today (artboard 1a): the next step first, what's coming up, then the ramp and the gates in the rail. */
export function SeToday({
  data,
  gateRows,
  calendarEnabled = false,
  playbookAssignments = [],
}: {
  data: DashboardData;
  gateRows: GateRow[];
  calendarEnabled?: boolean;
  /** Playbooks a manager assigned, with due dates and live progress. */
  playbookAssignments?: PlaybookAssignment[];
}) {
  const user = data.currentUser;
  const firstName = user.fullName.split(" ")[0] ?? "there";
  const plan = data.plans.find((item) => item.userId === user.id);
  const manager = data.profiles.find((profile) => profile.id === user.managerId);
  const mentor = plan?.mentorId ? data.profiles.find((profile) => profile.id === plan.mentorId) : undefined;
  const model = plan ? buildRampModel(plan) : null;
  const next = model?.nextStep ?? null;
  const reviewerProfile = next?.type === "mentor_review" && mentor ? mentor : manager;
  const reviewerFirst = reviewerProfile?.fullName.split(" ")[0] ?? null;
  const minutesFor = (step: PlanStep) =>
    step.challengeId ? (data.challenges.find((item) => item.id === step.challengeId)?.estimatedMinutes ?? null) : null;

  const currentSegment = model?.segments.find((segment) => segment.state === "current");
  const eyebrow = model ? (
    <>
      Week {model.currentWeek} of {model.totalWeeks}
      {currentSegment && currentSegment.index !== 0 ? <>&nbsp;/&nbsp;{currentSegment.label}</> : null}
    </>
  ) : (
    `${user.level} SE`
  );
  const hero = heroCopy(model, reviewerFirst);

  const scheduleRows = model
    ? model.upcoming.slice(0, 3).map((step) => {
        const { day, month } = dayAndMonth(step.dueDate);
        return {
          id: step.id,
          day,
          month,
          gate: Boolean(step.isSegmentGate),
          title: step.title,
          meta: scheduleMeta(step, model, minutesFor(step)),
        };
      })
    : [];

  const overdueDays = next && !isStepValidated(next.status) ? daysUntil(next.dueDate) : null;
  const nextMinutes = next ? minutesFor(next) : null;

  return (
    <div className="flex flex-col pb-7">
      <PageHeader
        accent={hero.accent}
        eyebrow={eyebrow}
        size="hero"
        subtitle={hero.subtitle}
        title={<Greeting firstName={firstName} />}
      />

      <PageBody>
        <div className="grid items-start gap-[var(--rail-gap)] xl:grid-cols-[minmax(0,1fr)_clamp(360px,40%,520px)]">
          <div className="flex min-w-0 flex-col gap-8">
            {!plan || !model ? (
              <div className="rounded-[14px] border border-dashed border-line-strong p-7 text-[15px] text-muted">
                <h2 className="text-lg font-extrabold text-ink">No ramp plan yet</h2>
                <p className="mt-1">
                  {manager
                    ? `${manager.fullName} will assign your ramp plan. You can reach them at ${manager.email}.`
                    : "Your manager will assign a ramp plan when you join the program."}
                </p>
              </div>
            ) : next ? (
              <FlightStrip
                lifecycle={stepLifecycle(next, reviewerFirst)}
                numeral={pad2(model.nextStepNumber)}
                numeralCaption={`of ${model.total}`}
                stubLabel={isStepWithReviewer(next.status) ? "Waiting" : "Next step"}
              >
                <h2 className="text-[26px] leading-[1.1] font-extrabold tracking-[-0.015em] text-ink">{next.title}</h2>
                {next.description ? (
                  <p className="max-w-[560px] text-base leading-[1.55] text-ink-2">{next.description}</p>
                ) : null}
                <p className="flex flex-wrap items-center gap-x-7 gap-y-1 text-sm text-muted">
                  {next.dueDate ? (
                    <span>
                      Due <b className="text-ink">{formatDay(next.dueDate)}</b>
                    </span>
                  ) : null}
                  {nextMinutes ? (
                    <span>
                      About <b className="text-ink">{nextMinutes} min</b>
                    </span>
                  ) : null}
                  {reviewerProfile ? (
                    <span>
                      Reviewer <b className="text-ink">{reviewerProfile.fullName}</b>
                    </span>
                  ) : null}
                  {overdueDays !== null && overdueDays < 0 && !isStepWithReviewer(next.status) ? (
                    <StatusPill tone="danger">
                      {Math.abs(overdueDays)} {overdueDays === -1 ? "day" : "days"} overdue
                    </StatusPill>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center gap-[18px] pt-1">
                  {isStepWithReviewer(next.status) ? (
                    <button className="btn-primary" disabled type="button">
                      Waiting on {reviewerFirst ?? "your manager"}
                    </button>
                  ) : next.locked ? (
                    <button className="btn-primary" disabled type="button">
                      Locked until the gate clears
                    </button>
                  ) : (
                    <Link className="btn-primary" href={planStepHref(next)}>
                      {primaryLabel(next)}
                    </Link>
                  )}
                  {next.assignmentStepId ? (
                    <Link className="link text-[15px]" href={stepDetailHref(next)}>
                      View criteria
                    </Link>
                  ) : null}
                </div>
              </FlightStrip>
            ) : (
              <FlightStrip numeral={pad2(model.total)} numeralCaption={`of ${model.total}`} stubLabel="Field ready">
                <h2 className="text-[26px] leading-[1.1] font-extrabold tracking-[-0.015em] text-ink">
                  Every ramp step is validated.
                </h2>
                <p className="max-w-[560px] text-base leading-[1.55] text-ink-2">
                  Keep your certification gates moving and your skills sharp in Practice.
                </p>
                <div className="pt-1">
                  <Link className="btn-primary" href="/readiness/certification">
                    Open certification
                  </Link>
                </div>
              </FlightStrip>
            )}

            <PlaybooksDue assignments={playbookAssignments} />

            {scheduleRows.length > 0 ? (
              <section aria-labelledby="coming-up" className="flex flex-col">
                <div className="flex items-baseline justify-between gap-4 pb-3">
                  <h2 className="text-xl font-extrabold text-ink" id="coming-up">
                    Coming up
                  </h2>
                  <Link className="link text-sm" href={calendarEnabled ? "/my-plan?view=calendar" : "/my-plan"}>
                    {calendarEnabled ? "Open calendar" : "See my ramp"}
                  </Link>
                </div>
                <Schedule rows={scheduleRows} />
              </section>
            ) : null}
          </div>

          <aside aria-label="Ramp and gates" className="flex min-w-0 flex-col gap-6">
            <RampDefinitionCard model={model} />
            {gateRows.length > 0 ? <GateStampsCard level={user.level} rows={gateRows} /> : null}
          </aside>
        </div>
      </PageBody>
    </div>
  );
}

/** Open playbook assignments, soonest first, each linking straight to the playbook. */
function PlaybooksDue({ assignments }: { assignments: PlaybookAssignment[] }) {
  const open = assignments
    .filter((item) => item.status === "active" && item.progress.state !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!open.length) return null;
  const shown = open.slice(0, 4);

  return (
    <section aria-labelledby="playbooks-due" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <h2 className="text-xl font-extrabold text-ink" id="playbooks-due">
          Playbooks due
        </h2>
        <Link className="link text-sm" href="/learn/playbooks">
          {open.length > shown.length ? `See all ${open.length}` : "Open playbooks"}
        </Link>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
        {shown.map((item) => {
          const remaining = item.progress.parts.filter((part) => !part.done).length;
          return (
            <li key={item.id}>
              <Link
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 no-underline hover:bg-blue-soft/40"
                href={`/learn/playbooks?playbook=${item.playbookSlug}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold text-ink">{item.playbookTitle}</span>
                  <span className="text-[13px] text-muted">
                    {remaining} of {item.progress.parts.length} left{item.assignedByName ? ` · from ${item.assignedByName}` : ""}
                  </span>
                </span>
                <span className={item.progress.state === "overdue" ? "text-[13px] font-bold text-danger" : "text-[13px] font-bold text-ink-2"}>
                  {dueLabel(item.progress, item.dueDate)}
                </span>
                {item.progress.state === "overdue" ? <StatusPill tone="danger">{ASSIGNMENT_STATE_LABELS.overdue}</StatusPill> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
