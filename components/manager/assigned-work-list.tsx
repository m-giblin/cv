"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { ObjectionEvidence, PitchEvidence } from "@/app/api/manager/playbook-evidence/route";
import type { AssignedWorkItem, AssignedWorkKind } from "@/lib/manager/assigned-work";
import { splitCoachMessage } from "@/lib/simulations/coach-message";
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
export function QuizAnswers({ id, chapter }: { id: string; chapter?: boolean }) {
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

const shortDate = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A chapter assignment's pitch and objection drills: scores, what was said, and the coach's notes. */
export function DrillEvidence({ id }: { id: string }) {
  const [evidence, setEvidence] = useState<{ pitches: PitchEvidence[]; objections: ObjectionEvidence[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/manager/playbook-evidence?id=${id}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { pitches?: PitchEvidence[]; objections?: ObjectionEvidence[]; error?: string } | null;
        if (!response.ok || !body?.pitches) throw new Error(body?.error ?? "Couldn't load the drills.");
        setEvidence({ pitches: body.pitches, objections: body.objections ?? [] });
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id]);
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!evidence) return <p className="text-sm text-muted">Loading drills</p>;
  return (
    <div className="flex flex-col gap-5">
      {evidence.objections.length ? (
        <div>
          <p className="label-caps mb-2">Objection drill</p>
          <div className="flex flex-col gap-3">
            {evidence.objections.map((run) => (
              <div className="rounded-[10px] border border-line bg-white" key={run.at}>
                <p className="m-0 flex items-center justify-between gap-3 border-b border-divider px-3 py-2 text-sm">
                  <span className="font-bold text-ink">
                    {shortDate(run.at)} · {run.score === null ? "Finished" : `${run.score}%`}
                  </span>
                  <span className="text-[13px] text-muted">with {run.persona}</span>
                </p>
                {run.debrief ? (
                  <p className="m-0 border-b border-divider bg-blue-soft/40 px-3 py-2 text-[13px] whitespace-pre-line text-ink">{run.debrief}</p>
                ) : null}
                <ol className="m-0 flex list-none flex-col gap-2 px-3 py-3">
                  {run.transcript.map((entry, index) => {
                    if (entry.speaker === "se") {
                      return (
                        <li className="text-sm" key={index}>
                          <span className="font-semibold text-blue">They said: </span>
                          <span className="text-ink">{entry.message}</span>
                        </li>
                      );
                    }
                    const parts = splitCoachMessage(entry.message);
                    return (
                      <li className="text-sm" key={index}>
                        <span className="font-semibold text-ink-2">Buyer: </span>
                        <span className="text-ink-2">{parts.reply}</span>
                        {parts.note ? (
                          <span className="mt-0.5 block text-[13px] text-muted">
                            Coach{parts.score ? ` ${parts.score.value}/${parts.score.outOf}` : ""}: {parts.note}
                          </span>
                        ) : null}
                        {parts.nextObjection ? <span className="mt-0.5 block text-ink-2">{parts.nextObjection}</span> : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {evidence.pitches.length ? (
        <div>
          <p className="label-caps mb-2">Pitch drills</p>
          <div className="flex flex-col gap-3">
            {evidence.pitches.map((pitch) => (
              <div className="rounded-[10px] border border-line bg-white px-3 py-2 text-sm" key={pitch.at}>
                <p className="m-0 flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">
                    {shortDate(pitch.at)} · {pitch.score ?? "Not scored"}
                  </span>
                  <span className="text-[13px] text-muted">{pitch.label}</span>
                </p>
                {pitch.scores.length ? (
                  <p className="m-0 mt-1 text-[13px] text-muted">{pitch.scores.map((row) => `${row.label} ${row.score}`).join(" · ")}</p>
                ) : null}
                {pitch.text ? (
                  <p className="m-0 mt-2 text-ink">“{pitch.text}”</p>
                ) : (
                  <p className="m-0 mt-2 text-[13px] text-muted">Score only: what they said wasn&apos;t saved with this attempt.</p>
                )}
                {pitch.missed.length ? <p className="m-0 mt-1 text-[13px] text-ink-2">Left out: {pitch.missed.join("; ")}</p> : null}
                {pitch.tips[0] ? <p className="m-0 mt-1 text-[13px] text-ink-2">Coach: {pitch.tips[0]}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const INPUT_CLASS = "rounded-[10px] border border-line-strong bg-white px-3 py-1.5 text-[15px] text-ink";

/** One row per assignment; a click opens it in a workbench to see the answers, move the due date or cancel. */
export function AssignedWorkList({
  items,
  onChanged,
  initialOpenId,
}: {
  items: AssignedWorkItem[] | null;
  onChanged: () => void;
  /** Open this assignment's workbench once the list loads (a notification link). */
  initialOpenId?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [editing, setEditing] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [openedInitial, setOpenedInitial] = useState(false);

  // Adjusting state during render, on the first load that contains the linked item.
  if (!openedInitial && initialOpenId && items) {
    const target = items.find((item) => item.id === initialOpenId);
    setOpenedInitial(true);
    if (target) {
      setFilter(target.state === "done" ? "done" : "open");
      setEditing(`${target.kind}:${target.id}`);
      setDueDate(target.dueDate ?? "");
    }
  }

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
                    {item.note ? <span className="line-clamp-2 text-[13px] text-ink-2">“{item.note}”</span> : null}
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    {item.dueText ? <span className="text-[13px] whitespace-nowrap text-muted">{item.dueText}</span> : null}
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
            {active.note ? <p className="m-0 text-sm text-ink-2">Your note: “{active.note}”</p> : null}
            {active.kind === "quiz" || active.hasQuiz ? (
              <div>
                <p className="label-caps mb-2">{active.kind === "playbook" ? "Knowledge check" : "Their answers"}</p>
                <QuizAnswers chapter={active.kind === "playbook"} id={active.id} />
              </div>
            ) : null}
            {active.kind === "playbook" && active.hasDrills ? <DrillEvidence id={active.id} /> : null}
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
