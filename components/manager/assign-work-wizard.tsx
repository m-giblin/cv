"use client";

import { BookOpen, ClipboardCheck, ListChecks, Loader2, MessagesSquare, Mic } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { KIND_LABEL } from "@/components/manager/assigned-work-list";
import type { AssignedWorkKind } from "@/lib/manager/assigned-work";

type Person = { id: string; name: string; role: string; hasRampPlan: boolean };
type Options = {
  people: Person[];
  playbooks: { id: string; title: string; chapter: number; slug: string }[];
  simulations: { id: string; name: string; persona: string; vertical: string; solution_focus: string; difficulty: string }[];
  pitches: { id: string; label: string; track: string; max_duration_sec: number }[];
  checks?: { key: string; title: string; solution: string | null; questions: number; kind: string }[];
};

const KINDS: { kind: AssignedWorkKind; icon: ReactNode; blurb: string }[] = [
  { kind: "playbook", icon: <BookOpen aria-hidden size={20} />, blurb: "Read a chapter, then its pitch and objection drills" },
  { kind: "simulation", icon: <MessagesSquare aria-hidden size={20} />, blurb: "An AI roleplay call, scored and reviewed" },
  { kind: "pitch", icon: <Mic aria-hidden size={20} />, blurb: "Record a pitch in Pitch Studio for your review" },
  { kind: "quiz", icon: <ListChecks aria-hidden size={20} />, blurb: "A scored quiz; you see every answer they gave" },
  { kind: "ramp_task", icon: <ClipboardCheck aria-hidden size={20} />, blurb: "A one-off task added to their ramp plan" },
];

const STEPS = ["What", "Pick it", "Who and when"] as const;
const INPUT_CLASS = "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink";

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function OptionRow({
  checked,
  onToggle,
  title,
  detail,
  type,
  tryHref,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  detail?: string;
  type: "checkbox" | "radio";
  /** Opens the training in a new tab so the manager can try it before assigning it. */
  tryHref?: string;
}) {
  return (
    <div className={`flex items-start gap-3 border-b border-divider px-4 py-2.5 last:border-b-0 ${checked ? "bg-blue-soft" : "hover:bg-bg"}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
        <input checked={checked} className="mt-1" onChange={onToggle} type={type} />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{title}</span>
          {detail ? <span className="block text-[13px] text-muted">{detail}</span> : null}
        </span>
      </label>
      {tryHref ? (
        <a className="link shrink-0 pt-0.5 text-[13px]" href={tryHref} rel="noreferrer" target="_blank">
          Try it yourself
        </a>
      ) : null}
    </div>
  );
}

/** Step by step: what kind of work, which item, then who and by when. */
export function AssignWorkWizard({
  defaultPersonId,
  onCancel,
  onAssigned,
}: {
  defaultPersonId: string;
  onCancel: () => void;
  onAssigned: () => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<AssignedWorkKind | null>(null);
  const [passScore, setPassScore] = useState(80);
  const [picked, setPicked] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<string[]>([defaultPersonId]);
  const [dueDate, setDueDate] = useState(inDays(7));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/manager/assign")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Options | null) => {
        if (!cancelled) setOptions(body ?? { people: [], playbooks: [], simulations: [], pitches: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const multiPick = kind === "playbook" || kind === "pitch" || kind === "quiz";
  const allChoices = useMemo(() => {
    if (!options || !kind) return [];
    return (
      kind === "playbook"
        ? options.playbooks.map((p) => ({ id: p.id, title: `Ch. ${p.chapter} ${p.title}`, detail: undefined as string | undefined, tryHref: `/learn/playbooks?playbook=${p.slug}` }))
        : kind === "simulation"
          ? options.simulations.map((s) => ({
              id: s.id,
              title: s.name,
              detail: `${s.solution_focus}, ${s.difficulty}`,
              tryHref: `/practice/simulations?focus=simulation&template=${s.id}`,
            }))
          : kind === "pitch"
            ? options.pitches.map((p) => ({ id: p.id, title: p.label, detail: `${p.max_duration_sec} seconds`, tryHref: "/practice/pitch" }))
            : kind === "quiz"
              ? (options.checks ?? []).map((c) => ({
                  id: c.key,
                  title: c.title,
                  detail: `${c.kind === "playbook" ? "Playbook chapter" : (c.solution ?? "Product knowledge")} · ${c.questions} questions`,
                  tryHref: `/learn/knowledge-checks?source=${encodeURIComponent(c.key)}`,
                }))
              : []
    );
  }, [options, kind]);
  const query = search.trim().toLowerCase();
  const choices = query ? allChoices.filter((item) => `${item.title} ${item.detail ?? ""}`.toLowerCase().includes(query)) : allChoices;

  const nameOf = (id: string) => options?.people.find((person) => person.id === id)?.name ?? "this person";
  const pickedTitles =
    kind === "ramp_task"
      ? [taskTitle.trim()]
      : picked.map((id) => allChoices.find((item) => item.id === id)?.title ?? "");
  const noPlan = kind === "ramp_task" ? people.filter((id) => !options?.people.find((person) => person.id === id)?.hasRampPlan) : [];

  function next() {
    setError("");
    if (step === 0 && !kind) return setError("Pick a kind of work first.");
    if (step === 1) {
      if (kind === "ramp_task" && taskTitle.trim().length < 3) return setError("Give the task a title.");
      if (kind !== "ramp_task" && picked.length === 0) return setError(multiPick ? "Pick at least one." : "Pick one.");
    }
    setStep((value) => value + 1);
  }

  async function assign() {
    setError("");
    if (people.length === 0) return setError("Pick at least one person.");
    if (!dueDate) return setError("Pick a due date.");
    if (kind === "ramp_task" && noPlan.length === people.length) return setError("None of the people picked have a ramp plan yet.");
    setSaving(true);
    let response: Response;
    if (kind === "playbook") {
      response = await fetch("/api/playbook-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookIds: picked, assigneeIds: people, dueDate, note: note || undefined }),
      });
    } else if (kind === "simulation") {
      const template = options!.simulations.find((s) => s.id === picked[0])!;
      response = await fetch("/api/simulations/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          assignedToIds: people,
          vertical: template.vertical,
          solutionFocus: template.solution_focus,
          difficulty: template.difficulty,
          dueDate,
        }),
      });
    } else if (kind === "pitch") {
      response = await fetch("/api/manager/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "pitch", scenarioIds: picked, assigneeIds: people, dueDate, note: note || undefined }),
      });
    } else if (kind === "quiz") {
      response = await fetch("/api/manager/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quiz", sourceKeys: picked, assigneeIds: people, dueDate, passScore, note: note || undefined }),
      });
    } else {
      response = await fetch("/api/manager/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ramp_task",
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          assigneeIds: people.filter((id) => !noPlan.includes(id)),
          dueDate,
        }),
      });
    }
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "Couldn't assign that. Check the details and try again.");
      return;
    }
    const who = people.length === 1 ? nameOf(people[0]!) : `${people.length} people`;
    toast.success(`${KIND_LABEL[kind!]} assigned to ${who}`);
    onAssigned();
  }

  return (
    <section aria-label="Assign work" className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[18px] font-extrabold text-ink">Assign work</h3>
        <button className="link text-sm" onClick={onCancel} type="button">
          Close
        </button>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li
            aria-current={index === step ? "step" : undefined}
            className={`rounded-[8px] px-3 py-1 ${index === step ? "bg-blue-soft font-bold text-blue" : index < step ? "text-ink" : "text-muted"}`}
            key={label}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {!options ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="animate-spin" size={16} /> Loading what you can assign
        </p>
      ) : step === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KINDS.map((option) => (
            <button
              aria-pressed={kind === option.kind}
              className={`flex items-start gap-3 rounded-[12px] border p-4 text-left ${
                kind === option.kind ? "border-2 border-blue bg-blue-soft" : "border-line hover:border-line-strong"
              }`}
              key={option.kind}
              onClick={() => {
                if (kind !== option.kind) setPicked([]);
                setKind(option.kind);
                setSearch("");
                setError("");
              }}
              type="button"
            >
              <span className="text-blue">{option.icon}</span>
              <span>
                <span className="block font-bold text-ink">{KIND_LABEL[option.kind]}</span>
                <span className="block text-[13px] text-muted">{option.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      ) : step === 1 ? (
        kind === "ramp_task" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Task
              <input className={INPUT_CLASS} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Shadow two discovery calls" value={taskTitle} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              What good looks like (optional)
              <textarea className={INPUT_CLASS} onChange={(event) => setTaskDescription(event.target.value)} rows={3} value={taskDescription} />
            </label>
            <p className="text-[13px] text-muted">You sign it off when they submit it.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {multiPick ? "Pick one or more." : "Pick one."} Use Try it yourself to go through it first; it opens in a new tab and counts only
              for you.
            </p>
            <input aria-label="Search" className={INPUT_CLASS} onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
            {choices.length === 0 ? (
              <p className="text-sm text-muted">
                {kind === "playbook" ? "No published playbooks yet." : search ? "Nothing matches that search." : "Nothing to assign yet."}
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto rounded-[12px] border border-line">
                {choices.map((item) => (
                  <OptionRow
                    checked={picked.includes(item.id)}
                    detail={item.detail}
                    key={item.id}
                    onToggle={() =>
                      setPicked((current) =>
                        multiPick ? (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]) : [item.id],
                      )
                    }
                    title={item.title}
                    tryHref={item.tryHref}
                    type={multiPick ? "checkbox" : "radio"}
                  />
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h4 className="text-sm font-semibold text-ink">Who</h4>
              <button
                className="link text-sm"
                onClick={() => setPeople(people.length === options.people.length ? [defaultPersonId] : options.people.map((person) => person.id))}
                type="button"
              >
                {people.length === options.people.length ? "Just this person" : "Select everyone"}
              </button>
            </div>
            <div className="max-h-[220px] overflow-y-auto rounded-[12px] border border-line">
              {options.people.map((person) => (
                <OptionRow
                  checked={people.includes(person.id)}
                  detail={kind === "ramp_task" && !person.hasRampPlan ? "No ramp plan yet, will be skipped" : (["manager", "director"].includes(person.role) ? "Manager, assign them their own training" : person.role.replaceAll("_", " "))}
                  key={person.id}
                  onToggle={() => setPeople((current) => (current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id]))}
                  title={person.name}
                  type="checkbox"
                />
              ))}
            </div>
          </div>
          <div className={`grid grid-cols-1 gap-3 ${kind === "quiz" ? "sm:grid-cols-[200px_140px_minmax(0,1fr)]" : "sm:grid-cols-[200px_minmax(0,1fr)]"}`}>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Due date
              <input className={INPUT_CLASS} min={inDays(0)} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
            </label>
            {kind === "quiz" ? (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Pass mark (%)
                <input className={INPUT_CLASS} max={100} min={1} onChange={(event) => setPassScore(Number(event.target.value) || 80)} type="number" value={passScore} />
              </label>
            ) : null}
            {kind === "playbook" || kind === "pitch" || kind === "quiz" ? (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Note (optional)
                <input className={INPUT_CLASS} onChange={(event) => setNote(event.target.value)} placeholder="Ahead of the county RFP" value={note} />
              </label>
            ) : null}
          </div>
          <div className="rounded-[12px] bg-bg px-4 py-3 text-sm text-ink">
            <span className="font-bold">{KIND_LABEL[kind!]}:</span> {pickedTitles.join(", ")}
            <br />
            <span className="font-bold">For:</span> {people.length === 1 ? nameOf(people[0]!) : `${people.length} people`}
            {noPlan.length ? <span className="text-muted"> ({noPlan.length} without a ramp plan skipped)</span> : null}
            <br />
            <span className="font-bold">Due:</span>{" "}
            {dueDate ? new Date(`${dueDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Not set"}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex items-center justify-between gap-3 border-t border-divider pt-4">
        <button className="btn-secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)} type="button">
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary" disabled={!options} onClick={next} type="button">
            Next
          </button>
        ) : (
          <button className="btn-primary" disabled={saving} onClick={() => void assign()} type="button">
            {saving ? "Assigning" : "Assign"}
          </button>
        )}
      </div>
    </section>
  );
}
