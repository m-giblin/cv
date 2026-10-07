"use client";

import { Check, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import type { AssignablePerson } from "@/lib/playbooks/assignment-access";
import {
  ASSIGNMENT_STATE_LABELS,
  dueLabel,
  todayIso,
  type AssignmentState,
  type PlaybookAssignment,
} from "@/lib/playbooks/assignment-model";
import type { CapabilityPlaybook } from "@/lib/playbooks/types";
import { cn } from "@/lib/utils";

const STATE_TONES: Record<AssignmentState, StatusTone> = {
  done: "success",
  overdue: "danger",
  in_progress: "blue",
  not_started: "neutral",
};

function Parts({ assignment }: { assignment: PlaybookAssignment }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
      {assignment.progress.parts.map((part) => (
        <span className={cn("inline-flex items-center gap-1", part.done ? "text-success" : "text-muted")} key={part.key}>
          {part.done ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Circle aria-hidden className="h-3 w-3" />}
          {part.label}
          <span className="sr-only">{part.done ? " (done)" : " (not done)"}</span>
          {!part.done && part.detail !== "Not yet" && part.detail !== "Not tried" ? <span className="text-ink-2">· {part.detail}</span> : null}
        </span>
      ))}
    </span>
  );
}

/** The signed-in person's assigned playbooks, soonest first; finished ones drop to the bottom. */
export function MyAssignments({ assignments, onOpen }: { assignments: PlaybookAssignment[]; onOpen: (slug: string) => void }) {
  const ordered = [...assignments].sort((a, b) => {
    const aDone = a.progress.state === "done" ? 1 : 0;
    const bDone = b.progress.state === "done" ? 1 : 0;
    return aDone - bDone || a.dueDate.localeCompare(b.dueDate);
  });
  const open = ordered.filter((item) => item.progress.state !== "done").length;
  if (!ordered.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-ink">
        Assigned to you <span className="num text-[15px] font-bold text-muted">· {open} open</span>
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
        {ordered.map((assignment) => (
          <li key={assignment.id}>
            <button
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left hover:bg-blue-soft/40"
              onClick={() => onOpen(assignment.playbookSlug)}
              type="button"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[16px] font-bold text-ink">{assignment.playbookTitle}</span>
                <Parts assignment={assignment} />
                {assignment.note ? <span className="text-[13px] text-ink-2">“{assignment.note}”{assignment.assignedByName ? ` · ${assignment.assignedByName}` : ""}</span> : null}
              </span>
              <span className={cn("text-[13px] font-bold", assignment.progress.state === "overdue" ? "text-danger" : "text-ink-2")}>
                {dueLabel(assignment.progress, assignment.dueDate)}
              </span>
              <StatusPill tone={STATE_TONES[assignment.progress.state]}>{ASSIGNMENT_STATE_LABELS[assignment.progress.state]}</StatusPill>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Manager / admin view: every assignment for the people they can reach, with progress. */
export function TeamAssignments({
  assignments,
  onAssign,
}: {
  assignments: PlaybookAssignment[];
  onAssign: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<AssignmentState | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const counts = useMemo(() => {
    const result: Record<AssignmentState, number> = { overdue: 0, in_progress: 0, not_started: 0, done: 0 };
    for (const item of assignments) result[item.progress.state] += 1;
    return result;
  }, [assignments]);
  const visible = assignments
    .filter((item) => filter === "all" || item.progress.state === filter)
    .sort((a, b) => {
      const order: AssignmentState[] = ["overdue", "not_started", "in_progress", "done"];
      return order.indexOf(a.progress.state) - order.indexOf(b.progress.state) || a.dueDate.localeCompare(b.dueDate);
    });

  async function update(assignment: PlaybookAssignment, body: { dueDate?: string; cancel?: boolean }) {
    setBusy(assignment.id);
    const response = await fetch(`/api/playbook-assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      const result = (await response?.json().catch(() => null)) as { error?: string } | null;
      window.alert(result?.error ?? "That didn't save. Try again.");
      return;
    }
    router.refresh();
  }

  function moveDueDate(assignment: PlaybookAssignment) {
    const next = window.prompt(`New due date for ${assignment.assigneeName} (YYYY-MM-DD)`, assignment.dueDate);
    if (next && /^\d{4}-\d{2}-\d{2}$/.test(next.trim())) void update(assignment, { dueDate: next.trim() });
  }

  function cancel(assignment: PlaybookAssignment) {
    if (window.confirm(`Cancel ${assignment.playbookTitle} for ${assignment.assigneeName}? Their practice history stays.`)) {
      void update(assignment, { cancel: true });
    }
  }

  const filters: { id: AssignmentState | "all"; label: string; count: number }[] = [
    { id: "all", label: "All", count: assignments.length },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "not_started", label: "Not started", count: counts.not_started },
    { id: "in_progress", label: "In progress", count: counts.in_progress },
    { id: "done", label: "Done", count: counts.done },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter assignments">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.id}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[14px] font-semibold",
                filter === item.id ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-2 hover:text-ink",
              )}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label} <span className="num">{item.count}</span>
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={onAssign} type="button">
          Assign playbooks
        </button>
      </div>
      {visible.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
          {visible.map((assignment) => (
            <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5" key={assignment.id}>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] text-ink">
                  <b>{assignment.assigneeName}</b> · {assignment.playbookTitle}
                </span>
                <Parts assignment={assignment} />
              </span>
              <span className={cn("text-[13px] font-bold", assignment.progress.state === "overdue" ? "text-danger" : "text-ink-2")}>
                {dueLabel(assignment.progress, assignment.dueDate)}
              </span>
              <StatusPill tone={STATE_TONES[assignment.progress.state]}>{ASSIGNMENT_STATE_LABELS[assignment.progress.state]}</StatusPill>
              {assignment.status === "active" ? (
                <span className="flex gap-1">
                  <button className="link text-[13px]" disabled={busy === assignment.id} onClick={() => moveDueDate(assignment)} type="button">
                    Move due date
                  </button>
                  <span aria-hidden className="text-muted">·</span>
                  <button className="link text-[13px] !text-danger" disabled={busy === assignment.id} onClick={() => cancel(assignment)} type="button">
                    Cancel
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[14px] border border-line bg-white px-6 py-8">
          <p className="m-0 text-[15px] font-bold text-ink">{assignments.length ? "Nothing in this view." : "No playbooks assigned yet."}</p>
          <p className="m-0 mt-1 text-sm text-ink-2">Assign playbooks with a due date; progress updates as people read and practise.</p>
        </div>
      )}
    </section>
  );
}

function addDays(days: number) {
  return todayIso(new Date(Date.now() + days * 86_400_000));
}

/** Full workbench to assign one or more playbooks to people with a due date. */
export function AssignWorkbench({
  playbooks,
  people,
  initialPlaybookIds,
  onClose,
}: {
  playbooks: CapabilityPlaybook[];
  people: AssignablePerson[];
  initialPlaybookIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [playbookIds, setPlaybookIds] = useState(new Set(initialPlaybookIds));
  const [assigneeIds, setAssigneeIds] = useState(new Set<string>());
  const [search, setSearch] = useState("");
  const [dueDate, setDueDate] = useState(addDays(14));
  const [requireRead, setRequireRead] = useState(true);
  const [requirePitch, setRequirePitch] = useState(true);
  const [requireObjections, setRequireObjections] = useState(true);
  const [passScore, setPassScore] = useState(70);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const matching = people.filter((person) => person.name.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const problems = [
    !playbookIds.size ? "Pick at least one playbook." : null,
    !assigneeIds.size ? "Pick at least one person." : null,
    !dueDate || dueDate < todayIso() ? "Pick a due date from today onward." : null,
    !requireRead && !requirePitch && !requireObjections ? "Pick at least one thing that counts as done." : null,
  ].filter(Boolean) as string[];

  async function submit() {
    setTried(true);
    if (problems.length) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/playbook-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playbookIds: [...playbookIds],
        assigneeIds: [...assigneeIds],
        dueDate,
        requireRead,
        requirePitch,
        requireObjections,
        pitchPassScore: passScore,
        note: note.trim() || undefined,
      }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response?.ok) {
      setError(body?.error ?? "That didn't save. Try again.");
      return;
    }
    onClose();
    router.refresh();
  }

  const count = playbookIds.size * assigneeIds.size;

  return (
    <Drawer
      bodyWidth="full"
      eyebrow="Playbooks"
      footer={
        <>
          <button className="btn-primary" disabled={saving} onClick={() => void submit()} type="button">
            {saving ? "Assigning…" : count ? `Assign ${count} ${count === 1 ? "playbook" : "playbooks"}` : "Assign"}
          </button>
          <button className="btn-secondary" disabled={saving} onClick={onClose} type="button">
            Cancel
          </button>
        </>
      }
      footerNote={
        error ? (
          <span className="text-danger" role="alert">
            {error}
          </span>
        ) : tried && problems.length ? (
          <span className="text-danger" role="alert">
            {problems[0]}
          </span>
        ) : (
          "Each person gets a notification, a reminder two days before, and one if it goes overdue."
        )
      }
      onClose={onClose}
      open
      size="form"
      subtitle="Pick the playbooks, the people and a due date. Practice they've already done counts."
      title="Assign playbooks"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div aria-labelledby="assign-playbooks" className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4" role="group">
          <h3 className="m-0 text-[16px] font-extrabold text-ink" id="assign-playbooks">
            Playbooks
          </h3>
          <ul className="m-0 flex max-h-[340px] flex-col gap-1 overflow-y-auto p-0">
            {playbooks.map((playbook) => (
              <li className="list-none" key={playbook.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] text-ink hover:bg-bg">
                  <input
                    checked={playbookIds.has(playbook.id)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-blue)]"
                    onChange={() => setPlaybookIds((set) => toggle(set, playbook.id))}
                    type="checkbox"
                  />
                  <span>
                    <span className="num text-muted">{playbook.chapter}.</span> {playbook.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div aria-labelledby="assign-people" className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4" role="group">
          <h3 className="m-0 text-[16px] font-extrabold text-ink" id="assign-people">
            People
          </h3>
          <div className="flex items-center gap-2">
            <Input aria-label="Search people" onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" value={search} />
            <button
              className="btn-secondary shrink-0"
              onClick={() =>
                setAssigneeIds((set) => {
                  const all = matching.every((person) => set.has(person.id));
                  const next = new Set(set);
                  for (const person of matching) {
                    if (all) next.delete(person.id);
                    else next.add(person.id);
                  }
                  return next;
                })
              }
              type="button"
            >
              {matching.length && matching.every((person) => assigneeIds.has(person.id)) ? "Clear" : "Select all"}
            </button>
          </div>
          {people.length ? (
            <ul className="m-0 flex max-h-[290px] flex-col gap-1 overflow-y-auto p-0">
              {matching.map((person) => (
                <li className="list-none" key={person.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] text-ink hover:bg-bg">
                    <input
                      checked={assigneeIds.has(person.id)}
                      className="h-4 w-4 accent-[var(--color-blue)]"
                      onChange={() => setAssigneeIds((set) => toggle(set, person.id))}
                      type="checkbox"
                    />
                    {person.name}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">Nobody reports to you yet.</p>
          )}
          <span className="text-[13px] text-muted">
            <span className="num">{assigneeIds.size}</span> selected
          </span>
        </div>

        <div aria-labelledby="assign-due-date" className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4" role="group">
          <h3 className="m-0 text-[16px] font-extrabold text-ink" id="assign-due-date">
            Due date
          </h3>
          <Input aria-label="Due date" min={todayIso()} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => (
              <button className="btn-secondary" key={days} onClick={() => setDueDate(addDays(days))} type="button">
                In {days} days
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-2" htmlFor="assign-note">
            Note for them (optional)
            <Textarea
              className="min-h-0 font-normal"
              id="assign-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Before the State DOT discovery call on the 21st."
              rows={2}
              value={note}
            />
          </label>
        </div>

        <div aria-labelledby="assign-counts-as-done-when-they" className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4" role="group">
          <h3 className="m-0 text-[16px] font-extrabold text-ink" id="assign-counts-as-done-when-they">
            Counts as done when they
          </h3>
          {(
            [
              ["Read the playbook", requireRead, setRequireRead],
              ["Pass the pitch drill", requirePitch, setRequirePitch],
              ["Complete the objection drill", requireObjections, setRequireObjections],
            ] as const
          ).map(([label, value, set]) => (
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink" key={label}>
              <input checked={value} className="h-4 w-4 accent-[var(--color-blue)]" onChange={(event) => set(event.target.checked)} type="checkbox" />
              {label}
            </label>
          ))}
          {requirePitch ? (
            <label className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
              <span className="whitespace-nowrap">Pitch pass mark</span>
              <Input
                aria-label="Pitch pass mark"
                className="!w-20"
                max={100}
                min={1}
                onChange={(event) => setPassScore(Math.max(1, Math.min(100, Number(event.target.value) || 70)))}
                type="number"
                value={passScore}
              />
              <span className="text-[13px] text-muted">average of the three rubric scores</span>
            </label>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
