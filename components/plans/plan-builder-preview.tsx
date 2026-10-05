"use client";

import { Drawer } from "@/components/ui/drawer";
import { FlightStrip } from "@/components/ui/flight-strip";
import { addDaysToIsoDate } from "@/lib/plans/template-catalog";
import { doThisNowCopy, planStepTypeLabel } from "@/lib/plans/step-labels";
import { pad2, shortDueLabel, type BuilderStep } from "@/lib/admin/plan-builder";

function stepCta(step: BuilderStep): string {
  if (!step.stepType) return "Open step";
  return doThisNowCopy({ type: step.stepType, title: step.title }).cta ?? "Open step";
}

/** The SE flight strip (compact) exactly as the SE will get it for this step. */
export function StepFlightPreview({
  step,
  index,
  startDate,
}: {
  step: BuilderStep;
  index: number;
  /** When set, the due line shows the calendar date instead of the week/day offset. */
  startDate?: string;
}) {
  const typeLabel = step.stepType ? planStepTypeLabel(step.stepType) : "Untyped";
  const due = startDate
    ? new Date(`${addDaysToIsoDate(startDate, step.dueOffsetDays)}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : shortDueLabel(step.dueOffsetDays);
  return (
    <FlightStrip compact numeral={pad2(index + 1)} stubLabel={step.isSegmentGate ? "GATE" : "NEXT"}>
      <span className="font-mono text-xs text-muted uppercase">
        {typeLabel} · {due}
      </span>
      <span className="text-[15px] leading-[1.15] font-extrabold text-ink">{step.title || "Untitled step"}</span>
      {step.description ? (
        <span className="line-clamp-3 text-xs leading-[1.4] text-ink-2">{step.description}</span>
      ) : null}
      <span
        aria-hidden
        className="mt-0.5 self-start rounded-full border-[1.5px] border-ink bg-signal px-3 py-1 text-xs font-bold text-ink shadow-[2px_2px_0_var(--color-ink)]"
      >
        {stepCta(step)}
      </span>
    </FlightStrip>
  );
}

/** "Preview as SE": every step of the plan as the SE will see it, in order. */
export function PlanPreviewDrawer({
  open,
  onClose,
  name,
  steps,
  startDate,
  personName,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  steps: BuilderStep[];
  startDate?: string;
  personName?: string;
}) {
  return (
    <Drawer onClose={onClose} open={open} title={personName ? `Preview as ${personName}` : "Preview as SE"}>
      <div className="flex flex-col gap-3">
        <p className="label-mono">
          {name || "Untitled plan"} · {steps.length} steps
        </p>
        {steps.length === 0 ? <p className="text-sm text-muted">This plan has no steps yet.</p> : null}
        {steps.map((step, index) => (
          <StepFlightPreview index={index} key={step.key} startDate={startDate} step={step} />
        ))}
      </div>
    </Drawer>
  );
}
