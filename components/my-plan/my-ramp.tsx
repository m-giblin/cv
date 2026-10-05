import Link from "next/link";
import type { ReactNode } from "react";
import { PlanStepActions } from "@/components/plans/plan-step-actions";
import { FlightStrip } from "@/components/ui/flight-strip";
import { RampCard } from "@/components/ui/ramp-card";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Tag } from "@/components/ui/tag";
import {
  formatShortDate,
  isStepValidated,
  isStepWithReviewer,
  pad2,
  paceLabel,
  stepMeta,
  stepStatusTag,
  type RampModel,
  type RampSegment,
} from "@/lib/se/ramp-model";
import type { PlanStep, Profile, UserPlan } from "@/lib/types";
import { planStepHref } from "@/lib/utils/plan-links";
import { cn } from "@/lib/utils";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function planWindow(plan: UserPlan): string | null {
  if (!plan.startDate || !plan.targetCompletion) return null;
  const fmt = (iso: string) => {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  };
  return `${fmt(plan.startDate)} – ${fmt(plan.targetCompletion)}`;
}

function segmentStartDate(plan: UserPlan, segment: RampSegment): string | null {
  if (!plan.startDate) return null;
  const date = new Date(`${plan.startDate.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + (segment.startWeek - 1) * 7);
  return formatShortDate(date.toISOString());
}

function weekRange(segment: RampSegment): string {
  return segment.startWeek === segment.endWeek
    ? `W${pad2(segment.startWeek)}`
    : `W${pad2(segment.startWeek)}–${pad2(segment.endWeek)}`;
}

/** Steps with an assignment open in place (`?step=`); others go to their practice tool. */
export function stepDetailHref(step: PlanStep): string {
  return step.assignmentStepId ? `/my-plan?step=${encodeURIComponent(step.assignmentStepId)}` : planStepHref(step);
}

export function RampHeader({
  plan,
  view,
  calendarEnabled,
}: {
  plan: UserPlan | undefined;
  view: "list" | "calendar";
  calendarEnabled: boolean;
}) {
  const window = plan ? planWindow(plan) : null;
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 px-[var(--gutter)] pt-6 pb-[18px]">
      <div className="flex min-w-0 flex-col gap-1.5">
        {plan ? <p className="label-mono">{[plan.name, window].filter(Boolean).join(" · ")}</p> : null}
        <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">My ramp</h1>
      </div>
      {plan && calendarEnabled ? (
        <SegmentedToggle
          label="Ramp view"
          options={[
            { id: "list", label: "List", href: "/my-plan" },
            { id: "calendar", label: "Calendar", href: "/my-plan?view=calendar" },
          ]}
          value={view}
        />
      ) : null}
    </header>
  );
}

function StepRow({ step, number }: { step: PlanStep; number: number }) {
  const tag = step.isSegmentGate ? { label: "◆ GATE", tone: "blue" as const } : stepStatusTag(step);
  const validated = isStepValidated(step.status);
  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 border-b border-divider px-[18px] py-[13px] text-[15px] last:border-b-0 sm:grid-cols-[60px_minmax(0,1fr)_120px_90px]",
        step.isSegmentGate && "bg-blue-soft",
      )}
    >
      {step.isSegmentGate ? (
        <span aria-hidden className="flex justify-center">
          <span className="h-3.5 w-3.5 rotate-45 border-[2.5px] border-blue" />
        </span>
      ) : (
        <span aria-hidden className="text-[22px] font-extrabold tracking-[-0.03em] text-faint">
          {pad2(number)}
        </span>
      )}
      <span className="min-w-0">
        <span className="sr-only">Step {number}: </span>
        {step.locked ? (
          <span className={cn("text-ink", step.isSegmentGate ? "font-bold" : "font-semibold")}>{step.title}</span>
        ) : (
          <Link
            className={cn(
              "text-ink underline decoration-transparent decoration-2 underline-offset-[3px] hover:decoration-signal",
              step.isSegmentGate ? "font-bold" : "font-semibold",
              validated && "text-ink-2",
            )}
            href={stepDetailHref(step)}
          >
            {step.title}
          </Link>
        )}
      </span>
      <span className="col-start-2 sm:col-start-auto">
        <Tag tone={tag.tone}>{tag.label}</Tag>
      </span>
      <span className="col-start-2 font-mono text-xs text-ink sm:col-start-auto sm:text-right">
        {formatShortDate(step.dueDate) ?? "—"}
      </span>
    </li>
  );
}

function SegmentBar({ segment, plan, variant }: { segment: RampSegment; plan: UserPlan; variant: "done" | "upcoming" }) {
  const start = segmentStartDate(plan, segment);
  return variant === "done" ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-blue px-[18px] py-[11px] font-mono text-xs uppercase">
      <span className="text-white">
        {weekRange(segment)} · {segment.label} ◆
      </span>
      <span className="text-signal">
        {segment.validated}/{segment.steps.length} validated ✓
      </span>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border-[1.5px] border-dashed border-dash px-[18px] py-[11px] font-mono text-xs uppercase">
      <span className="text-ink-2">
        {weekRange(segment)} · {segment.label} ◆
      </span>
      <span className="text-muted">
        {segment.steps.length} step{segment.steps.length === 1 ? "" : "s"}
        {start ? ` · starts ${start}` : ""}
        {segment.locked ? " · locked" : ""}
      </span>
    </div>
  );
}

function CurrentSegment({
  segment,
  model,
  reviewerFirst,
}: {
  segment: RampSegment;
  model: RampModel;
  reviewerFirst: string | null;
}) {
  const next = model.nextStep && segment.steps.some((step) => step.id === model.nextStep!.id) ? model.nextStep : null;
  const rest = segment.steps.filter((step) => step.id !== next?.id);
  const numberOf = (step: PlanStep) => model.steps.findIndex((item) => item.id === step.id) + 1;

  return (
    <section aria-labelledby={`segment-${segment.index}`} className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink" id={`segment-${segment.index}`}>
          {weekRange(segment)} · {segment.label}
        </h2>
        <span className="label-mono">Current segment</span>
      </div>

      {next ? (
        <FlightStrip
          numeral={pad2(numberOf(next))}
          stubLabel={isStepWithReviewer(next.status) ? "IN REVIEW" : next.status === "in_progress" ? "IN PROGRESS" : "UP NEXT"}
        >
          <span className="font-mono text-xs text-muted uppercase">{stepMeta(next)}</span>
          <h3 className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.01em] text-ink">{next.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            {isStepWithReviewer(next.status) ? (
              <button className="btn-primary" disabled type="button">
                Waiting on {reviewerFirst ?? "your manager"}
              </button>
            ) : next.locked ? (
              <button className="btn-primary" disabled type="button">
                Locked
              </button>
            ) : (
              <Link className="btn-primary" href={planStepHref(next)}>
                {next.status === "in_progress" ? "Continue →" : "Start →"}
              </Link>
            )}
            {next.assignmentStepId ? (
              <Link className="link text-sm" href={stepDetailHref(next)}>
                Step details
              </Link>
            ) : null}
          </div>
        </FlightStrip>
      ) : null}

      {rest.length > 0 ? (
        <ol aria-label={`${segment.label} steps`} className="overflow-hidden rounded-[14px] border border-line bg-white">
          {rest.map((step) => (
            <StepRow key={step.id} number={numberOf(step)} step={step} />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/** My ramp list view (artboard 2a): plan grouped by segment, gates marked. */
export function MyRampList({
  plan,
  model,
  reviewerFirst,
}: {
  plan: UserPlan;
  model: RampModel;
  reviewerFirst: string | null;
}) {
  return (
    <RampFrame model={model}>
      <div className="flex flex-col gap-3.5">
        {model.segments.map((segment) =>
          segment.state === "done" ? (
            <SegmentBar key={segment.index} plan={plan} segment={segment} variant="done" />
          ) : segment.state === "current" ? (
            <CurrentSegment key={segment.index} model={model} reviewerFirst={reviewerFirst} segment={segment} />
          ) : (
            <SegmentBar key={segment.index} plan={plan} segment={segment} variant="upcoming" />
          ),
        )}
      </div>
    </RampFrame>
  );
}

/** Main column + 290px rail (ramp card and gate legend). */
export function RampFrame({ model, children }: { model: RampModel; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-7 px-[var(--gutter)] pb-7">
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3.5">{children}</div>
      <aside aria-label="Ramp progress" className="flex w-[290px] max-w-full flex-none flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <RampCard
            done={model.validated}
            note={model.daysLeft !== null ? `${model.daysLeft} DAYS LEFT` : undefined}
            total={model.total}
          />
          <span className="px-1 font-mono text-xs text-ink-2 uppercase">
            {model.awaitingReview} awaiting review · {paceLabel(model)}
          </span>
        </div>
        <div className="flex items-start gap-3 px-1">
          <span aria-hidden className="mt-1 h-3 w-3 flex-none rotate-45 bg-blue" />
          <p className="text-sm leading-[1.5] text-ink-2">
            Gates end a segment. Your manager or mentor validates them before the next segment unlocks.
          </p>
        </div>
      </aside>
    </div>
  );
}

/** Step detail, opened in place inside My ramp (`/my-plan?step=`). */
export function RampStepDetail({
  step,
  number,
  total,
  plan,
  mentor,
}: {
  step: PlanStep;
  number: number;
  total: number;
  plan: UserPlan;
  mentor?: Profile;
}) {
  return (
    <div className="flex max-w-[980px] flex-col gap-[22px] px-[var(--gutter)] pt-6 pb-10">
      <Link className="link self-start text-sm" href="/my-plan">
        ← My ramp
      </Link>
      <header className="flex flex-col gap-1.5">
        <p className="label-mono">
          Step {pad2(number)} of {pad2(total)} · {stepMeta(step)}
        </p>
        <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">{step.title}</h1>
      </header>
      {step.locked ? (
        <div className="max-w-[680px] rounded-[14px] border-[1.5px] border-dashed border-line-strong p-6 text-[15px] leading-[1.5] text-muted">
          <Tag>Locked</Tag>
          <p className="mt-3">
            This step is in a later segment. Clear the current segment gate and get your manager&apos;s approval to
            unlock segment {step.segmentIndex ?? "?"}
            {plan.unlockedSegmentMax ? ` (you are on segment ${plan.unlockedSegmentMax})` : ""}.
          </p>
        </div>
      ) : (
        <div className="max-w-[680px]">
          {/* PlanStepActions renders the step brief, "Done when" criteria, evidence and the submit action. */}
          <PlanStepActions mentorName={mentor?.fullName} step={step} />
        </div>
      )}
    </div>
  );
}
