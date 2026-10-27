"use client";

import Link from "next/link";
import { GateRecommendationPanel, MentorDueDatePanel, StepFeedbackPanel } from "@/components/mentoring/mentor-step-actions";
import { StepEvidenceView } from "@/components/mentoring/step-evidence-view";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import {
  mentorGuideFor,
  mentorPreviewHref,
  stepExemplar,
  mentorPreviewLabel,
  resourceKeyForStep,
  stepTypeLabel,
  type StepResource,
} from "@/lib/mentoring/mentor-guide";
import type { MenteeRecords, StepEvidence } from "@/lib/mentoring/mentor-records-model";
import { isStepOverdue } from "@/lib/programs/program-model";
import type { AssignmentStatus, PlanStep } from "@/lib/types";

const H3_CLS = "text-lg font-extrabold text-ink";
const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

const STATUS_PILL: Record<AssignmentStatus, { tone: "success" | "danger" | "neutral" | "blue" | "warning"; label: string }> = {
  not_started: { tone: "neutral", label: "Not started" },
  in_progress: { tone: "blue", label: "In progress" },
  submitted: { tone: "warning", label: "Submitted for review" },
  under_review: { tone: "warning", label: "Awaiting manager sign-off" },
  reviewed: { tone: "success", label: "Approved" },
  completed: { tone: "success", label: "Completed" },
};

function longDate(iso: string | undefined) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-ink-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function approverText(step: PlanStep) {
  if (step.isSegmentGate) return "The hiring manager approves this gate. Approval assigns the next program.";
  if (step.type === "mentor_review") return "You approve this check-in once the conversation has happened.";
  if (step.type === "knowledge_check" || step.type === "playbook") return "Completes automatically when they finish it.";
  return "Their manager or you can validate it after they submit.";
}

export function MentorStepWorkbench({
  step,
  assignmentId,
  steps,
  menteeName,
  resources,
  evidence,
  records,
  stageName,
  preview = false,
  onClose,
  onSelect,
}: {
  step: PlanStep | null;
  /** The assignment these steps belong to; the due date can only be set when it is known. */
  assignmentId?: string;
  steps: PlanStep[];
  menteeName: string;
  resources: Record<string, StepResource>;
  evidence: Record<string, StepEvidence[]>;
  records: MenteeRecords;
  stageName?: string;
  /** A step in a stage the mentee has not been assigned yet: read-only. */
  preview?: boolean;
  onClose: () => void;
  onSelect: (step: PlanStep) => void;
}) {
  if (!step) return null;

  const index = steps.findIndex((item) => item.id === step.id);
  const previous = index > 0 ? steps[index - 1] : undefined;
  const next = index >= 0 && index < steps.length - 1 ? steps[index + 1] : undefined;
  const resourceKey = resourceKeyForStep(step);
  const resource = resourceKey ? resources[resourceKey] : undefined;
  const guide = mentorGuideFor(step);
  const exemplar = stepExemplar(step);
  const previewHref = mentorPreviewHref(step);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = isStepOverdue(step, today);
  const status = STATUS_PILL[step.status];
  const firstName = menteeName.split(" ")[0] ?? menteeName;
  const stepFeedback = records.feedback.filter((item) => item.assignmentStepId === step.assignmentStepId);
  const gateRecommendation = records.gateRecommendations.find((item) => item.assignmentStepId === step.assignmentStepId);

  return (
    <Drawer
      eyebrow={`${stageName ? `${stageName} · ` : ""}Step ${index + 1} of ${steps.length} · ${stepTypeLabel(step.type)}`}
      footer={
        <>
          {previewHref ? (
            <Link className="btn-primary" href={previewHref} target="_blank">
              {mentorPreviewLabel(step)}
            </Link>
          ) : null}
          {next ? (
            <button className="btn-secondary" onClick={() => onSelect(next)} type="button">
              Next step
            </button>
          ) : null}
          {previous ? (
            <button className="btn-secondary" onClick={() => onSelect(previous)} type="button">
              Previous step
            </button>
          ) : null}
        </>
      }
      footerNote="Links open in your own session, so you can try the work before you coach it."
      mainLabel="What this step is"
      onClose={onClose}
      open
      side={
        <>
          {preview ? (
            <section className={CARD_CLS}>
              <h3 className={H3_CLS}>Not assigned yet</h3>
              <p className="text-[15px] text-ink-2">
                This stage opens for {firstName} once their manager approves the gate at the end of the stage before it. Use
                this to get ahead: try the work yourself so you are ready to coach it.
              </p>
            </section>
          ) : (
          <section className={CARD_CLS}>
            <h3 className={H3_CLS}>Where {firstName} is</h3>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={overdue ? "danger" : status.tone}>{overdue ? "Overdue" : status.label}</StatusPill>
              {step.locked ? <Tag tone="neutral">Locked</Tag> : null}
            </div>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-muted">Due</dt>
              <dd className="m-0 font-bold text-ink">{longDate(step.dueDate) ?? "No date"}</dd>
              {step.completedAt ? (
                <>
                  <dt className="text-muted">Finished</dt>
                  <dd className="m-0 font-bold text-ink">{longDate(step.completedAt)}</dd>
                </>
              ) : null}
              <dt className="text-muted">Approval</dt>
              <dd className="m-0 text-ink-2">{approverText(step)}</dd>
            </dl>
            {step.submissionNotes ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-bold text-ink">What {firstName} submitted</p>
                <p className="whitespace-pre-wrap rounded-[10px] bg-bg p-3 text-[15px] text-ink-2">{step.submissionNotes}</p>
              </div>
            ) : null}
          </section>
          )}

          {!preview && step.isSegmentGate ? (
            <GateRecommendationPanel current={gateRecommendation} firstName={firstName} step={step} />
          ) : null}
          {!preview ? <StepFeedbackPanel feedback={stepFeedback} firstName={firstName} step={step} /> : null}
          {!preview ? (
            <MentorDueDatePanel
              assignmentId={assignmentId}
              changes={records.scheduleChanges}
              menteeName={menteeName}
              step={step}
            />
          ) : null}

          <section className={CARD_CLS}>
            <h3 className={H3_CLS}>How to coach this step</h3>
            <p className="text-[15px] text-ink-2">{guide.yourRole}</p>
            <p className="text-sm font-bold text-ink">Ask</p>
            <BulletList items={guide.ask} />
            <p className="text-sm font-bold text-ink">Good looks like</p>
            <BulletList items={guide.lookFor} />
            <p className="text-sm font-bold text-ink">Watch for</p>
            <BulletList items={guide.watchFor} />
          </section>
        </>
      }
      sideLabel="Coaching"
      subtitle={
        <span>
          {menteeName}
          {step.estimatedMinutes ? ` · about ${step.estimatedMinutes} minutes` : ""}
          {step.dueDate ? ` · due ${longDate(step.dueDate)}` : ""}
        </span>
      }
      title={step.title}
    >
      <section className="flex flex-col gap-2">
        <h3 className={H3_CLS}>The task</h3>
        <p className="max-w-[680px] text-base leading-[1.55] text-ink-2">{step.description || "No description yet."}</p>
        <p className="max-w-[680px] text-[15px] text-muted">{guide.purpose}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className={CARD_CLS}>
          <h3 className="text-sm font-bold text-ink">A strong attempt</h3>
          <p className="text-[15px] text-ink-2">{exemplar.strong}</p>
        </article>
        <article className={CARD_CLS}>
          <h3 className="text-sm font-bold text-ink">A weak attempt</h3>
          <p className="text-[15px] text-ink-2">{exemplar.weak}</p>
        </article>
        <p className="text-[13px] text-muted md:col-span-2">
          For this kind of step. Compare their work to these, then say what you noticed in their words.
        </p>
      </section>

      {step.criteria?.length ? (
        <section className={CARD_CLS}>
          <h3 className={H3_CLS}>Approval criteria</h3>
          <BulletList items={step.criteria} />
        </section>
      ) : null}

      {step.type === "knowledge_check" && step.passScore ? (
        <p className="text-[15px] text-ink-2">
          Pass mark: <span className="font-bold text-ink">{step.passScore}%</span>. Questions rotate on every attempt.
        </p>
      ) : null}

      {resource ? (
        <section className={CARD_CLS}>
          <div className="flex flex-col gap-1">
            <span className="label-caps">
              {step.type === "knowledge_check" ? "The check is drawn from" : stepTypeLabel(step.type)}
            </span>
            <h3 className={H3_CLS}>{resource.title}</h3>
          </div>
          {resource.summary ? <p className="text-[15px] text-ink-2">{resource.summary}</p> : null}
          {resource.sections.map((item) => (
            <div className="flex flex-col gap-1.5" key={item.label}>
              <p className="text-sm font-bold text-ink">{item.label}</p>
              <BulletList items={item.items} />
            </div>
          ))}
        </section>
      ) : null}

      {preview ? null : <StepEvidenceView evidence={evidence[step.id] ?? []} firstName={firstName} />}
    </Drawer>
  );
}
