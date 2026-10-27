"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { AssignedWorkItem, AssignedWorkKind } from "@/lib/manager/assigned-work";
import type { AssignmentState } from "@/lib/playbooks/assignment-model";

export const KIND_LABEL: Record<AssignedWorkKind, string> = {
  playbook: "Playbook",
  simulation: "Simulation",
  pitch: "Pitch",
  ramp_task: "Ramp task",
  quiz: "Knowledge check",
  content: "Library item",
};

const STATE_PILL: Record<AssignmentState, { tone: StatusTone; label: string }> = {
  done: { tone: "success", label: "Done" },
  overdue: { tone: "danger", label: "Overdue" },
  in_progress: { tone: "blue", label: "In progress" },
  not_started: { tone: "neutral", label: "Not started" },
};

type Filter = "open" | "done" | "all";

type Sitting = { at: string; score: number; passed: boolean; answers: { stem: string; chosen: string; correctAnswer: string; correct: boolean; explanation: string }[] };

/** A knowledge check's sittings since it was assigned: score, then each question with the answer picked. */
function QuizAnswers({ id, chapter }: { id: string; chapter?: boolean }) {
  const [sittings, setSittings] = useState<Sitting[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/manager/quiz-results?${chapter ? "playbookAssignment" : "id"}=${id}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { sittings?: Sitting[]; error?: string } | null;
        if (!response.ok || !body?.sittings) throw new Error(body?.error ?? "Couldn't load the answers.");
        setSittings(body.sittings);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id, chapter]);
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!sittings) return <p className="text-sm text-muted">Loading answers</p>;
  if (!sittings.length) return <p className="text-sm text-muted">Not taken yet.</p>;
  return (
    <div className="flex w-full flex-col gap-3">
      {sittings.map((sitting, index) => (
        <details className="rounded-[10px] border border-line bg-white" key={sitting.at} open={index === 0}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="font-bold text-ink">
              {new Date(sitting.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {sitting.score}%
            </span>
            <StatusPill tone={sitting.passed ? "success" : "danger"}>{sitting.passed ? "Passed" : "Below pass mark"}</StatusPill>
          </summary>
          <ol className="flex flex-col gap-2 border-t border-divider px-3 py-3">
            {sitting.answers.map((answer, i) => (
              <li className="text-sm" key={i}>
                <p className="m-0 font-semibold text-ink">
                  {i + 1}. {answer.stem}
                </p>
                <p className={`m-0 ${answer.correct ? "text-success" : "text-danger"}`}>
                  {answer.correct ? "✓" : "✗"} {answer.chosen}
                </p>
                {answer.correct ? null : <p className="m-0 text-ink-2">Right answer: {answer.correctAnswer}</p>}
                {!answer.correct && answer.explanation ? <p className="m-0 text-[13px] text-muted">{answer.explanation}</p> : null}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}

const INPUT_CLASS = "rounded-[10px] border border-line-strong bg-white px-3 py-1.5 text-[15px] text-ink";

/** One row per assignment; a click opens it in a workbench to see the answers, move the due date or cancel. */
export function AssignedWorkList({
  items,
  onChanged,
}: {
  items: AssignedWorkItem[] | null;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [editing, setEditing] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  if (items === null) return <p className="text-sm text-muted">Loading assigned work</p>;

  const active = editing ? items.find((item) => `${item.kind}:${item.id}` === editing) ?? null : null;

  const counts = { open: items.filter((item) => item.state !== "done").length, done: items.filter((item) => item.state === "done").length };
  const shown = items.filter((item) => (filter === "all" ? true : filter === "done" ? item.state === "done" : item.state !== "done"));

  async function save(item: AssignedWorkItem, change: { dueDate?: string; cancel?: boolean }) {
    setSaving(true);
    const response =
      item.kind === "playbook"
        ? await fetch(`/api/playbook-assignments/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(change),
          })
        : await fetch("/api/manager/assigned-work", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: item.kind, id: item.id, ...change }),
          });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Couldn't save that change");
      return;
    }
    toast.success(change.cancel ? "Assignment cancelled" : "Due date updated");
    setEditing(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5" role="group" aria-label="Show">
        {(
          [
            ["open", `Open (${counts.open})`],
            ["done", `Done (${counts.done})`],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-pressed={filter === value}
            className={`rounded-[8px] px-3 py-1 text-sm ${filter === value ? "bg-blue-soft font-bold text-blue" : "text-muted hover:text-ink"}`}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {filter === "done" ? "Nothing finished yet." : filter === "open" ? "Nothing open. Use Assign work to give them something." : "Nothing assigned yet."}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
          {shown.map((item) => {
            const pill = STATE_PILL[item.state];
            return (
              <li className="border-b border-divider last:border-b-0" key={`${item.kind}:${item.id}`}>
                <button
                  aria-haspopup="dialog"
                  className="grid w-full grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left hover:bg-bg"
                  onClick={() => {
                    setEditing(`${item.kind}:${item.id}`);
                    setDueDate(item.dueDate ?? "");
                  }}
                  type="button"
                >
                  <span className="pt-0.5 text-[13px] text-muted">{KIND_LABEL[item.kind]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{item.title}</span>
                    <span className="block truncate text-[13px] text-muted">{item.detail}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    <span className="text-[13px] whitespace-nowrap text-muted">{item.dueText}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {active ? (
        <Drawer
          eyebrow={`${KIND_LABEL[active.kind]} · ${active.assigneeName}`}
          footer={
            active.state !== "done" ? (
              <>
                <button
                  className="btn-primary"
                  disabled={saving || !dueDate || dueDate === active.dueDate}
                  onClick={() => void save(active, { dueDate })}
                  type="button"
                >
                  Save date
                </button>
                {active.cancellable ? (
                  <button
                    className="link text-sm text-danger"
                    disabled={saving}
                    onClick={() => {
                      if (window.confirm(`Cancel "${active.title}" for ${active.assigneeName}?`)) void save(active, { cancel: true });
                    }}
                    type="button"
                  >
                    Cancel assignment
                  </button>
                ) : null}
              </>
            ) : null
          }
          onClose={() => setEditing(null)}
          open
          size="form"
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusPill tone={STATE_PILL[active.state].tone}>{STATE_PILL[active.state].label}</StatusPill>
              {active.dueText}
            </span>
          }
          title={active.title}
        >
          <div className="flex flex-col gap-5">
            {active.detail ? <p className="m-0 text-sm text-ink-2">{active.detail}</p> : null}
            {active.kind === "quiz" || active.hasQuiz ? (
              <div>
                <p className="label-caps mb-2">Their answers</p>
                <QuizAnswers chapter={active.kind === "playbook"} id={active.id} />
              </div>
            ) : null}
            {active.state !== "done" ? (
              <label className="flex flex-col gap-1 self-start text-[13px] font-semibold text-ink">
                Due date
                <input className={INPUT_CLASS} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
              </label>
            ) : null}
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
