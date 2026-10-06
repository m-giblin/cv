"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LinkButton, SelectInput, TextArea, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { FlightStrip } from "@/components/ui/flight-strip";
import { Modal } from "@/components/ui/modal";
import { Stamp } from "@/components/ui/stamp";
import { PITCH_TRACKS, PRACTICE_VERTICALS, type PracticeItem, type PracticeKind } from "@/lib/admin/practice-library";
import {
  DIFFICULTIES,
  MAX_GOALS,
  PITCH_DURATIONS,
  PITCH_PASS_MARKS,
  PRACTICE_ROUNDS,
  SIM_PASS_MARKS,
  WIZARD_DRAFT_STORAGE_KEY,
  WIZARD_STEP_LABELS,
  applyPreset,
  applyUpload,
  canPublish,
  canReach,
  duplicateFromPitch,
  duplicateFromSim,
  effectiveOverrides,
  initialWizardState,
  pitchDraftSavable,
  previewCopy,
  publishChecklist,
  rubric,
  scenarioText,
  stepHint,
  stepValid,
  toPitchPayload,
  toSimPayload,
  type OverrideKey,
  type WizardState,
  type WizardStep,
} from "@/lib/admin/practice-wizard";
import { cn } from "@/lib/utils";

/** What the wizard hands back after publishing. */
export type PublishedPractice = { id: string; kind: PracticeKind; name: string; sub: string; competency: string | null };

type Props = {
  open: boolean;
  /** Closes without publishing (Esc, Close, or Done after publishing). */
  onClose: () => void;
  /** Called once the item exists in the library. */
  onPublish: (item: PublishedPractice) => void;
  /** After publishing: 0 add to a ramp plan, 1 assign to SEs now, 2 back to the library. */
  onNext: (index: 0 | 1 | 2) => void;
  library: PracticeItem[];
  competencies: string[];
  /** Opens prefilled from this item ("Duplicate" in the library rail). */
  duplicateOf?: PracticeItem | null;
};

const tileBase = "flex w-full items-center gap-3 rounded-[12px] border bg-white px-3.5 py-[11px] text-left transition-colors";
const tileOn = "border-blue bg-blue-soft shadow-[inset_0_0_0_0.5px_var(--color-blue)]";
const tileOff = "border-line hover:border-line-strong";

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
        on ? "border-2 border-blue" : "border-[1.5px] border-faint",
      )}
    >
      {on ? <span className="h-2 w-2 rounded-full bg-blue" /> : null}
    </span>
  );
}

function ChoiceTile({
  on,
  title,
  desc,
  onPick,
  disabled,
}: {
  on: boolean;
  title: string;
  desc: string;
  onPick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-checked={on}
      className={cn(tileBase, on ? tileOn : tileOff, disabled && "cursor-not-allowed opacity-60")}
      disabled={disabled}
      onClick={onPick}
      role="radio"
      type="button"
    >
      <Radio on={on} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">{title}</span>
        <span className="text-[13px] text-muted">{desc}</span>
      </span>
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2.5">
      <legend className="mb-2 text-base font-extrabold text-ink">{title}</legend>
      {hint ? <p className="-mt-1.5 text-[13px] text-muted">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function ChipRow<T extends string | number>({
  options,
  value,
  onPick,
  label = (option: T) => String(option),
}: {
  options: readonly T[];
  value: T | null;
  onPick: (option: T) => void;
  label?: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Chip active={value === option} key={String(option)} onClick={() => onPick(option)}>
          {label(option)}
        </Chip>
      ))}
    </div>
  );
}

function readLocalDraft(): WizardState | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return { ...initialWizardState(), ...parsed };
  } catch {
    return null;
  }
}

function writeLocalDraft(state: WizardState | null) {
  try {
    if (state) window.localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private windows); drafts are a convenience.
  }
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

/**
 * New practice wizard (handoff 16): Start, Buyer, Scenario, Scoring. Publishing creates a simulation template
 * (POST /api/admin/simulation-templates) or a pitch scenario (POST/PATCH /api/admin/pitch-scenarios).
 */
export function PracticeWizard({ open, onClose, onPublish, onNext, library, competencies, duplicateOf }: Props) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const slugSuffix = useRef(Date.now().toString(36));
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [showRaw, setShowRaw] = useState(false);
  const [published, setPublished] = useState<PublishedPractice | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    slugSuffix.current = Date.now().toString(36);
    setPublished(null);
    setShowRaw(false);
    setBusy(false);
    if (duplicateOf) {
      const base = initialWizardState();
      setState(
        duplicateOf.sim
          ? duplicateFromSim(base, duplicateOf.sim, duplicateOf.key)
          : duplicateOf.pitch
            ? duplicateFromPitch(base, duplicateOf.pitch, duplicateOf.key)
            : base,
      );
      setDraftNote(null);
      return;
    }
    const draft = readLocalDraft();
    setState(draft ?? initialWizardState());
    setDraftNote(draft ? "Draft restored" : null);
  }, [open, duplicateOf]);

  const patch = (next: Partial<WizardState>) => setState((current) => ({ ...current, ...next }));
  const sim = state.kind === "sim";
  const valid = stepValid(state, state.step);
  const hint = published ? null : stepHint(state, state.step);
  const preview = previewCopy(state);
  const checks = publishChecklist(state);
  const competencyOptions = competencies.length ? competencies : [];
  const overrides = effectiveOverrides(state.overrides);

  function pickDuplicate(key: string) {
    const item = library.find((entry) => entry.key === key);
    if (!item) return;
    const base = { ...state, overrides: initialWizardState().overrides };
    setState(item.sim ? duplicateFromSim(base, item.sim, item.key) : item.pitch ? duplicateFromPitch(base, item.pitch, item.key) : state);
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast.error("Upload a .txt or .md file.");
      return;
    }
    const text = await file.text();
    setState((current) => applyUpload(current, file.name, text));
    toast.success("Scenario filled from the file. Check the rest before you publish.");
  }

  async function saveDraft() {
    if (pitchDraftSavable(state)) {
      setBusy(true);
      const response = await fetch(state.draftId ? `/api/admin/pitch-scenarios/${state.draftId}` : "/api/admin/pitch-scenarios", {
        method: state.draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPitchPayload(state, { active: false, suffix: slugSuffix.current })),
      });
      setBusy(false);
      if (!response.ok) {
        toast.error(await errorMessage(response, "Could not save the draft."));
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { id?: string };
      const next = { ...state, draftId: state.draftId ?? body.id ?? null };
      setState(next);
      writeLocalDraft(next);
      setDraftNote("Draft saved");
      toast.success("Draft saved. It shows in the library as a draft until you publish.");
      return;
    }
    writeLocalDraft(state);
    setDraftNote("Draft saved");
    toast.success(
      sim
        ? "Draft saved on this device. Simulations reach the library when you publish."
        : "Draft saved on this device. Add a name and situation to save it to the library.",
    );
  }

  async function publish() {
    if (!canPublish(state) || busy) return;
    setBusy(true);
    let id: string | null = null;
    if (sim) {
      const response = await fetch("/api/admin/simulation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSimPayload(state)),
      });
      if (!response.ok) {
        setBusy(false);
        toast.error(await errorMessage(response, "Could not publish. Check the fields and try again."));
        return;
      }
      id = ((await response.json().catch(() => ({}))) as { id?: string }).id ?? null;
    } else {
      const response = await fetch(state.draftId ? `/api/admin/pitch-scenarios/${state.draftId}` : "/api/admin/pitch-scenarios", {
        method: state.draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPitchPayload(state, { active: true, suffix: slugSuffix.current })),
      });
      if (!response.ok) {
        setBusy(false);
        toast.error(await errorMessage(response, "Could not publish. Check the fields and try again."));
        return;
      }
      id = state.draftId ?? ((await response.json().catch(() => ({}))) as { id?: string }).id ?? null;
    }
    setBusy(false);
    writeLocalDraft(null);
    const item: PublishedPractice = {
      id: id ?? "",
      kind: state.kind,
      name: state.name.trim(),
      sub: sim
        ? `${state.persona === "dynamic" ? "Dynamic buyer" : state.personaName.trim()}, ${state.vertical}, ${state.difficulty.toLowerCase()}`
        : `${state.duration} seconds, pass at ${state.pass} of 5`,
      competency: state.competency,
    };
    setPublished(item);
    onPublish(item);
  }

  function next() {
    if (published) {
      onClose();
      return;
    }
    if (!valid) return;
    if (state.step === 4) void publish();
    else patch({ step: (state.step + 1) as WizardStep });
  }

  const eyebrow = published
    ? "Published"
    : `New practice / Step ${state.step} of 4${draftNote ? ` / ${draftNote}` : ""}`;
  const heading = published ? published.name : state.step === 1 ? "Create practice for your SEs" : preview.title;
  const nextLabel = published
    ? "Done"
    : state.step === 4
      ? busy
        ? "Publishing…"
        : "Publish"
      : (["", "Next: buyer", "Next: scenario", "Next: scoring"] as const)[state.step];

  const nexts: { title: string; desc: string; disabled?: boolean }[] = [
    { title: "Add to a ramp plan", desc: "Opens the plan builder with this as a new step" },
    sim
      ? { title: "Assign to SEs now", desc: "Pick people; it shows on their Practice page" }
      : { title: "Assign to SEs now", desc: "Pitch scenarios rotate into every SE's pitch queue on their own", disabled: true },
    { title: "Back to the library", desc: "It appears at the top of the list" },
  ];

  return (
    <Modal labelledBy={titleId} onClose={onClose} open={open}>
      {/* Header */}
      <div className="flex flex-col gap-3.5 border-b border-line bg-white px-6 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="label-caps label-caps--blue">{eyebrow}</p>
            <h2
              className={cn(
                "truncate text-2xl leading-tight font-extrabold tracking-[-0.015em]",
                state.step > 1 && !preview.hasTitle && !published ? "text-muted" : "text-ink",
              )}
              id={titleId}
            >
              {heading}
            </h2>
          </div>
          <button
            aria-label="Close the wizard (Esc)"
            className="btn-secondary shrink-0 px-3.5 py-1.5 text-[13px]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <ol aria-label="Wizard steps" className="flex gap-2.5">
          {WIZARD_STEP_LABELS.map((label, index) => {
            const n = (index + 1) as WizardStep;
            const done = Boolean(published) || n < state.step;
            const current = !published && n === state.step;
            const reachable = !published && n !== state.step && canReach(state, n);
            return (
              <li className="min-w-0 flex-1" key={label}>
                <button
                  aria-current={current ? "step" : undefined}
                  className="flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
                  disabled={!reachable}
                  onClick={() => patch({ step: n })}
                  type="button"
                >
                  <span
                    aria-hidden
                    className={cn("h-2 w-full rounded-[2px]", done ? "bg-blue" : current ? "bg-signal" : "bg-track")}
                  />
                  <span
                    className={cn(
                      "truncate text-sm",
                      done || current ? "font-bold text-ink" : "font-medium text-muted",
                    )}
                  >
                    {label}
                    <span className="sr-only">{done ? " (done)" : current ? " (current)" : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-7 py-[22px]">
          {published ? (
            <div className="flex flex-col gap-3.5 pt-2">
              <Stamp label="Published" size={44} state="earned" />
              <p className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">{published.name} is live.</p>
              <p className="max-w-[460px] text-[15px] leading-normal text-ink-2">
                It&apos;s in the practice library now. Managers see it when they assign practice, and it counts toward{" "}
                {published.competency ?? "the selected competency"}.
              </p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                <p className="label-caps">Put it in front of SEs</p>
                {nexts.map((entry, index) => (
                  <button
                    className={cn(tileBase, tileOff, "justify-between", entry.disabled && "cursor-not-allowed opacity-60")}
                    disabled={entry.disabled}
                    key={entry.title}
                    onClick={() => onNext(index as 0 | 1 | 2)}
                    type="button"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-ink">{entry.title}</span>
                      <span className="text-[13px] text-muted">{entry.desc}</span>
                    </span>
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-blue" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!published && state.step === 1 ? (
            <>
              <Group title="What are you making?">
                <div className="grid gap-3" role="radiogroup" aria-label="Kind" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  {(
                    [
                      {
                        id: "sim" as const,
                        stub: "Sim",
                        title: "Simulation",
                        desc: "A live role-play with an AI buyer. Scored 0 to 100 with a coaching card for the manager.",
                        meta: "About 15 min for the SE",
                      },
                      {
                        id: "pitch" as const,
                        stub: "Pitch",
                        title: "Pitch scenario",
                        desc: "A timed, recorded pitch to a prompt. Scored 1 to 5 against your rubric.",
                        meta: "60 to 120 seconds for the SE",
                      },
                    ]
                  ).map((kind) => {
                    const on = state.kind === kind.id;
                    return (
                      <button
                        aria-checked={on}
                        className={cn(
                          "grid grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-[12px] border bg-white text-left",
                          on ? tileOn : tileOff,
                        )}
                        key={kind.id}
                        onClick={() => patch({ kind: kind.id, draftId: null })}
                        role="radio"
                        type="button"
                      >
                        <span
                          className={cn(
                            "flex justify-center pt-4 text-[11px] font-bold tracking-[0.08em] uppercase",
                            on ? "bg-blue text-signal" : "bg-divider text-muted",
                          )}
                        >
                          {kind.stub}
                        </span>
                        <span className="flex flex-col gap-1 px-4 py-3.5">
                          <span className="text-[17px] font-extrabold text-ink">{kind.title}</span>
                          <span className="text-[13px] leading-[1.45] text-ink-2">{kind.desc}</span>
                          <span className="text-[13px] font-semibold text-blue">{kind.meta}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Group>
              <Group title="Start from">
                <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Start from">
                  <ChoiceTile
                    desc="Start with empty fields"
                    on={state.start === "blank"}
                    onPick={() => setState((current) => applyPreset(current, "blank"))}
                    title="Blank"
                  />
                  <ChoiceTile
                    desc="Dynamic buyer, state agency, three goals filled in"
                    on={state.start === "sled"}
                    onPick={() => setState((current) => applyPreset(current, "sled"))}
                    title="Preset: SLED sales roleplay"
                  />
                  <ChoiceTile
                    desc="60-second pitch to a state CIO"
                    on={state.start === "elevator"}
                    onPick={() => setState((current) => applyPreset(current, "elevator"))}
                    title="Preset: elevator pitch"
                  />
                  <ChoiceTile
                    desc={library.length ? "Copy something in the library and edit it" : "Nothing in the library to copy yet"}
                    disabled={library.length === 0}
                    on={state.start === "dup"}
                    onPick={() => {
                      const first = library.find((item) => item.kind === state.kind) ?? library[0];
                      if (first) pickDuplicate(first.key);
                    }}
                    title="Duplicate existing"
                  />
                  {state.start === "dup" ? (
                    <div className="flex flex-col gap-1.5 pl-[44px]">
                      <label className="text-sm font-bold text-ink" htmlFor={`${titleId}-dup`}>
                        Copy from
                      </label>
                      <SelectInput id={`${titleId}-dup`} onChange={(event) => pickDuplicate(event.target.value)} value={state.duplicateOf ?? ""}>
                        {library.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.name} ({item.typeLabel.toLowerCase()})
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                  ) : null}
                  <ChoiceTile
                    desc=".txt or .md. We fill the scenario from it; you check the rest"
                    on={state.start === "upload"}
                    onPick={() => fileRef.current?.click()}
                    title="Upload a prompt file"
                  />
                  <input accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(event) => void onFile(event)} ref={fileRef} tabIndex={-1} type="file" aria-hidden />
                </div>
              </Group>
            </>
          ) : null}

          {!published && state.step === 2 ? (
            <>
              {sim ? (
                <>
                  <Group title="Who is the buyer?">
                    <div className="grid gap-2.5" role="radiogroup" aria-label="Buyer" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <ChoiceTile
                        desc="A new persona is generated for every run"
                        on={state.persona === "dynamic"}
                        onPick={() => patch({ persona: "dynamic" })}
                        title="Dynamic buyer"
                      />
                      <ChoiceTile
                        desc="Same person every time, for example a known CIO"
                        on={state.persona === "named"}
                        onPick={() => patch({ persona: "named" })}
                        title="Named persona"
                      />
                    </div>
                    {state.persona === "named" ? (
                      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                        <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                          Name
                          <TextInput onChange={(event) => patch({ personaName: event.target.value })} placeholder="Marcus Reid" value={state.personaName} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                          Role and organisation
                          <TextInput onChange={(event) => patch({ personaRole: event.target.value })} placeholder="CIO, State of Ohio" value={state.personaRole} />
                        </label>
                      </div>
                    ) : null}
                  </Group>
                  <Group title="Difficulty">
                    <ChipRow onPick={(difficulty) => patch({ difficulty })} options={DIFFICULTIES} value={state.difficulty} />
                  </Group>
                </>
              ) : (
                <>
                  <Group title="Track">
                    <ChipRow onPick={(track) => patch({ track })} options={PITCH_TRACKS} value={state.track} />
                  </Group>
                  <Group title="Time limit">
                    <ChipRow label={(value) => `${value} sec`} onPick={(duration) => patch({ duration })} options={PITCH_DURATIONS} value={state.duration} />
                  </Group>
                </>
              )}
              <Group hint={sim ? undefined : "Shown to the SE with the prompt. Pitch scenarios do not store a vertical yet."} title="Vertical">
                <ChipRow onPick={(vertical) => patch({ vertical })} options={PRACTICE_VERTICALS} value={state.vertical as (typeof PRACTICE_VERTICALS)[number]} />
              </Group>
            </>
          ) : null}

          {!published && state.step === 3 ? (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                Name
                <TextInput
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder={sim ? "Healthcare CISO, breach follow-up" : "Competitive: legacy IGA"}
                  value={state.name}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                {sim ? "What is the situation?" : "What does the SE see?"}
                <span className="-mt-0.5 text-[13px] font-normal text-muted">
                  {sim ? "Plain language. This becomes the buyer's background." : "The prompt shown before the timer starts."}
                </span>
                <TextArea
                  className="min-h-24 resize-none"
                  onChange={(event) => patch({ situation: event.target.value })}
                  placeholder={
                    sim
                      ? "A regional health system had a contractor account misused…"
                      : "The buyer says their current IGA tool works fine. You have 90 seconds…"
                  }
                  value={state.situation}
                />
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-bold text-ink">
                  {sim ? "What should the SE uncover?" : "What makes a strong pitch?"}
                </legend>
                <p className="-mt-1 text-[13px] text-muted">2 to 4 items. These become the scoring rubric.</p>
                {state.goals.map((goal, index) => (
                  <div
                    className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] border border-line-strong bg-white py-1 pr-2 pl-3"
                    key={index}
                  >
                    <span aria-hidden className="num text-base font-extrabold text-blue">
                      {index + 1}
                    </span>
                    <input
                      aria-label={`Goal ${index + 1}`}
                      className="min-w-0 bg-transparent py-1.5 text-[15px] text-ink placeholder:text-muted"
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          goals: current.goals.map((entry, i) => (i === index ? event.target.value : entry)),
                        }))
                      }
                      placeholder="Describe one thing the SE should do"
                      value={goal}
                    />
                    <LinkButton
                      aria-label={`Remove goal ${index + 1}`}
                      className="text-[13px]"
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          goals: current.goals.length > 1 ? current.goals.filter((_, i) => i !== index) : [""],
                        }))
                      }
                    >
                      Remove
                    </LinkButton>
                  </div>
                ))}
                {state.goals.length < MAX_GOALS ? (
                  <button
                    className="rounded-[10px] border border-dashed border-line-strong px-3 py-2.5 text-left text-[15px] text-ink-2 hover:border-blue hover:text-blue"
                    onClick={() => setState((current) => ({ ...current, goals: [...current.goals, ""] }))}
                    type="button"
                  >
                    + Add another
                  </button>
                ) : null}
              </fieldset>
              {sim ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-sm font-bold text-ink">Let managers change when they assign it</legend>
                  <div className="flex flex-wrap gap-5">
                    {(["solution", "vertical", "difficulty"] as OverrideKey[]).map((key) => {
                      const blocked = key === "difficulty" && !state.overrides.solution && !state.overrides.vertical;
                      return (
                        <label className={cn("flex items-center gap-2 text-sm text-ink", blocked && "opacity-60")} key={key}>
                          <Checkbox
                            checked={overrides[key]}
                            disabled={blocked}
                            onChange={() =>
                              setState((current) => ({
                                ...current,
                                overrides: { ...current.overrides, [key]: !current.overrides[key] },
                              }))
                            }
                          />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                      );
                    })}
                  </div>
                  {!state.overrides.solution && !state.overrides.vertical ? (
                    <p className="text-[13px] text-muted">Difficulty can change at assign only when solution or vertical can too.</p>
                  ) : null}
                </fieldset>
              ) : null}
              <div className="flex flex-col gap-2">
                <LinkButton aria-expanded={showRaw} className="self-start" onClick={() => setShowRaw((value) => !value)}>
                  {showRaw ? "Hide raw prompt" : "Edit raw prompt"}
                </LinkButton>
                {showRaw ? (
                  <>
                    <TextArea
                      aria-label="Raw prompt"
                      className="min-h-[180px] text-[13px] leading-[1.6]"
                      onChange={(event) => patch({ rawScenario: event.target.value })}
                      value={scenarioText(state)}
                    />
                    <p className="text-[13px] text-muted">
                      {sim
                        ? "Scoring (goals, pass mark, rounds and competency) is added below this when you publish."
                        : "Pitch scenarios store the situation and goals; this shows how they read together."}
                      {state.rawScenario !== null ? " " : null}
                      {state.rawScenario !== null ? (
                        <LinkButton className="text-[13px]" onClick={() => patch({ rawScenario: null })}>
                          Use the generated text
                        </LinkButton>
                      ) : null}
                    </p>
                  </>
                ) : null}
              </div>
            </>
          ) : null}

          {!published && state.step === 4 ? (
            <>
              <Group title="Pass mark">
                {sim ? (
                  <ChipRow label={(value) => `Pass at ${value}`} onPick={(pass) => patch({ pass })} options={SIM_PASS_MARKS} value={state.pass as (typeof SIM_PASS_MARKS)[number] | null} />
                ) : (
                  <ChipRow label={(value) => `${value} of 5`} onPick={(pass) => patch({ pass })} options={PITCH_PASS_MARKS} value={state.pass as (typeof PITCH_PASS_MARKS)[number] | null} />
                )}
              </Group>
              {sim ? (
                <Group hint="Unscored attempts before the SE submits. SEs can still submit at any time." title="Recommended practice rounds">
                  <ChipRow onPick={(rounds) => patch({ rounds })} options={PRACTICE_ROUNDS} value={state.rounds as (typeof PRACTICE_ROUNDS)[number]} />
                </Group>
              ) : null}
              <Group title="Counts toward">
                {competencyOptions.length ? (
                  <ChipRow onPick={(competency) => patch({ competency })} options={competencyOptions} value={state.competency} />
                ) : (
                  <p className="text-sm text-muted">Loading competencies…</p>
                )}
              </Group>
              <div className="flex flex-col gap-2">
                <p className="text-base font-extrabold text-ink">Scoring rubric</p>
                <div className="overflow-hidden rounded-[14px] border border-line bg-white">
                  {rubric(state).length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-muted">Add goals in step 3 to build the rubric.</p>
                  ) : (
                    rubric(state).map((row) => (
                      <div
                        className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-divider px-3.5 py-2.5 text-sm first:border-t-0"
                        key={row.n}
                      >
                        <span className="num font-extrabold text-blue">{row.n}</span>
                        <span className="text-ink">{row.text}</span>
                        <span className="num text-[13px] text-muted">{row.weight}</span>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[13px] text-muted">Goals are weighted equally.</p>
              </div>
            </>
          ) : null}
        </div>

        <aside
          aria-label="Live preview"
          className="flex flex-col gap-3.5 overflow-y-auto border-l border-line px-5 py-[22px] max-md:hidden"
          style={{ flex: "0 0 clamp(220px, 30%, 300px)" }}
        >
          <p className="label-caps">As the SE sees it</p>
          <FlightStrip className="shrink-0" compact numeral={preview.numeral} numeralCaption={preview.unit} stubLabel={preview.stub}>
            <span className="text-[13px] text-muted">{preview.meta}</span>
            <span className={cn("text-[17px] leading-[1.15] font-extrabold", preview.hasTitle ? "text-ink" : "text-muted")}>
              {preview.title}
            </span>
            <span className="line-clamp-4 text-[13px] leading-[1.45] text-ink-2">{preview.body}</span>
            <span className="text-[13px] font-semibold text-blue">{preview.foot}</span>
          </FlightStrip>
          <div className="flex shrink-0 flex-col gap-2">
            <p className="text-[15px] font-extrabold text-ink">Ready to publish?</p>
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {checks.map((row) => (
                <li className="flex items-center gap-2.5 border-t border-divider px-3 py-2 text-[13px] first:border-t-0" key={row.label}>
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
                      row.done ? "bg-blue" : "border-2 border-line-strong",
                    )}
                  >
                    {row.done ? <span className="block h-2 w-1 -translate-y-px rotate-45 border-r-2 border-b-2 border-white" /> : null}
                  </span>
                  <span className={row.done ? "text-ink" : "text-muted"}>
                    {row.label}
                    <span className="sr-only">{row.done ? ", done" : ", not yet"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-t border-line bg-white px-6 py-3.5">
        {!published && state.step > 1 ? (
          <LinkButton onClick={() => patch({ step: (state.step - 1) as WizardStep })}>Back</LinkButton>
        ) : null}
        {hint ? (
          <span aria-live="polite" className="text-[13px] text-warning">
            {hint}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-[18px]">
          {!published ? (
            <LinkButton disabled={busy} onClick={() => void saveDraft()}>
              Save as draft
            </LinkButton>
          ) : null}
          <button className="btn-primary" disabled={!published && (!valid || busy)} onClick={next} type="button">
            {nextLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
