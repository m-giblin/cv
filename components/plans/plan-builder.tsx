"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, LinkButton, SelectInput, TextArea, TextInput } from "@/components/admin/admin-ui";
import { usePlanBuilderData, type LibraryItem } from "@/components/plans/plan-builder-data";
import { PlanPreviewDrawer, StepFlightPreview } from "@/components/plans/plan-builder-preview";
import { PlanWeeksView } from "@/components/plans/plan-builder-weeks";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  BUILDER_STEP_TYPES,
  EVIDENCE_OPTIONS,
  PLAN_WEEKS,
  REVIEWER_OPTIONS,
  SEGMENT_NAMES,
  builderStepsToPayload,
  canPublish,
  dayOf,
  dueLabel,
  emptyBuilderStep,
  incompleteSteps,
  issueLabel,
  minutesPerWeek,
  offsetFor,
  outlineGroups,
  segmentRangeLabel,
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
export function PlanBuilder() {
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
    openPlan(data.templates[0] ?? null);
    setInitialised(true);
  }, [data.loading, data.templates, initialised, openPlan]);

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
    const step = emptyBuilderStep({
      title: item.title,
      stepType,
      dueOffsetDays: offsetFor(week, 5),
      segmentIndex: segmentForWeek(steps, week),
      challengeId: item.kind === "challenge" ? item.id : "",
      simulationTemplateId: item.kind === "sim" ? item.id : "",
      contentAssetId: item.kind === "module" ? item.id : "",
      contentUrl: item.kind === "module" ? (item.url ?? "") : "",
      estimatedMinutes: item.minutes,
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
      if (name.trim().length < 3) toast.error("Give the plan a name of at least 3 characters.");
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
    toast.success("Plan published.");
    const fresh = await data.loadTemplates();
    const saved = fresh.find((entry) => entry.id === savedId);
    if (saved) openPlan(saved);
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
    toast.success("Plan deleted.");
    const fresh = await data.loadTemplates();
    openPlan(fresh[0] ?? null);
  }

  const status = !planId ? "NEW PLAN" : dirty ? "UNPUBLISHED CHANGES" : template && isLockedTemplate(template) ? "LOCKED" : "PUBLISHED";

  const headerControls = (
    <div className="flex flex-wrap items-center gap-[18px]">
      <SegmentedToggle
        label="Builder view"
        onChange={(id) => setView(id as View)}
        options={[
          { id: "outline", label: "Outline" },
          { id: "weeks", label: "W01–W13" },
        ]}
        value={view}
      />
      {view === "outline" ? (
        incomplete.length > 0 ? (
          <button
            className="font-mono text-xs text-muted uppercase underline decoration-signal decoration-2 underline-offset-[3px] hover:text-ink"
            onClick={selectFirstIncomplete}
            type="button"
          >
            {incomplete.length} incomplete
          </button>
        ) : (
          <span className="font-mono text-xs text-muted uppercase">{steps.length ? "All steps complete" : "No steps"}</span>
        )
      ) : null}
      <LinkButton onClick={() => setPreviewOpen(true)}>Preview as SE</LinkButton>
      <button
        aria-describedby={incomplete.length ? "plan-incomplete-note" : undefined}
        className="btn-primary"
        disabled={!publishable}
        onClick={() => void publish()}
        style={{ padding: "9px 20px", fontSize: 14 }}
        type="button"
      >
        {saving ? "Publishing…" : "Publish plan"}
      </button>
      {incomplete.length ? (
        <span className="sr-only" id="plan-incomplete-note">
          Publishing is blocked until every step has a type, done-when criteria, evidence and a reviewer.
        </span>
      ) : null}
    </div>
  );

  const titleBlock = (size: "outline" | "weeks") => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-mono text-xs text-muted uppercase">Programs / Ramp plans / {status}</span>
      <h1 className="m-0">
        <input
          aria-label="Plan name"
          className={cn(
            "w-full min-w-[240px] rounded-[6px] bg-transparent font-extrabold text-ink placeholder:text-faint",
            size === "outline" ? "text-2xl tracking-[-0.015em]" : "text-[26px] leading-[1.1] tracking-[-0.02em]",
          )}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name this plan"
          value={name}
        />
      </h1>
    </div>
  );

  if (data.loading && !initialised) {
    return (
      <p aria-busy="true" className="label-mono px-[var(--gutter)] py-16 text-center" role="status">
        Loading plan builder…
      </p>
    );
  }

  const preview = (
    <PlanPreviewDrawer name={name} onClose={() => setPreviewOpen(false)} open={previewOpen} steps={steps} />
  );

  if (view === "weeks") {
    return (
      <>
        <PlanWeeksView
          header={
            <header className="flex flex-wrap items-end justify-between gap-5 px-7 pt-[22px] pb-4">
              {titleBlock("weeks")}
              {headerControls}
            </header>
          }
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
      </>
    );
  }

  const groups = outlineGroups(steps);
  const selectedSegment = selected?.segmentIndex ?? null;

  return (
    <div className="flex min-h-[640px] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b-[1.5px] border-ink bg-white px-7 py-5">
        {titleBlock("outline")}
        {headerControls}
      </header>

      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        {/* Outline */}
        <nav
          aria-label="Plan outline"
          className="flex flex-col gap-1 border-b border-line bg-white px-3 py-4 text-sm xl:border-r xl:border-b-0"
        >
          <div className="mb-2 px-2">
            <Field htmlFor="plan-picker" label="Plan">
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
                <option value={NEW_PLAN}>+ New plan</option>
              </SelectInput>
            </Field>
          </div>

          {groups.map((group, groupIndex) => (
            <div className="flex flex-col gap-0.5" key={group.segmentIndex ?? "none"}>
              <div
                className={cn("flex justify-between px-2", groupIndex === 0 ? "py-1" : "pt-3 pb-1")}
                onDragOver={(event) => dragIndex !== null && event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex === null) return;
                  const last = group.steps.at(-1)?.index ?? steps.length - 1;
                  moveStep(dragIndex, dragIndex <= last ? last : last + 1, group.segmentIndex);
                  setDragIndex(null);
                }}
              >
                <span
                  className={cn(
                    "font-mono text-xs uppercase",
                    group.segmentIndex === selectedSegment ? "font-medium text-ink" : "text-muted",
                  )}
                >
                  {segmentRangeLabel(group)}
                </span>
                <span className="font-mono text-xs text-muted">{group.steps.length}</span>
              </div>
              {group.steps.map(({ step, index }) => {
                const isSelected = step.key === selectedKey;
                const issues = stepIssues(step);
                const label = step.title || "Untitled step";
                return (
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-2",
                      isSelected
                        ? "rounded-[10px] border-[1.5px] border-blue bg-blue-soft px-2.5 py-[9px] font-bold text-blue"
                        : "px-2 py-[7px] text-ink-2",
                      step.isSegmentGate && !isSelected && "font-semibold text-ink",
                      dragIndex === index && "opacity-40",
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
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                      {step.isSegmentGate ? (
                        <span
                          aria-hidden
                          className={cn(
                            "h-[9px] w-[9px] shrink-0 rotate-45",
                            issues.length === 0 ? "bg-blue" : "border-2 border-blue",
                          )}
                        />
                      ) : (
                        <span aria-hidden className="cursor-grab text-faint">
                          ⋮⋮
                        </span>
                      )}
                      <span className="truncate">
                        {label}
                        {step.isSegmentGate ? <span className="sr-only"> (gate)</span> : null}
                      </span>
                    </button>
                    {issues.length > 0 && !isSelected ? (
                      <span className="shrink-0 font-mono text-xs text-warning uppercase">{issues.length} missing</span>
                    ) : null}
                  </div>
                );
              })}
              {(group.segmentIndex === selectedSegment || (selectedSegment === null && groupIndex === groups.length - 1)) ? (
                <button
                  className="mx-2 my-1 rounded-[10px] border-[1.5px] border-dashed border-line-strong p-2 text-center font-bold text-blue hover:bg-blue-soft"
                  onClick={() => addStep(group.segmentIndex)}
                  type="button"
                >
                  + Add step
                </button>
              ) : null}
            </div>
          ))}
          {groups.length === 0 ? (
            <button
              className="mx-2 my-1 rounded-[10px] border-[1.5px] border-dashed border-line-strong p-2 text-center font-bold text-blue hover:bg-blue-soft"
              onClick={() => addStep(1)}
              type="button"
            >
              + Add step
            </button>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 border-t border-divider px-2 pt-4">
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
        <section aria-label="Step editor" className="flex min-w-0 flex-col gap-4 px-7 py-[22px]">
          {selected ? (
            <StepEditor
              competencies={data.competencies}
              assets={data.assets}
              challenges={data.challenges}
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
          className="flex flex-col gap-3 border-t border-line bg-surface-2 px-5 py-[22px] xl:border-t-0 xl:border-l"
        >
          <span className="font-mono text-xs text-muted uppercase">Live preview · what the SE sees</span>
          {selected ? <StepFlightPreview index={selectedIndex} step={selected} /> : null}
          <ReadyChecklist onSelect={setSelectedKey} selected={selected} steps={steps} />
        </aside>
      </div>
      {preview}
    </div>
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
  const rows: { ok: boolean; text: string; key?: string }[] = [];
  if (selected) {
    const issues = stepIssues(selected);
    const basics = issues.filter((issue) => issue === "type" || issue === "title");
    rows.push({
      ok: basics.length === 0 && Boolean(selected.description.trim()),
      text:
        basics.length === 0
          ? selected.description.trim()
            ? "Type, title, instructions"
            : "Add instructions for the SE"
          : `Missing ${basics.map(issueLabel).join(", ")}`,
    });
    const review = issues.filter((issue) => issue === "criteria" || issue === "evidence" || issue === "reviewer");
    const criteriaCount = selected.criteria.filter((item) => item.trim()).length;
    rows.push({
      ok: review.length === 0,
      text:
        review.length === 0
          ? `${criteriaCount} ${criteriaCount === 1 ? "criterion" : "criteria"}, evidence, reviewer`
          : `Missing ${review.map(issueLabel).join(", ")}`,
    });
    for (const warning of stepWarnings(selected)) rows.push({ ok: false, text: `This step ${warning}` });
  }
  for (const step of steps) {
    if (step.key === selected?.key) continue;
    const issues = stepIssues(step);
    const name = step.title || "Untitled step";
    if (issues.length) rows.push({ ok: false, text: `${name} has no ${issues.map(issueLabel).join(", ")}`, key: step.key });
    else for (const warning of stepWarnings(step)) rows.push({ ok: false, text: `${name} ${warning}`, key: step.key });
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 text-[13px] text-ink">
      <span className="font-mono text-xs text-muted uppercase">Ready to publish?</span>
      {rows.length === 0 ? <span className="text-muted">Add a step to start.</span> : null}
      {rows.slice(0, 8).map((row, i) => (
        <span className="flex gap-2" key={`${row.text}-${i}`}>
          <span aria-hidden className={cn("font-bold", row.ok ? "text-success" : "text-warning")}>
            {row.ok ? "✓" : "!"}
          </span>
          <span className="sr-only">{row.ok ? "Done:" : "Needs attention:"}</span>
          {row.key ? (
            <button className="text-left hover:underline" onClick={() => onSelect(row.key!)} type="button">
              {row.text}
            </button>
          ) : (
            row.text
          )}
        </span>
      ))}
      {rows.length > 8 ? <span className="text-muted">+{rows.length - 8} more</span> : null}
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
  challenges: { id: string; title: string }[];
  simTemplates: { id: string; name: string; persona?: string | null }[];
  competencies: { id: string; name: string }[] | null;
}) {
  const id = (field: string) => `step-${step.key}-${field}`;
  const week = weekOf(step.dueOffsetDays);
  const dueOptions = Array.from({ length: PLAN_WEEKS * 7 }, (_, i) => i + 1);
  const criteria = step.criteria.length ? step.criteria : [""];

  return (
    <>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold text-ink">Step type</legend>
        <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
          {BUILDER_STEP_TYPES.map((option) => {
            const active = step.stepType === option.type;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "rounded-full border-[1.5px] px-3 py-1.5",
                  active ? "border-blue bg-blue text-white" : "border-line-strong text-ink hover:bg-blue-soft",
                )}
                key={option.type}
                onClick={() => onChange({ stepType: option.type })}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

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
            <div className="flex items-center gap-2" key={index}>
              <input
                aria-label={`Criterion ${index + 1}`}
                className="min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted"
                onChange={(event) =>
                  onChange({ criteria: criteria.map((item, i) => (i === index ? event.target.value : item)) })
                }
                placeholder="Observable result, e.g. walkthrough recorded under 6 min"
                value={criterion}
              />
              {criteria.length > 1 ? (
                <button
                  aria-label={`Remove criterion ${index + 1}`}
                  className="rounded-full px-2 text-muted hover:text-danger"
                  onClick={() => onChange({ criteria: criteria.filter((_, i) => i !== index) })}
                  type="button"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
          <LinkButton className="self-start" onClick={() => onChange({ criteria: [...criteria, ""] })}>
            + Add criterion
          </LinkButton>
        </div>
      </fieldset>

      <div className="grid gap-3.5 sm:grid-cols-3">
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
        {step.stepType === "challenge" ? (
          <Field htmlFor={id("resource")} label="Challenge">
            <SelectInput
              className="text-sm"
              id={id("resource")}
              onChange={(event) => onChange({ challengeId: event.target.value })}
              value={step.challengeId}
            >
              <option value="">Not linked</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : step.stepType === "simulation" ? (
          <Field htmlFor={id("resource")} label="Persona">
            <SelectInput
              className="text-sm"
              id={id("resource")}
              onChange={(event) => onChange({ simulationTemplateId: event.target.value })}
              value={step.simulationTemplateId}
            >
              <option value="">No persona</option>
              {simTemplates.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  {sim.name}
                  {sim.persona ? ` · ${sim.persona}` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : (
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
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
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
              className="h-[18px] w-[18px] rounded-[5px] accent-[var(--color-blue)]"
              id={id("gate")}
              onChange={(event) => onChange({ isSegmentGate: event.target.checked })}
              type="checkbox"
            />
            Gate: clearing it unlocks the next segment
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-divider pt-3">
        <span className="font-mono text-xs text-muted uppercase">Due W{String(week).padStart(2, "0")}</span>
        <LinkButton onClick={onRemove} tone="danger">
          Remove step
        </LinkButton>
      </div>
    </>
  );
}
