"use client";

import { GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Field, LinkButton, SelectInput, TextArea, TextInput } from "@/components/admin/admin-ui";
import { usePlanBuilderData, type LibraryItem } from "@/components/plans/plan-builder-data";
import { PlanPreviewDrawer, StepFlightPreview } from "@/components/plans/plan-builder-preview";
import { PlanWeeksView } from "@/components/plans/plan-builder-weeks";
import { Chip } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  BUILDER_STEP_TYPES,
  builderTypeLabel,
  gateNumbers,
  pad2,
  planChecklist,
  segmentWeeksLabel,
  EVIDENCE_OPTIONS,
  PLAN_WEEKS,
  REVIEWER_OPTIONS,
  SEGMENT_NAMES,
  builderStepsToPayload,
  canPublish,
  catalogStepReady,
  challengeStepPatch,
  contentStepPatch,
  knowledgeCheckStepPatch,
  playbookStepPatch,
  simulationStepPatch,
  dayOf,
  dueLabel,
  emptyBuilderStep,
  incompleteSteps,
  issueLabel,
  minutesPerWeek,
  offsetFor,
  outlineGroups,
  stepIssues,
  stepWarnings,
  stepsEqual,
  templateToBuilderSteps,
  weekOf,
  type BuilderStep,
  type DbTemplate,
  type EvidenceKind,
  type ReviewerKind,
} from "@/lib/admin/plan-builder";
import { isLockedTemplate } from "@/lib/plans/template-lock";
import type { PlanStepType } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "outline" | "weeks";
const NEW_PLAN = "__new__";

const LIBRARY_TYPE: Record<LibraryItem["kind"], PlanStepType> = {
  sim: "simulation",
  challenge: "challenge",
  module: "content_review",
};

/** Sorts by due offset, keeping the existing order for ties. */
function sortByDue(steps: BuilderStep[]): BuilderStep[] {
  return steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => a.step.dueOffsetDays - b.step.dueOffsetDays || a.index - b.index)
    .map(({ step }) => step);
}

function segmentForWeek(steps: BuilderStep[], week: number): number | null {
  const group = outlineGroups(steps).find(
    (entry) => entry.segmentIndex !== null && week >= entry.startWeek && week <= entry.endWeek,
  );
  return group?.segmentIndex ?? null;
}

/**
 * Plan builder (handoff 13a/13b): one builder, two views toggled in the header. Publishing saves the
 * template through /api/plans/templates and is blocked while any step lacks type, criteria, evidence
 * or reviewer.
 */
export function PlanBuilder({
  lockedPlanId,
  embedded = false,
  onPublished,
  onDeleted,
  focusStepId,
  addStep: startWithNewStep = false,
}: {
  /** Open one program (or null for a new one) and hide the plan picker; used inside the program workbench. */
  lockedPlanId?: string | null;
  /** Inside a workbench: drop the page breadcrumb. */
  embedded?: boolean;
  onPublished?: (id: string) => void;
  onDeleted?: () => void;
  /** Open with this saved step selected (from the timeline's Edit). */
  focusStepId?: string | null;
  /** Open with a new blank step added at the end (from the timeline's Add step). */
  addStep?: boolean;
} = {}) {
  const data = usePlanBuilderData();
  const [planId, setPlanId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [baseline, setBaseline] = useState<{ name: string; description: string; steps: BuilderStep[] }>({
    name: "",
    description: "",
    steps: [],
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [view, setView] = useState<View>("outline");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledAdd = useRef(false);

  const template = data.templates.find((entry) => entry.id === planId) ?? null;
  const dirty =
    name !== baseline.name || description !== baseline.description || !stepsEqual(steps, baseline.steps);

  const openPlan = useCallback((next: DbTemplate | null) => {
    const nextSteps = next ? templateToBuilderSteps(next) : [emptyBuilderStep({ segmentIndex: 1 })];
    setPlanId(next?.id ?? null);
    setName(next?.name ?? "");
    setDescription(next?.description ?? "");
    setSteps(nextSteps);
    setBaseline({ name: next?.name ?? "", description: next?.description ?? "", steps: next ? nextSteps : [] });
    setSelectedKey(nextSteps[0]?.key ?? null);
  }, []);

  useEffect(() => {
    if (initialised || data.loading) return;
    const next =
      lockedPlanId !== undefined
        ? (data.templates.find((entry) => entry.id === lockedPlanId) ?? null)
        : (data.templates[0] ?? null);
    openPlan(next);
    if (next && focusStepId && next.steps.some((step) => step.id === focusStepId)) setSelectedKey(focusStepId);
    if (next && startWithNewStep) {
      // A new step due a day after the stage's last one, in the same segment.
      const existing = templateToBuilderSteps(next);
      const lastDue = existing.reduce((max, step) => Math.max(max, step.dueOffsetDays), 0);
      const step = emptyBuilderStep({ dueOffsetDays: lastDue + 1 || 5, segmentIndex: existing.at(-1)?.segmentIndex ?? null });
      setSteps([...existing, step]);
      setSelectedKey(step.key);
    }
    setInitialised(true);
  }, [data.loading, data.templates, focusStepId, initialised, lockedPlanId, openPlan, startWithNewStep]);

  // "Add to a ramp plan" from the practice wizard lands here with ?addPractice=sim:<id>&title=<name>.
  useEffect(() => {
    if (!initialised || handledAdd.current) return;
    const raw = searchParams.get("addPractice");
    if (!raw) return;
    handledAdd.current = true;
    const [kind, id = ""] = raw.split(":");
    const title = searchParams.get("title")?.trim() || "New practice";
    const lastDue = steps.reduce((max, step) => Math.max(max, step.dueOffsetDays), 0);
    const dueOffsetDays = Math.min(PLAN_WEEKS * 7, lastDue + 7) || 5;
    const step =
      kind === "sim"
        ? emptyBuilderStep({ title, stepType: "simulation", simulationTemplateId: id, dueOffsetDays, estimatedMinutes: 15 })
        : emptyBuilderStep({
            title,
            stepType: "custom",
            description: `Record the "${title}" pitch in Practice and submit it for review.`,
            dueOffsetDays,
          });
    step.segmentIndex = steps.at(-1)?.segmentIndex ?? null;
    setSteps((current) => [...current, step]);
    setSelectedKey(step.key);
    setView("outline");
    toast.success(`${title} added as a new step. Fill in the rest, then publish the plan.`);
    // Drop only the hand-off parameters so an open program workbench stays open.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("addPractice");
    params.delete("title");
    const query = params.toString();
    router.replace(query ? `/admin/programs?${query}` : "/admin/programs", { scroll: false });
  }, [initialised, router, searchParams, steps]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedIndex = steps.findIndex((step) => step.key === selectedKey);
  const selected = selectedIndex >= 0 ? steps[selectedIndex]! : null;
  const incomplete = incompleteSteps(steps);
  const publishable = canPublish(name, steps) && !saving;

  const challengeMinutes = useMemo(
    () => new Map(data.library.filter((item) => item.kind === "challenge").map((item) => [item.id, item.minutes])),
    [data.library],
  );
  const hours = useMemo(
    () =>
      minutesPerWeek(steps, (step) =>
        step.estimatedMinutes ?? (step.challengeId ? (challengeMinutes.get(step.challengeId) ?? null) : null),
      ),
    [challengeMinutes, steps],
  );

  function patchStep(key: string, patch: Partial<BuilderStep>) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function confirmDiscard() {
    return !dirty || window.confirm("Discard unpublished changes to this plan?");
  }

  function switchPlan(value: string) {
    if (!confirmDiscard()) return;
    openPlan(value === NEW_PLAN ? null : (data.templates.find((entry) => entry.id === value) ?? null));
  }

  function addStep(segmentIndex: number | null) {
    const segmentSteps = steps.filter((step) => step.segmentIndex === segmentIndex);
    const lastDue = (segmentSteps.at(-1) ?? steps.at(-1))?.dueOffsetDays ?? 0;
    const step = emptyBuilderStep({ segmentIndex, dueOffsetDays: Math.min(PLAN_WEEKS * 7, lastDue + 7) || 5 });
    const insertAt = segmentSteps.length
      ? steps.indexOf(segmentSteps[segmentSteps.length - 1]!) + 1
      : steps.length;
    setSteps((current) => [...current.slice(0, insertAt), step, ...current.slice(insertAt)]);
    setSelectedKey(step.key);
  }

  function removeStep(key: string) {
    const index = steps.findIndex((step) => step.key === key);
    setSteps((current) => current.filter((step) => step.key !== key));
    setSelectedKey(steps[index + 1]?.key ?? steps[index - 1]?.key ?? null);
  }

  function moveStep(from: number, to: number, segmentIndex?: number | null) {
    setSteps((current) => {
      if (from < 0 || from >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      const target = Math.max(0, Math.min(next.length, to));
      next.splice(target, 0, segmentIndex === undefined ? moved! : { ...moved!, segmentIndex });
      return next;
    });
  }

  function addFromLibrary(item: LibraryItem, week: number) {
    const stepType = LIBRARY_TYPE[item.kind];
    const sim = item.kind === "sim" ? data.simTemplates.find((entry) => entry.id === item.id) : null;
    const challenge = item.kind === "challenge" ? data.challenges.find((entry) => entry.id === item.id) : null;
    const asset = item.kind === "module" ? data.assets.find((entry) => entry.id === item.id) : null;
    const filled = sim
      ? simulationStepPatch(sim)
      : challenge
        ? challengeStepPatch(challenge)
        : asset
          ? contentStepPatch(asset)
          : { title: item.title, stepType, estimatedMinutes: item.minutes };
    const step = emptyBuilderStep({
      ...filled,
      dueOffsetDays: offsetFor(week, 5),
      segmentIndex: segmentForWeek(steps, week),
    });
    setSteps((current) => sortByDue([...current, step]));
    setSelectedKey(step.key);
    toast.success(`${item.title} added to week ${week}.`);
  }

  function moveStepToWeek(key: string, week: number) {
    setSteps((current) =>
      sortByDue(
        current.map((step) =>
          step.key === key
            ? { ...step, dueOffsetDays: offsetFor(week, dayOf(step.dueOffsetDays)), segmentIndex: step.segmentIndex }
            : step,
        ),
      ),
    );
    setSelectedKey(key);
  }

  function selectFirstIncomplete() {
    const first = incomplete[0];
    if (!first) return;
    setView("outline");
    setSelectedKey(first.key);
  }

  async function publish() {
    if (!canPublish(name, steps)) {
      if (name.trim().length < 3) toast.error("Give the program a name of at least 3 characters.");
      else selectFirstIncomplete();
      return;
    }
    setSaving(true);
    const response = await fetch(planId ? `/api/plans/templates/${planId}` : "/api/plans/templates", {
      method: planId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim(), steps: builderStepsToPayload(steps) }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Could not publish plan.");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    const savedId = planId ?? body.id ?? null;
    toast.success("Program published.");
    setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    const fresh = await data.loadTemplates();
    const saved = fresh.find((entry) => entry.id === savedId);
    if (saved) openPlan(saved);
    if (savedId) onPublished?.(savedId);
  }

  async function deletePlan() {
    if (!template) return;
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/plans/templates/${template.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not delete plan.");
      return;
    }
    toast.success("Program deleted.");
    const fresh = await data.loadTemplates();
    openPlan(fresh[0] ?? null);
    onDeleted?.();
  }

  const status = !planId
    ? "New program"
    : dirty
      ? "Unpublished changes"
      : template && isLockedTemplate(template)
        ? "Locked"
        : "Published";

  if (data.loading && !initialised) {
    return (
      <p aria-busy="true" className="px-[var(--page-pad-x)] py-16 text-center text-sm text-muted" role="status">
        Loading the plan builder…
      </p>
    );
  }

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line bg-white px-8 py-4 max-sm:px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[13px] text-muted">
          {embedded ? "Outline / " : "Programs / "}
          <b className="font-bold text-ink">{status}</b>
          {savedAt && !dirty ? `, saved at ${savedAt}` : ""}
        </p>
        <h1 className="m-0">
          <input
            aria-label="Program name"
            className="w-full min-w-[240px] rounded-[6px] bg-transparent text-2xl font-extrabold tracking-[-0.015em] text-ink placeholder:text-muted"
            onChange={(event) => setName(event.target.value)}
            placeholder="Name this program"
            value={name}
          />
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-[18px]">
        <SegmentedToggle
          label="Builder view"
          onChange={(id) => setView(id as View)}
          options={[
            { id: "outline", label: "Outline" },
            { id: "weeks", label: "Weeks" },
          ]}
          value={view}
        />
        {incomplete.length > 0 ? (
          <button
            className="text-sm font-semibold text-warning underline-offset-4 hover:underline"
            onClick={selectFirstIncomplete}
            type="button"
          >
            {incomplete.length} step{incomplete.length === 1 ? "" : "s"} incomplete
          </button>
        ) : (
          <span className="text-sm text-muted">{steps.length ? "Every step is complete" : "No steps yet"}</span>
        )}
        <LinkButton onClick={() => setPreviewOpen(true)}>Preview as SE</LinkButton>
        <button
          aria-describedby={!publishable ? "plan-publish-note" : undefined}
          className="btn-primary"
          disabled={!publishable}
          onClick={() => void publish()}
          type="button"
        >
          {saving ? "Publishing…" : "Publish"}
        </button>
        {!publishable ? (
          <span className="sr-only" id="plan-publish-note">
            Publishing needs a program name and, on every step, a type, done-when criteria, evidence and a reviewer.
          </span>
        ) : null}
      </div>
    </header>
  );

  const preview = (
    <PlanPreviewDrawer name={name} onClose={() => setPreviewOpen(false)} open={previewOpen} steps={steps} />
  );

  if (view === "weeks") {
    return (
      <div className="flex min-h-[640px] flex-col">
        {header}
        <PlanWeeksView
          library={data.library}
          minutesPerWeek={hours}
          onAddFromLibrary={addFromLibrary}
          onMoveStep={moveStepToWeek}
          onOpenStep={(key) => {
            setSelectedKey(key);
            setView("outline");
          }}
          selectedKey={selectedKey}
          steps={steps}
        />
        {preview}
      </div>
    );
  }

  const groups = outlineGroups(steps);
  const selectedSegment = selected?.segmentIndex ?? null;
  const gates = gateNumbers(steps);

  return (
    <div className="flex min-h-[640px] flex-col">
      {header}

      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Outline */}
        <nav
          aria-label="Plan outline"
          className="flex flex-col border-b border-line bg-white px-3.5 py-2 xl:border-r xl:border-b-0"
        >
          <div className={lockedPlanId !== undefined ? "hidden" : "px-2.5 pt-3.5 pb-1"}>
            <Field htmlFor="plan-picker" label="Program">
              <SelectInput
                className="py-2 text-sm"
                id="plan-picker"
                onChange={(event) => switchPlan(event.target.value)}
                value={planId ?? NEW_PLAN}
              >
                {data.templates.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
                <option value={NEW_PLAN}>New program</option>
              </SelectInput>
            </Field>
          </div>

          {groups.map((group) => (
            <div className="flex flex-col gap-0.5" key={group.segmentIndex ?? "none"}>
              <p
                className="px-2.5 pt-3.5 pb-1.5"
                onDragOver={(event) => dragIndex !== null && event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex === null) return;
                  const last = group.steps.at(-1)?.index ?? steps.length - 1;
                  moveStep(dragIndex, dragIndex <= last ? last : last + 1, group.segmentIndex);
                  setDragIndex(null);
                }}
              >
                <span className="th">{group.name}</span>{" "}
                <span className="text-xs font-medium text-muted">{segmentWeeksLabel(group)}</span>
              </p>
              {group.steps.map(({ step, index }) => {
                const isSelected = step.key === selectedKey;
                const issues = stepIssues(step);
                const label = step.title || "Untitled step";
                const gateNumber = gates.get(step.key);
                return (
                  <div
                    className={cn(
                      "grid grid-cols-[16px_28px_minmax(0,1fr)] items-center gap-2 rounded-[8px] border px-2.5 py-2",
                      isSelected ? "border-blue bg-blue-soft" : "border-transparent hover:bg-bg",
                      dragIndex === index && "rotate-[-1.5deg] bg-white shadow-[var(--shadow-drag)]",
                    )}
                    draggable
                    key={step.key}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(event) => dragIndex !== null && event.preventDefault()}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", step.key);
                      setDragIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex === null) return;
                      moveStep(dragIndex, index, group.segmentIndex);
                      setDragIndex(null);
                    }}
                  >
                    <GripVertical aria-hidden className="h-4 w-4 cursor-grab text-faint" />
                    {step.isSegmentGate ? (
                      <span aria-hidden className="grid h-5 place-items-center">
                        <span className={cn("h-[9px] w-[9px] rotate-45", issues.length === 0 ? "bg-blue" : "border-2 border-blue")} />
                      </span>
                    ) : (
                      <span aria-hidden className="num text-sm font-extrabold text-faint">
                        {pad2(index + 1)}
                      </span>
                    )}
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                      className="flex min-w-0 flex-col text-left"
                      onClick={() => setSelectedKey(step.key)}
                      onKeyDown={(event) => {
                        if (!event.altKey) return;
                        if (event.key === "ArrowUp" && index > 0) {
                          event.preventDefault();
                          moveStep(index, index - 1, steps[index - 1]!.segmentIndex);
                        } else if (event.key === "ArrowDown" && index < steps.length - 1) {
                          event.preventDefault();
                          moveStep(index, index + 1, steps[index + 1]!.segmentIndex);
                        }
                      }}
                      type="button"
                    >
                      <span className={cn("truncate text-sm text-ink", isSelected ? "font-bold" : "font-semibold")}>
                        {label}
                        <span className="sr-only">, step {index + 1}</span>
                      </span>
                      {issues.length > 0 ? (
                        <span className="truncate text-xs text-warning">
                          Missing {issues.map(issueLabel).join(", ")}
                        </span>
                      ) : (
                        <span className="truncate text-xs text-muted">
                          {step.isSegmentGate ? `Gate ${gateNumber ?? ""}`.trim() : builderTypeLabel(step.stepType)}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
              {group.segmentIndex === selectedSegment || (selectedSegment === null && group === groups.at(-1)) ? (
                <button
                  className="self-start px-2.5 py-2.5 text-sm font-bold text-blue hover:underline"
                  onClick={() => addStep(group.segmentIndex)}
                  type="button"
                >
                  + Add step
                </button>
              ) : null}
            </div>
          ))}
          {groups.length === 0 ? (
            <button className="self-start px-2.5 py-2.5 text-sm font-bold text-blue hover:underline" onClick={() => addStep(1)} type="button">
              + Add step
            </button>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 border-t border-divider px-2.5 pt-4 pb-3">
            <Field htmlFor="plan-description" label="Plan description">
              <TextArea
                className="min-h-16 text-sm"
                id="plan-description"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </Field>
            {template ? (
              <LinkButton className="self-start" onClick={() => void deletePlan()} tone="danger">
                Delete plan
              </LinkButton>
            ) : null}
          </div>
        </nav>

        {/* Step editor */}
        <section aria-label="Step editor" className="flex min-w-0 flex-col gap-4 px-8 py-6 max-sm:px-4">
          {selected ? (
            <StepEditor
              assets={data.assets}
              challenges={data.challenges}
              competencies={data.competencies}
              onChange={(patch) => patchStep(selected.key, patch)}
              onRemove={() => removeStep(selected.key)}
              simTemplates={data.simTemplates}
              step={selected}
            />
          ) : (
            <p className="text-sm text-muted">Select a step in the outline, or add one.</p>
          )}
        </section>

        {/* Live preview */}
        <aside
          aria-label="Live preview"
          className="flex flex-col gap-4 border-t border-line px-[22px] py-6 xl:border-t-0 xl:border-l"
        >
          <p className="label-caps">As the SE sees it</p>
          {selected ? <StepFlightPreview index={selectedIndex} step={selected} total={steps.length} /> : null}
          <ReadyChecklist onSelect={setSelectedKey} selected={selected} steps={steps} />
        </aside>
      </div>
      {preview}
    </div>
  );
}

type PlaybookOption = { id: string; title: string; chapter: number; slug: string };

/** Picks a published playbook chapter and fills the step from it. */
function PlaybookField({
  id,
  playbookId,
  title,
  onChange,
}: {
  id: string;
  playbookId: string;
  title: string;
  onChange: (patch: Partial<BuilderStep>) => void;
}) {
  const [playbooks, setPlaybooks] = useState<PlaybookOption[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/manager/assign")
      .then((response) => (response.ok ? response.json() : { playbooks: [] }))
      .then((body: { playbooks?: PlaybookOption[] }) => {
        if (!cancelled) setPlaybooks(body.playbooks ?? []);
      })
      .catch(() => !cancelled && setPlaybooks([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Field htmlFor={id} label="Playbook">
      <SelectInput
        className="text-sm"
        id={id}
        onChange={(event) => {
          const playbook = (playbooks ?? []).find((entry) => entry.id === event.target.value);
          onChange(playbook ? playbookStepPatch(playbook) : { playbookId: "", playbookSlug: "" });
        }}
        value={playbookId}
      >
        <option value="">{playbooks === null ? "Loading playbooks" : playbooks.length ? "Choose a playbook" : "No published playbooks"}</option>
        {playbookId && !(playbooks ?? []).some((entry) => entry.id === playbookId) ? (
          <option value={playbookId}>{title || "Linked playbook"}</option>
        ) : null}
        {(playbooks ?? []).map((playbook) => (
          <option key={playbook.id} value={playbook.id}>
            {playbook.chapter ? `Chapter ${playbook.chapter}: ${playbook.title}` : playbook.title}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}

/** Picks the question bank a knowledge check draws from, and the pass mark. */
function KnowledgeCheckField({
  id,
  questionSource,
  passScore,
  onChange,
}: {
  id: string;
  questionSource: string;
  passScore: number;
  onChange: (patch: Partial<BuilderStep>) => void;
}) {
  const [banks, setBanks] = useState<{ key: string; title: string; solution: string; questions: number }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/question-bank/quiz")
      .then((response) => (response.ok ? response.json() : { checks: [] }))
      .then((body: { checks?: { key: string; title: string; solution: string; questions: number }[] }) => {
        if (!cancelled) setBanks(body.checks ?? []);
      })
      .catch(() => !cancelled && setBanks([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Field htmlFor={id} label="Question bank">
        <SelectInput
          className="text-sm"
          id={id}
          onChange={(event) => {
            const bank = (banks ?? []).find((entry) => entry.key === event.target.value);
            if (!bank) {
              onChange({ questionSource: "" });
              return;
            }
            onChange(knowledgeCheckStepPatch(bank, passScore));
          }}
          value={questionSource}
        >
          <option value="">{banks === null ? "Loading checks" : banks.length ? "Choose a knowledge check" : "No checks with 3+ approved questions"}</option>
          {(banks ?? []).map((bank) => (
            <option key={bank.key} value={bank.key}>
              {bank.title} ({bank.solution}, {bank.questions} questions)
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field htmlFor={`${id}-pass`} label="Pass mark (%)">
        <TextInput
          className="text-sm"
          id={`${id}-pass`}
          max={100}
          min={1}
          onChange={(event) => {
            const next = Math.min(100, Math.max(1, Number(event.target.value) || 80));
            const bank = (banks ?? []).find((entry) => entry.key === questionSource);
            onChange(bank ? knowledgeCheckStepPatch(bank, next) : { passScore: next });
          }}
          type="number"
          value={passScore}
        />
      </Field>
    </>
  );
}

function CheckDot({ done, blocking }: { done: boolean; blocking: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
        done ? "bg-blue" : blocking ? "border-2 border-warning-dot" : "border-2 border-line-strong",
      )}
    >
      {done ? <span className="block h-2 w-1 -translate-y-px rotate-45 border-r-2 border-b-2 border-white" /> : null}
    </span>
  );
}

function ReadyChecklist({
  steps,
  selected,
  onSelect,
}: {
  steps: BuilderStep[];
  selected: BuilderStep | null;
  onSelect: (key: string) => void;
}) {
  const rows = planChecklist(steps);
  const warnings = selected ? stepWarnings(selected) : [];
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-base font-extrabold text-ink">Ready to publish?</p>
      {steps.length === 0 ? <p className="text-sm text-muted">Add a step to start.</p> : null}
      <ul className="flex flex-col">
        {rows.map((row) => {
          const tone = row.done ? "text-ink" : row.blocking ? "text-warning" : "text-muted";
          const content = (
            <>
              <CheckDot blocking={row.blocking} done={row.done} />
              <span>
                {row.label}
                <span className="sr-only">{row.done ? ", done" : row.blocking ? ", blocks publishing" : ", advice"}</span>
              </span>
            </>
          );
          return (
            <li className={cn("border-t border-divider py-2 text-sm", tone)} key={row.id}>
              {!row.done && row.stepKeys[0] ? (
                <button className="flex items-center gap-2.5 text-left hover:underline" onClick={() => onSelect(row.stepKeys[0]!)} type="button">
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2.5">{content}</span>
              )}
            </li>
          );
        })}
        {warnings.map((warning) => (
          <li className="flex items-center gap-2.5 border-t border-divider py-2 text-sm text-muted" key={warning}>
            <CheckDot blocking={false} done={false} />
            <span>This step {warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepEditor({
  step,
  onChange,
  onRemove,
  assets,
  challenges,
  simTemplates,
  competencies,
}: {
  step: BuilderStep;
  onChange: (patch: Partial<BuilderStep>) => void;
  onRemove: () => void;
  assets: { id: string; title: string; url: string }[];
  challenges: { id: string; title: string; estimated_minutes?: number | null }[];
  simTemplates: {
    id: string;
    name: string;
    persona?: string | null;
    goals?: string[];
    passMark?: number | null;
    competency?: string | null;
  }[];
  competencies: { id: string; name: string }[] | null;
}) {
  const id = (field: string) => `step-${step.key}-${field}`;
  const week = weekOf(step.dueOffsetDays);
  const dueOptions = Array.from({ length: PLAN_WEEKS * 7 }, (_, i) => i + 1);
  const criteria = step.criteria.length ? step.criteria : [""];
  const ready = catalogStepReady(step);
  const catalogPrompt =
    step.stepType === "simulation"
      ? "Choose a simulation. The title, the task, and the pass criteria fill in from it."
      : step.stepType === "knowledge_check"
        ? "Choose a knowledge check. The title and pass mark fill in from it."
        : step.stepType === "challenge"
          ? "Choose a challenge. The title and the task fill in from it."
          : step.stepType === "content_review"
            ? "Choose an item from the content library. The title and the task fill in from it."
            : step.stepType === "playbook"
              ? "Choose a playbook chapter. The title fills in from it. Add a knowledge check step next if you want a quiz on that chapter."
              : null;

  return (
    <>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold text-ink">Step type</legend>
        <div className="flex flex-wrap gap-1.5">
          {BUILDER_STEP_TYPES.map((option) => (
            <Chip active={step.stepType === option.type} key={option.type} onClick={() => onChange({ stepType: option.type })}>
              {option.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      {step.stepType === "simulation" ? (
        <Field htmlFor={id("resource")} label="Simulation">
          <SelectInput
            className="text-sm"
            id={id("resource")}
            onChange={(event) => {
              const sim = simTemplates.find((entry) => entry.id === event.target.value);
              onChange(sim ? simulationStepPatch(sim) : { simulationTemplateId: "" });
            }}
            value={step.simulationTemplateId}
          >
            <option value="">{simTemplates.length ? "Choose a simulation" : "No live simulations"}</option>
            {step.simulationTemplateId && !simTemplates.some((entry) => entry.id === step.simulationTemplateId) ? (
              <option value={step.simulationTemplateId}>{step.title || "Linked simulation"}</option>
            ) : null}
            {simTemplates.map((sim) => (
              <option key={sim.id} value={sim.id}>
                {sim.name}
                {sim.persona ? ` — ${sim.persona}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}

      {step.stepType === "playbook" ? (
        <PlaybookField id={id("resource")} onChange={onChange} playbookId={step.playbookId} title={step.title} />
      ) : null}

      {step.stepType === "knowledge_check" ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <KnowledgeCheckField
            id={id("resource")}
            onChange={onChange}
            passScore={step.passScore}
            questionSource={step.questionSource}
          />
        </div>
      ) : null}

      {step.stepType === "challenge" ? (
        <Field htmlFor={id("resource")} label="Challenge">
          <SelectInput
            className="text-sm"
            id={id("resource")}
            onChange={(event) => {
              const challenge = challenges.find((entry) => entry.id === event.target.value);
              onChange(challenge ? challengeStepPatch(challenge) : { challengeId: "" });
            }}
            value={step.challengeId}
          >
            <option value="">{challenges.length ? "Choose a challenge" : "No challenges"}</option>
            {challenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.title}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}

      {step.stepType === "content_review" ? (
        <Field htmlFor={id("resource")} label="Content">
          <SelectInput
            className="text-sm"
            id={id("resource")}
            onChange={(event) => {
              const asset = assets.find((entry) => entry.id === event.target.value);
              onChange(asset ? contentStepPatch(asset) : { contentAssetId: "", contentUrl: "" });
            }}
            value={step.contentAssetId}
          >
            <option value="">{assets.length ? "Choose content" : "Nothing in the library"}</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}

      {catalogPrompt && !ready ? <p className="text-sm text-muted">{catalogPrompt}</p> : null}

      {ready ? (
      <>
      <Field htmlFor={id("title")} label="Title">
        <TextInput id={id("title")} onChange={(event) => onChange({ title: event.target.value })} value={step.title} />
      </Field>

      <Field htmlFor={id("description")} label="What the SE does">
        <TextArea
          className="min-h-16 text-sm"
          id={id("description")}
          onChange={(event) => onChange({ description: event.target.value })}
          value={step.description}
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold text-ink">Done when</legend>
        <div className="flex flex-col gap-1.5 text-sm">
          {criteria.map((criterion, index) => (
            <div
              className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white py-1 pr-2 pl-3"
              key={index}
            >
              <Checkbox aria-hidden disabled tabIndex={-1} />
              <input
                aria-label={`Criterion ${index + 1}`}
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted"
                onChange={(event) =>
                  onChange({ criteria: criteria.map((item, i) => (i === index ? event.target.value : item)) })
                }
                placeholder="Observable result, for example a walkthrough recorded under 6 minutes"
                value={criterion}
              />
              {criteria.length > 1 ? (
                <LinkButton
                  aria-label={`Remove criterion ${index + 1}`}
                  className="text-[13px]"
                  onClick={() => onChange({ criteria: criteria.filter((_, i) => i !== index) })}
                  tone="danger"
                >
                  Remove
                </LinkButton>
              ) : null}
            </div>
          ))}
          <LinkButton className="self-start" onClick={() => onChange({ criteria: [...criteria, ""] })}>
            + Add criterion
          </LinkButton>
        </div>
      </fieldset>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field htmlFor={id("evidence")} label="Evidence">
          <SelectInput
            className="text-sm"
            id={id("evidence")}
            onChange={(event) => onChange({ evidence: event.target.value as EvidenceKind | "" })}
            value={step.evidence}
          >
            <option value="">Choose…</option>
            {EVIDENCE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field htmlFor={id("reviewer")} label="Reviewer">
          <SelectInput
            className="text-sm"
            id={id("reviewer")}
            onChange={(event) => onChange({ reviewer: event.target.value as ReviewerKind | "" })}
            value={step.reviewer}
          >
            <option value="">Choose…</option>
            {REVIEWER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field htmlFor={id("competency")} label="Competency">
          {competencies && competencies.length > 0 ? (
            <SelectInput
              className="text-sm"
              id={id("competency")}
              onChange={(event) => onChange({ competency: event.target.value })}
              value={step.competency}
            >
              <option value="">None</option>
              {step.competency && !competencies.some((entry) => entry.name === step.competency) ? (
                <option value={step.competency}>{step.competency}</option>
              ) : null}
              {competencies.map((entry) => (
                <option key={entry.id} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </SelectInput>
          ) : (
            <TextInput
              className="text-sm"
              id={id("competency")}
              onChange={(event) => onChange({ competency: event.target.value })}
              value={step.competency}
            />
          )}
        </Field>
        {step.stepType === "shadow_meeting_log" ||
        step.stepType === "mentor_review" ||
        step.stepType === "deal_prep" ||
        step.stepType === "custom" ? (
          <Field htmlFor={id("resource")} label="Resources">
            <SelectInput
              className="text-sm"
              id={id("resource")}
              onChange={(event) => {
                const asset = assets.find((entry) => entry.id === event.target.value);
                onChange({ contentAssetId: event.target.value, contentUrl: asset?.url ?? step.contentUrl });
              }}
              value={step.contentAssetId}
            >
              <option value="">None from library</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
      </div>
      </>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field htmlFor={id("due")} label="Due">
          <SelectInput
            className="text-sm"
            id={id("due")}
            onChange={(event) => onChange({ dueOffsetDays: Number(event.target.value) })}
            value={step.dueOffsetDays}
          >
            {(dueOptions.includes(step.dueOffsetDays) ? dueOptions : [...dueOptions, step.dueOffsetDays]).map(
              (offset) => (
                <option key={offset} value={offset}>
                  {dueLabel(offset)}
                </option>
              ),
            )}
          </SelectInput>
        </Field>
        <Field htmlFor={id("segment")} label="Segment">
          <SelectInput
            className="text-sm"
            id={id("segment")}
            onChange={(event) => onChange({ segmentIndex: event.target.value ? Number(event.target.value) : null })}
            value={step.segmentIndex ?? ""}
          >
            <option value="">No segment</option>
            {SEGMENT_NAMES.map((segment, index) => (
              <option key={segment} value={index + 1}>
                {segment}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm font-bold text-ink" htmlFor={id("gate")}>
            <input
              checked={step.isSegmentGate}
              className="h-[18px] w-[18px] shrink-0 rounded-[5px] accent-[var(--color-blue)]"
              id={id("gate")}
              onChange={(event) => onChange({ isSegmentGate: event.target.checked })}
              type="checkbox"
            />
            This step is a gate. Clearing it unlocks the next segment.
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-divider pt-3">
        <span className="text-[13px] text-muted">Due in week {week}</span>
        <LinkButton onClick={onRemove} tone="danger">
          Remove step
        </LinkButton>
      </div>
    </>
  );
}
