"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Field, TextArea, TextInput } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/ui/status-pill";
import {
  formatDueDate,
  localToday,
  type GateRecommendation,
  type GateRecommendationValue,
  type ScheduleChange,
  type StepFeedback,
} from "@/lib/mentoring/mentor-records-model";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

function shortDate(iso: string | null | undefined) {
  if (!iso) return "no date";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function post(url: string, body: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return true;
  const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
  toast.error(typeof data?.error === "string" ? data.error : "That did not save. Try again.");
  return false;
}

export function StepFeedbackPanel({
  step,
  feedback,
  firstName,
}: {
  step: PlanStep;
  feedback: StepFeedback[];
  firstName: string;
}) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    if (!step.assignmentStepId) return;
    setSaving(true);
    const ok = await post("/api/mentor/step-feedback", { assignmentStepId: step.assignmentStepId, body });
    setSaving(false);
    if (!ok) return;
    setBody("");
    toast.success(`Sent. ${firstName} sees it on this step.`);
    router.refresh();
  }

  return (
    <section className={CARD_CLS}>
      <h3 className="text-lg font-extrabold text-ink">Feedback to {firstName}</h3>
      {feedback.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {feedback.map((item) => (
            <li className="rounded-[10px] bg-bg p-3" key={item.id}>
              <p className="text-[13px] text-muted">
                {item.authorName}, {shortDate(item.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-[15px] text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {step.assignmentStepId ? (
        <>
          <Field hint={`${firstName} sees this on the step and gets a notification.`} htmlFor={id} label="Add feedback">
            <TextArea
              id={id}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What went well, and one thing to try next time"
              value={body}
            />
          </Field>
          <button
            className="btn-secondary self-start"
            disabled={saving || body.trim().length < 3}
            onClick={() => void send()}
            type="button"
          >
            {saving ? "Sending…" : "Send feedback"}
          </button>
        </>
      ) : null}
    </section>
  );
}

/** The mentor sets this step's date after agreeing it with the mentee. It applies at once. */
export function MentorDueDatePanel({
  step,
  assignmentId,
  menteeName,
  changes,
}: {
  step: PlanStep;
  assignmentId?: string;
  menteeName: string;
  changes: ScheduleChange[];
}) {
  const router = useRouter();
  const dateId = useId();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(step.dueDate ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const firstName = menteeName.split(" ")[0] ?? menteeName;
  const done = step.status === "reviewed" || step.status === "completed";
  const today = localToday();
  const latest = changes
    .flatMap((change) => change.changes.filter((item) => item.assignmentStepId === step.assignmentStepId).map((item) => ({ change, item })))
    .at(0);

  async function save() {
    if (!step.assignmentStepId || !assignmentId) return;
    setSaving(true);
    const ok = await post("/api/mentor/schedule", {
      assignmentId,
      scope: "step",
      note: note.trim() || undefined,
      dates: [{ assignmentStepId: step.assignmentStepId, dueDate: date }],
    });
    setSaving(false);
    if (!ok) return;
    setOpen(false);
    setNote("");
    toast.success(`Due ${formatDueDate(date)}. ${firstName} and their manager have been told.`);
    router.refresh();
  }

  if (!step.assignmentStepId || !assignmentId || done) return null;

  return (
    <section className={CARD_CLS}>
      <h3 className="text-lg font-extrabold text-ink">Due date</h3>
      <p className="text-[15px] text-ink-2">
        Due dates are agreed between you and {firstName}. Due{" "}
        <span className="font-bold text-ink">{step.dueDate ? formatDueDate(step.dueDate) : "no date yet"}</span>
        {latest ? ` · set by ${latest.change.setByName} on ${formatDueDate(latest.change.createdAt.slice(0, 10))}` : ""}.
      </p>
      {open ? (
        <>
          <Field htmlFor={dateId} label="Due date">
            <TextInput id={dateId} min={today} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </Field>
          <Field htmlFor={noteId} label="Note (optional)">
            <TextArea
              id={noteId}
              onChange={(event) => setNote(event.target.value)}
              placeholder="For example: we agreed to do this after the customer shadow next week"
              value={note}
            />
          </Field>
          <div className="flex gap-3">
            <button
              className="btn-secondary"
              disabled={saving || !date || date < today || date === step.dueDate}
              onClick={() => void save()}
              type="button"
            >
              {saving ? "Saving…" : "Set the date"}
            </button>
            <button className="link text-sm" onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
          </div>
          <p className="text-[13px] text-muted">{firstName} and their manager are notified of the new date.</p>
        </>
      ) : (
        <button className="btn-secondary self-start" onClick={() => setOpen(true)} type="button">
          Change the date
        </button>
      )}
    </section>
  );
}

const CHOICES: { value: GateRecommendationValue; label: string }[] = [
  { value: "ready", label: "Ready for sign-off" },
  { value: "not_yet", label: "Not ready yet" },
];

export function GateRecommendationPanel({
  step,
  current,
  firstName,
}: {
  step: PlanStep;
  current: GateRecommendation | undefined;
  firstName: string;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [choice, setChoice] = useState<GateRecommendationValue | null>(null);
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    if (!step.assignmentStepId || !choice) return;
    setSaving(true);
    const ok = await post("/api/mentor/gate-recommendations", {
      assignmentStepId: step.assignmentStepId,
      recommendation: choice,
      rationale,
    });
    setSaving(false);
    if (!ok) return;
    setChoice(null);
    setRationale("");
    toast.success("Sent to the manager with your reasons.");
    router.refresh();
  }

  if (!step.assignmentStepId || step.status === "reviewed") return null;

  return (
    <section className={cn(CARD_CLS, "border-blue")}>
      <h3 className="text-lg font-extrabold text-ink">Your recommendation</h3>
      <p className="text-[15px] text-ink-2">
        The manager decides this gate. Tell them whether {firstName} is ready and why; it shows up next to the approval.
      </p>
      {current ? (
        <div className="flex flex-col gap-1 rounded-[10px] bg-bg p-3">
          <StatusPill tone={current.recommendation === "ready" ? "success" : "warning"}>
            {current.recommendation === "ready" ? "You said ready" : "You said not yet"}, {shortDate(current.createdAt)}
          </StatusPill>
          <p className="whitespace-pre-wrap text-[15px] text-ink-2">{current.rationale}</p>
        </div>
      ) : null}
      <div aria-label="Recommendation" className="flex flex-wrap gap-2" role="radiogroup">
        {CHOICES.map((option) => (
          <button
            aria-checked={choice === option.value}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold",
              choice === option.value ? "border-blue bg-blue-soft text-blue" : "border-line-strong bg-white text-ink",
            )}
            key={option.value}
            onClick={() => setChoice(option.value)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {choice ? (
        <>
          <Field htmlFor={reasonId} label="Why">
            <TextArea
              id={reasonId}
              onChange={(event) => setRationale(event.target.value)}
              placeholder={
                choice === "ready"
                  ? "What you saw that shows they meet the criteria"
                  : "What is missing, and what they should do before the gate"
              }
              value={rationale}
            />
          </Field>
          <button
            className="btn-primary self-start"
            disabled={saving || rationale.trim().length < 10}
            onClick={() => void send()}
            type="button"
          >
            {saving ? "Sending…" : current ? "Update recommendation" : "Send to the manager"}
          </button>
        </>
      ) : null}
    </section>
  );
}
