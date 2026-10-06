"use client";

import { Drawer } from "@/components/ui/drawer";
import { FlightStrip } from "@/components/ui/flight-strip";
import { addDaysToIsoDate } from "@/lib/plans/template-catalog";
import { doThisNowCopy, planStepTypeLabel } from "@/lib/plans/step-labels";
import { dueLabel, pad2, type BuilderStep } from "@/lib/admin/plan-builder";

function stepCta(step: BuilderStep): string {
  if (!step.stepType) return "Open step";
  return doThisNowCopy({ type: step.stepType, title: step.title }).cta ?? "Open step";
}

function formatDue(startDate: string, offset: number): string {
  return new Date(`${addDaysToIsoDate(startDate, offset)}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** The SE step card (compact) as the SE will get it for this step. */
export function StepFlightPreview({
  step,
  index,
  total,
  startDate,
}: {
  step: BuilderStep;
  index: number;
  total?: number;
  /** When set, the due line shows the calendar date instead of the week and day. */
  startDate?: string;
}) {
  const due = startDate ? formatDue(startDate, step.dueOffsetDays) : dueLabel(step.dueOffsetDays).toLowerCase();
  const minutes = step.estimatedMinutes ? `, about ${step.estimatedMinutes} min` : "";
  return (
    <FlightStrip
      compact
      numeral={pad2(index + 1)}
      numeralCaption={total ? `of ${total}` : undefined}
      stubLabel={step.isSegmentGate ? "Gate" : "Next step"}
    >
      <span className="text-[17px] leading-[1.2] font-extrabold text-ink">{step.title || "Untitled step"}</span>
      <span className="text-[13px] text-muted">
        {step.stepType ? planStepTypeLabel(step.stepType) : "No type yet"}. Due {due}
        {minutes}
      </span>
      {step.description ? <span className="line-clamp-3 text-[13px] leading-[1.45] text-ink-2">{step.description}</span> : null}
      <span aria-hidden className="btn-primary self-start px-3.5 py-[7px] text-[13px]">
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
        <p className="text-sm text-ink-2">
          {name || "Untitled plan"}, {steps.length} {steps.length === 1 ? "step" : "steps"}.
        </p>
        {steps.length === 0 ? <p className="text-sm text-muted">This plan has no steps yet.</p> : null}
        {steps.map((step, index) => (
          <StepFlightPreview index={index} key={step.key} startDate={startDate} step={step} total={steps.length} />
        ))}
      </div>
    </Drawer>
  );
}
