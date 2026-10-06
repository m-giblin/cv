import Link from "next/link";
import type { ReactNode } from "react";
import { PlanStepActions } from "@/components/plans/plan-step-actions";
import { Note } from "@/components/ui/editorial";
import { FlightStrip } from "@/components/ui/flight-strip";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { ProgressBlocks } from "@/components/ui/ramp-card";
import { Runway } from "@/components/ui/runway";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import { TableCard, TwoLineCell, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import { planStepTypeLabel } from "@/lib/plans/step-labels";
import {
  formatDay,
  formatShortDate,
  isStepValidated,
  isStepWithReviewer,
  pad2,
  stepDetailHref,
  stepStatusTag,
  type RampModel,
  type RampSegment,
} from "@/lib/se/ramp-model";
import type { PlanStep, Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { planStepHref } from "@/lib/utils/plan-links";

export { stepDetailHref } from "@/lib/se/ramp-model";

function segmentStartIso(plan: UserPlan, segment: RampSegment): string | null {
  if (!plan.startDate) return null;
  const date = new Date(`${plan.startDate.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + (segment.startWeek - 1) * 7);
  return date.toISOString();
}

function weekRange(segment: RampSegment): string {
  return segment.startWeek === segment.endWeek
    ? `week ${segment.startWeek}`
    : `weeks ${segment.startWeek} to ${segment.endWeek}`;
}

/** One serif phrase that matches how far along the ramp is. */
function rampAccent(model: RampModel | null): string | undefined {
  if (!model || model.total === 0) return undefined;
  const share = model.validated / model.total;
  if (share >= 1) return "Field ready.";
  if (share === 0) return "The runway starts here.";
  if (share < 0.4) return "Building speed.";
  if (share <= 0.7) return "Halfway to field ready.";
  return "Nearly field ready.";
}

export function RampHeader({
  plan,
  model,
  view,
  calendarEnabled,
}: {
  plan: UserPlan | undefined;
  model?: RampModel | null;
  view: "list" | "calendar";
  calendarEnabled: boolean;
}) {
  return (
    <PageHeader
      accent={rampAccent(model ?? null)}
      actions={
        plan && calendarEnabled ? (
          <SegmentedToggle
            label="Ramp view"
            options={[
              { id: "list", label: "List", href: "/my-plan" },
              { id: "calendar", label: "Calendar", href: "/my-plan?view=calendar" },
            ]}
            value={view}
          />
        ) : undefined
      }
      eyebrow={model ? `Week ${model.currentWeek} of ${model.totalWeeks}` : plan?.name}
      title="My ramp."
    />
  );
}

/** Full-width runway with one plain label per segment ("Field skills, weeks 5 to 8"). */
export function RampRunwayRow({ model }: { model: RampModel }) {
  return (
    <div className="flex flex-col gap-2">
      <Runway
        currentWeek={model.currentWeek}
        segments={model.segments.map((segment) => ({ label: segment.label, weeks: segment.weeks }))}
        showLabels={false}
      />
      <div
        className="grid gap-2 text-[13px] text-muted max-sm:hidden"
        style={{ gridTemplateColumns: model.segments.map((segment) => `${segment.weeks}fr`).join(" ") }}
      >
        {model.segments.map((segment) => (
          <span
            className={cn("truncate", segment.state === "current" && "font-bold text-ink")}
            key={segment.index}
          >
            {segment.index === 0 ? `Weeks 1 to ${model.totalWeeks}` : `${segment.label}, ${weekRange(segment)}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function GateMarker() {
  return (
    <span aria-hidden className="flex w-6 justify-center">
      <span className="h-3 w-3 rotate-45 bg-blue" />
    </span>
  );
}

function stepSubline(step: PlanStep, plan: UserPlan): string {
  if (step.isSegmentGate) return "Closes this segment";
  if (step.locked) return `Unlocks after segment ${plan.unlockedSegmentMax ?? 1}`;
  if (step.status === "not_started") return step.description || "Not started";
  return stepStatusTag(step).label;
}

function StepTable({
  steps,
  model,
  plan,
  label,
}: {
  steps: PlanStep[];
  model: RampModel;
  plan: UserPlan;
  label: string;
}) {
  const numberOf = (step: PlanStep) => model.steps.findIndex((item) => item.id === step.id) + 1;
  return (
    <TableCard minWidth={560}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          <th className={cn(thCls, "w-[72px]")} scope="col">
            Step
          </th>
          <th className={thCls} scope="col">
            Title
          </th>
          <th className={cn(thCls, "w-[130px]")} scope="col">
            Type
          </th>
          <th className={cn(thCls, "w-[120px] text-right")} scope="col">
            Due
          </th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step, index) => {
          const number = numberOf(step);
          const validated = isStepValidated(step.status);
          return (
            <tr
              className={cn(step.isSegmentGate && rowHighlight.selected)}
              key={step.id}
            >
              <td className={cn(tdCls, index === 0 && "border-t-0")}>
                {step.isSegmentGate ? (
                  <GateMarker />
                ) : (
                  <span aria-hidden className="num text-[22px] font-extrabold tracking-[-0.02em] text-faint">
                    {pad2(number)}
                  </span>
                )}
                <span className="sr-only">{step.isSegmentGate ? `Gate, step ${number}` : `Step ${number}`}</span>
              </td>
              <th className={cn(tdCls, "font-normal", index === 0 && "border-t-0")} scope="row">
                <TwoLineCell
                  subline={stepSubline(step, plan)}
                  title={
                    step.locked ? (
                      step.title
                    ) : (
                      <Link
                        className={cn("hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4", validated && "text-ink-2")}
                        href={stepDetailHref(step)}
                      >
                        {step.title}
                      </Link>
                    )
                  }
                />
              </th>
              <td className={cn(tdCls, "text-sm text-ink-2", index === 0 && "border-t-0")}>
                {step.isSegmentGate ? "Gate" : planStepTypeLabel(step.type)}
              </td>
              <td className={cn(tdCls, "text-right text-sm text-muted", index === 0 && "border-t-0")}>
                {formatDay(step.dueDate) ?? "No date"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableCard>
  );
}

function DoneSegment({ segment, model, plan }: { segment: RampSegment; model: RampModel; plan: UserPlan }) {
  return (
    <details className="group flex flex-col gap-3">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-white px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-bold text-ink">{segment.label}</span>
        <span className="flex items-center gap-3.5">
          <StatusPill tone="success">
            {segment.validated} of {segment.steps.length} validated
          </StatusPill>
          <span className="link text-sm">
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span>
          </span>
        </span>
      </summary>
      <div className="pt-3">
        <StepTable label={`${segment.label} steps`} model={model} plan={plan} steps={segment.steps} />
      </div>
    </details>
  );
}

function UpcomingSegment({ segment, plan }: { segment: RampSegment; plan: UserPlan }) {
  const start = formatDay(segmentStartIso(plan, segment));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-dashed border-line-strong px-5 py-3">
      <span className="text-[15px] font-bold text-ink-2">{segment.label}</span>
      <span className="text-sm text-muted">
        {segment.steps.length} {segment.steps.length === 1 ? "step" : "steps"}
        {start ? `. Starts ${start}` : ""}
        {segment.locked ? ". Locked until the gate before it clears" : ""}
      </span>
    </div>
  );
}

function CurrentSegment({
  segment,
  model,
  plan,
  reviewer,
}: {
  segment: RampSegment;
  model: RampModel;
  plan: UserPlan;
  reviewer: Profile | undefined;
}) {
  const next = model.nextStep && segment.steps.some((step) => step.id === model.nextStep!.id) ? model.nextStep : null;
  const rest = segment.steps.filter((step) => step.id !== next?.id && !isStepValidated(step.status));
  const validatedHere = segment.steps.filter((step) => step.id !== next?.id && isStepValidated(step.status));
  const started = segment.steps.filter((step) => step.status !== "not_started").length;
  const numberOf = (step: PlanStep) => model.steps.findIndex((item) => item.id === step.id) + 1;
  const reviewerFirst = reviewer?.fullName.split(" ")[0] ?? null;

  return (
    <section aria-labelledby={`segment-${segment.index}`} className="flex flex-col gap-4">
      <h2 className="pt-1 text-xl font-extrabold text-ink" id={`segment-${segment.index}`}>
        {segment.label}{" "}
        <span className="text-[15px] font-medium text-muted">
          {segment.index === 0 ? "" : `${weekRange(segment)}, `}
          {started} of {segment.steps.length} started
        </span>
      </h2>

      {next ? (
        <FlightStrip
          className="grid-cols-[96px_minmax(0,1fr)]"
          numeral={pad2(numberOf(next))}
          numeralCaption={`of ${model.total}`}
          stubLabel={isStepWithReviewer(next.status) ? "In review" : "Now"}
        >
          <h3 className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.015em] text-ink">{next.title}</h3>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {next.dueDate ? (
              <span>
                Due <b className="text-ink">{formatDay(next.dueDate)}</b>
              </span>
            ) : null}
            <span>
              Type <b className="text-ink">{planStepTypeLabel(next.type)}</b>
            </span>
            {reviewer ? (
              <span>
                Reviewer <b className="text-ink">{reviewer.fullName}</b>
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-[18px]">
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
                {next.status === "in_progress" ? "Continue" : "Start"}
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
        <StepTable label={`${segment.label}, remaining steps`} model={model} plan={plan} steps={rest} />
      ) : null}
      {validatedHere.length > 0 ? (
        <p className="text-[13px] text-muted">
          {validatedHere.length} {validatedHere.length === 1 ? "step" : "steps"} in this segment already validated.
        </p>
      ) : null}
    </section>
  );
}

/** My ramp list view (artboard 2a): done segments collapse, the current one leads with "Now". */
export function MyRampList({
  plan,
  model,
  reviewer,
}: {
  plan: UserPlan;
  model: RampModel;
  reviewer: Profile | undefined;
}) {
  return (
    <RampFrame model={model}>
      {model.segments.map((segment) =>
        segment.state === "done" ? (
          <DoneSegment key={segment.index} model={model} plan={plan} segment={segment} />
        ) : segment.state === "current" ? (
          <CurrentSegment key={segment.index} model={model} plan={plan} reviewer={reviewer} segment={segment} />
        ) : (
          <UpcomingSegment key={segment.index} plan={plan} segment={segment} />
        ),
      )}
    </RampFrame>
  );
}

function paceSentence(model: RampModel): string {
  const nextGate = model.steps.find((step) => step.isSegmentGate && !isStepValidated(step.status));
  const parts = [
    model.overdue > 0 ? `${model.overdue} ${model.overdue === 1 ? "step is" : "steps are"} overdue.` : "On pace.",
    model.daysLeft !== null ? `${model.daysLeft} days left` : null,
  ];
  const gateDate = formatShortDate(nextGate?.dueDate);
  const tail = gateDate ? `, and the next gate is ${gateDate}.` : model.daysLeft !== null ? "." : "";
  return `${parts.filter(Boolean).join(" ")}${tail}`;
}

/** Main column + 340px rail (Validated card and "How gates work"). */
export function RampFrame({ model, children }: { model: RampModel; children: ReactNode }) {
  return (
    <PageBody className="pb-7">
      <div className="grid items-start gap-[var(--rail-gap)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
        <aside aria-label="Ramp progress" className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white px-[22px] py-5">
            <h2 className="label-caps">Validated</h2>
            <p className="num text-[44px] leading-none font-extrabold tracking-[-0.03em] text-blue">
              {model.validated}
              <span className="text-xl text-faint"> of {model.total}</span>
            </p>
            <ProgressBlocks done={model.validated} total={model.total} />
            <p className="text-sm text-ink-2">
              {paceSentence(model)}
              {model.awaitingReview > 0 ? ` ${model.awaitingReview} waiting on review.` : ""}
            </p>
          </section>
          <Note title="How gates work">
            A gate ends each segment. Your mentor or manager signs it off once the steps before it are validated.
            Missed gates move; they never reset your progress.
          </Note>
        </aside>
      </div>
    </PageBody>
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
  const due = formatDay(step.dueDate);
  return (
    <div className="flex flex-col pb-10">
      <PageHeader
        eyebrow={
          <>
            <Link className="link normal-case tracking-normal" href="/my-plan">
              My ramp
            </Link>
            &nbsp;/&nbsp;Step {number} of {total}
          </>
        }
        subtitle={`${planStepTypeLabel(step.type)}${due ? `, due ${due}` : ""}.`}
        title={step.title}
      />
      <PageBody className="max-w-[1020px]">
        {step.locked ? (
          <Note title="Locked">
            This step is in a later segment. Clear the current segment gate and get your manager&apos;s approval to
            unlock segment {step.segmentIndex ?? "?"}
            {plan.unlockedSegmentMax ? `. You are on segment ${plan.unlockedSegmentMax}.` : "."}
          </Note>
        ) : (
          <div className="max-w-[680px]">
            {/* PlanStepActions renders the step brief, "Done when" criteria, evidence and the submit action. */}
            <PlanStepActions mentorName={mentor?.fullName} step={step} />
          </div>
        )}
      </PageBody>
    </div>
  );
}
