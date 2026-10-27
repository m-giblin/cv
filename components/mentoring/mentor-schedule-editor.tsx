"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, TextArea, TextInput } from "@/components/admin/admin-ui";
import { Drawer } from "@/components/ui/drawer";
import { stepTypeLabel } from "@/lib/mentoring/mentor-guide";
import {
  formatDueDate,
  latestDueDate,
  localToday,
  scheduleOrderWarnings,
  type ScheduleChange,
} from "@/lib/mentoring/mentor-records-model";
import type { UserPlan } from "@/lib/types";

const DONE = new Set(["completed", "reviewed"]);

/**
 * After meeting the new hire, the mentor sets the dates for the stage in one go. There is no fixed
 * 30-day window: the stage ends on the latest date set here. The new hire and manager are told.
 */
function isWeekend(iso: string) {
  if (!iso) return false;
  const day = new Date(`${iso}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function MentorScheduleEditor({
  open,
  onClose,
  plan,
  menteeName,
  changes,
}: {
  open: boolean;
  onClose: () => void;
  plan: UserPlan;
  menteeName: string;
  changes: ScheduleChange[];
}) {
  const router = useRouter();
  const noteId = useId();
  const firstName = menteeName.split(" ")[0] ?? menteeName;
  const today = localToday();
  const steps = useMemo(() => [...plan.steps].sort((a, b) => a.order - b.order), [plan.steps]);
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(steps.filter((step) => step.assignmentStepId).map((step) => [step.assignmentStepId!, step.dueDate ?? ""])),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const editable = steps.filter((step) => step.assignmentStepId && !DONE.has(step.status));
  const changed = editable.filter((step) => (dates[step.assignmentStepId!] ?? "") !== (step.dueDate ?? ""));
  const problems = changed.flatMap((step) => {
    const value = dates[step.assignmentStepId!] ?? "";
    if (!value) return [`${step.title} needs a date.`];
    if (value < today) return [`${step.title} is set to a day that has passed. Pick today or later.`];
    return [];
  });
  const invalid = problems.length > 0;
  const weekendDates = changed.filter((step) => isWeekend(dates[step.assignmentStepId!] ?? "")).map((step) => step.title);
  const effective = steps.map((step) => (step.assignmentStepId ? dates[step.assignmentStepId] || step.dueDate : step.dueDate) ?? null);
  const lastDue = latestDueDate(effective);
  const warnings = scheduleOrderWarnings(
    steps.map((step, index) => ({ id: step.id, title: step.title, order: step.order, due: effective[index] ?? null })),
  );
  const history = changes.filter((change) => change.assignmentId === plan.id);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/mentor/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: plan.id,
        scope: "schedule",
        note: note.trim() || undefined,
        dates: changed.map((step) => ({ assignmentStepId: step.assignmentStepId, dueDate: dates[step.assignmentStepId!] })),
      }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof data?.error === "string" ? data.error : "The schedule did not save. Try again.");
      return;
    }
    toast.success(`Schedule set. ${firstName} and their manager have been told.`);
    setNote("");
    router.refresh();
    onClose();
  }

  return (
    <Drawer
      dirty={changed.length > 0 || note.trim().length > 0}
      eyebrow="Schedule"
      footer={
        <button className="btn-primary" disabled={saving || changed.length === 0 || invalid} onClick={() => void save()} type="button">
          {saving ? "Saving…" : changed.length ? `Set ${changed.length} date${changed.length === 1 ? "" : "s"}` : "No changes yet"}
        </button>
      }
      footerNote={`${firstName} and their manager are notified. The stage ends ${lastDue ? formatDueDate(lastDue, { weekday: "short", month: "short", day: "numeric" }) : "when the last date is set"}.`}
      mainLabel="Dates"
      onClose={onClose}
      open={open}
      side={
        <section className="flex flex-col gap-3">
          <p className="text-[15px] text-ink-2">
            Agree these dates with {firstName} when you meet. They are not fixed to 30 days: set what is realistic, and the stage
            ends on the latest one.
          </p>
          {problems.length ? (
            <div className="flex flex-col gap-1 rounded-[12px] border border-danger bg-danger-soft p-3 text-sm text-ink-2" role="alert">
              <p className="font-bold text-ink">Fix these dates to save</p>
              {problems.slice(0, 5).map((problem) => (
                <p className="m-0" key={problem}>
                  {problem}
                </p>
              ))}
            </div>
          ) : null}
          {weekendDates.length ? (
            <p className="m-0 text-sm text-muted">
              {weekendDates.length === 1 ? `${weekendDates[0]} falls` : `${weekendDates.length} of your new dates fall`} on a weekend. Fine if
              that&apos;s what you agreed.
            </p>
          ) : null}
          {warnings.length ? (
            <div className="flex flex-col gap-1 rounded-[12px] border border-warning bg-warning-soft p-3 text-sm text-ink-2">
              <p className="font-bold text-ink">Check the order</p>
              {warnings.slice(0, 5).map((warning) => (
                <p className="m-0" key={warning}>
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
          <Field htmlFor={noteId} label="Note to them (optional)">
            <TextArea
              id={noteId}
              onChange={(event) => setNote(event.target.value)}
              placeholder="For example: we pushed the Corp Deck test-out a week to fit the customer shadow"
              value={note}
            />
          </Field>
          {history.length ? (
            <>
              <h3 className="text-lg font-extrabold text-ink">Earlier changes</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {history.slice(0, 5).map((change) => (
                  <li className="text-sm text-ink-2" key={change.id}>
                    {formatDueDate(change.createdAt.slice(0, 10))}: {change.setByName} set {change.changes.length} date
                    {change.changes.length === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      }
      sideLabel="How this works"
      subtitle={`${menteeName} · ${plan.name}`}
      title={`Set ${firstName}'s schedule`}
    >
      <ol className="m-0 flex list-none flex-col p-0">
        {steps.map((step, index) => {
          const id = step.assignmentStepId;
          const locked = !id || DONE.has(step.status);
          const value = id ? (dates[id] ?? "") : "";
          return (
            <li className="flex flex-wrap items-center justify-between gap-3 border-b border-divider py-2.5 last:border-b-0" key={step.id}>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-ink">
                  {index + 1}. {step.title}
                </span>
                <span className="block text-[13px] text-muted">
                  {step.isSegmentGate ? "Gate · " : ""}
                  {stepTypeLabel(step.type, step.resourceUrl)}
                  {locked && DONE.has(step.status) ? " · done" : ""}
                </span>
              </span>
              <TextInput
                aria-label={`Due date for ${step.title}`}
                className="w-[170px]"
                disabled={locked}
                min={today}
                onChange={(event) => id && setDates((current) => ({ ...current, [id]: event.target.value }))}
                type="date"
                value={value}
              />
            </li>
          );
        })}
      </ol>
    </Drawer>
  );
}
