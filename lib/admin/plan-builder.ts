import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import type { PlanStepType } from "@/lib/types";

/**
 * Plan builder model. Steps are stored in `plan_steps` (via /api/plans/templates); the builder-only
 * fields (criteria, evidence, reviewer, competency, estimated minutes) live in `plan_steps.metadata`.
 */

export const PLAN_WEEKS = 13;
export const WEEKLY_HOURS_TARGET = 4;

/** Step type pills in builder order. Labels follow the handoff; SE-facing labels come from step-labels.ts. */
export const BUILDER_STEP_TYPES: { type: PlanStepType; label: string; short: string }[] = [
  { type: "content_review", label: "Content", short: "CONTENT" },
  { type: "challenge", label: "Challenge", short: "CHALLENGE" },
  { type: "simulation", label: "Simulation", short: "SIM" },
  { type: "shadow_meeting_log", label: "Shadow", short: "SHADOW" },
  { type: "mentor_review", label: "Review", short: "REVIEW" },
  { type: "deal_prep", label: "Deal prep", short: "DEAL PREP" },
  { type: "knowledge_check", label: "Knowledge check", short: "CHECK" },
  { type: "custom", label: "Task", short: "TASK" },
];

export const EVIDENCE_OPTIONS = [
  { id: "recording", label: "Recording" },
  { id: "document", label: "Document" },
  { id: "link", label: "Link" },
  { id: "screenshot", label: "Screenshot" },
  { id: "score", label: "Score (automatic)" },
  { id: "observation", label: "Reviewer observation" },
] as const;

export const REVIEWER_OPTIONS = [
  { id: "manager", label: "SE's manager" },
  { id: "mentor", label: "Assigned mentor" },
  { id: "admin", label: "Enablement admin" },
  { id: "auto", label: "Automatic (score)" },
] as const;

export type EvidenceKind = (typeof EVIDENCE_OPTIONS)[number]["id"];
export type ReviewerKind = (typeof REVIEWER_OPTIONS)[number]["id"];

/** Ramp segments. `plan_steps.metadata.segmentIndex` is 1–4. */
export const SEGMENT_NAMES = ["Foundations", "Field skills", "Advisory readiness", "Certification"] as const;

export type BuilderStep = {
  /** Stable client key (db id for saved steps). */
  key: string;
  id?: string;
  title: string;
  description: string;
  stepType: PlanStepType | null;
  dueOffsetDays: number;
  contentUrl: string;
  contentAssetId: string;
  challengeId: string;
  simulationTemplateId: string;
  /** Knowledge check: question-bank source key and pass mark (%). */
  questionSource: string;
  passScore: number;
  segmentIndex: number | null;
  isSegmentGate: boolean;
  criteria: string[];
  evidence: EvidenceKind | "";
  reviewer: ReviewerKind | "";
  competency: string;
  estimatedMinutes: number | null;
};

export type DbTemplateStep = {
  id: string;
  title: string;
  description: string | null;
  step_type: PlanStepType;
  sort_order: number;
  content_url: string | null;
  content_asset_id: string | null;
  challenge_id: string | null;
  simulation_template_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type DbTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_locked?: boolean | null;
  steps: DbTemplateStep[];
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isOption<T extends string>(value: unknown, options: readonly { id: T }[]): value is T {
  return typeof value === "string" && options.some((option) => option.id === value);
}

export function dbStepToBuilder(step: DbTemplateStep): BuilderStep {
  const meta = parsePlanStepMetadata(step.metadata, step.sort_order);
  const raw = step.metadata ?? {};
  const criteria = Array.isArray(raw.criteria)
    ? raw.criteria.filter((item): item is string => typeof item === "string")
    : [];
  return {
    key: step.id,
    id: step.id,
    title: step.title,
    description: step.description ?? "",
    stepType: step.step_type,
    dueOffsetDays: Math.max(1, meta.dueOffsetDays ?? step.sort_order * 7),
    contentUrl: step.content_url ?? "",
    contentAssetId: step.content_asset_id ?? "",
    challengeId: step.challenge_id ?? "",
    simulationTemplateId: step.simulation_template_id ?? "",
    questionSource: str(raw.questionSource),
    passScore: typeof raw.passScore === "number" ? raw.passScore : 80,
    segmentIndex: meta.segmentIndex,
    isSegmentGate: meta.isSegmentGate,
    criteria,
    evidence: isOption(raw.evidence, EVIDENCE_OPTIONS) ? raw.evidence : "",
    reviewer: isOption(raw.reviewer, REVIEWER_OPTIONS) ? raw.reviewer : "",
    competency: str(raw.competency),
    estimatedMinutes: typeof raw.estimatedMinutes === "number" ? raw.estimatedMinutes : null,
  };
}

export function templateToBuilderSteps(template: DbTemplate): BuilderStep[] {
  return [...template.steps].sort((a, b) => a.sort_order - b.sort_order).map(dbStepToBuilder);
}

let keySeed = 0;
export function newStepKey(): string {
  keySeed += 1;
  return `new-${Date.now().toString(36)}-${keySeed}`;
}

export function emptyBuilderStep(partial: Partial<BuilderStep> = {}): BuilderStep {
  return {
    key: newStepKey(),
    title: "",
    description: "",
    stepType: null,
    dueOffsetDays: 5,
    contentUrl: "",
    contentAssetId: "",
    challengeId: "",
    simulationTemplateId: "",
    questionSource: "",
    passScore: 80,
    segmentIndex: null,
    isSegmentGate: false,
    criteria: [""],
    evidence: "",
    reviewer: "",
    competency: "",
    estimatedMinutes: null,
    ...partial,
  };
}

/** Payload for POST/PATCH /api/plans/templates. */
export function builderStepsToPayload(steps: BuilderStep[]) {
  return steps.map((step) => ({
    id: step.id,
    title: step.title.trim(),
    description: step.description.trim(),
    stepType: step.stepType ?? "custom",
    dueOffsetDays: Math.max(1, Math.round(step.dueOffsetDays)),
    contentUrl: step.contentUrl.trim(),
    contentAssetId: step.contentAssetId,
    challengeId: step.challengeId,
    simulationTemplateId: step.simulationTemplateId,
    questionSource: step.stepType === "knowledge_check" ? step.questionSource || null : undefined,
    passScore: step.stepType === "knowledge_check" ? step.passScore : undefined,
    segmentIndex: step.segmentIndex,
    isSegmentGate: step.isSegmentGate,
    criteria: cleanCriteria(step.criteria),
    evidence: step.evidence || null,
    reviewer: step.reviewer || null,
    competency: step.competency.trim() || null,
    estimatedMinutes: step.estimatedMinutes,
  }));
}

export function cleanCriteria(criteria: string[]): string[] {
  return criteria.map((item) => item.trim()).filter(Boolean);
}

export type StepIssue = "type" | "title" | "criteria" | "evidence" | "reviewer";

const ISSUE_LABELS: Record<StepIssue, string> = {
  type: "type",
  title: "title",
  criteria: "done-when criteria",
  evidence: "evidence",
  reviewer: "reviewer",
};

/** Blocking issues: a plan cannot publish while any step has one. */
export function stepIssues(step: BuilderStep): StepIssue[] {
  const issues: StepIssue[] = [];
  if (!step.stepType) issues.push("type");
  if (step.title.trim().length < 2) issues.push("title");
  // A knowledge check grades itself: passing the quiz is the evidence and the sign-off.
  if (step.stepType === "knowledge_check") return issues;
  if (cleanCriteria(step.criteria).length === 0) issues.push("criteria");
  if (!step.evidence) issues.push("evidence");
  if (!step.reviewer) issues.push("reviewer");
  return issues;
}

export function issueLabel(issue: StepIssue): string {
  return ISSUE_LABELS[issue];
}

/** Non-blocking hints shown with "!" in the checklist. */
export function stepWarnings(step: BuilderStep): string[] {
  const warnings: string[] = [];
  if (step.stepType === "simulation" && !step.simulationTemplateId) warnings.push("has no persona");
  if (step.stepType === "challenge" && !step.challengeId) warnings.push("has no challenge linked");
  if (step.stepType === "knowledge_check" && !step.questionSource) warnings.push("has no question bank linked");
  if (step.stepType === "content_review" && !step.contentAssetId && !step.contentUrl.trim()) {
    warnings.push("has no content linked");
  }
  return warnings;
}

export function incompleteSteps(steps: BuilderStep[]): BuilderStep[] {
  return steps.filter((step) => stepIssues(step).length > 0);
}

export function canPublish(name: string, steps: BuilderStep[]): boolean {
  return name.trim().length >= 3 && steps.length > 0 && incompleteSteps(steps).length === 0;
}

export function weekOf(dueOffsetDays: number): number {
  return Math.max(1, Math.ceil(dueOffsetDays / 7));
}

export function dayOf(dueOffsetDays: number): number {
  return dueOffsetDays - (weekOf(dueOffsetDays) - 1) * 7;
}

export function offsetFor(week: number, day: number): number {
  return (Math.max(1, week) - 1) * 7 + Math.min(7, Math.max(1, day));
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dueLabel(dueOffsetDays: number): string {
  return `Week ${weekOf(dueOffsetDays)}, day ${dayOf(dueOffsetDays)}`;
}

/** @deprecated v2 code style; same as {@link dueLabel}. */
export function shortDueLabel(dueOffsetDays: number): string {
  return dueLabel(dueOffsetDays);
}

export function builderTypeLabel(type: PlanStepType | null): string {
  return BUILDER_STEP_TYPES.find((entry) => entry.type === type)?.label ?? "No type yet";
}

export function builderTypeShort(type: PlanStepType | null): string {
  return BUILDER_STEP_TYPES.find((entry) => entry.type === type)?.short ?? "UNTYPED";
}

export type OutlineGroup = {
  segmentIndex: number | null;
  name: string;
  startWeek: number;
  endWeek: number;
  steps: { step: BuilderStep; index: number }[];
};

/**
 * Groups steps by segment in segment order (unsegmented last) and derives each segment's week span:
 * a segment starts the week after the previous one ends and ends at its latest due week.
 */
export function outlineGroups(steps: BuilderStep[]): OutlineGroup[] {
  const indexed = steps.map((step, index) => ({ step, index }));
  const groups: OutlineGroup[] = [];
  let cursor = 1;
  const segmentIds = [1, 2, 3, 4].filter((segment) => indexed.some(({ step }) => step.segmentIndex === segment));
  segmentIds.forEach((segment, position) => {
    const members = indexed.filter(({ step }) => step.segmentIndex === segment);
    const maxWeek = Math.max(...members.map(({ step }) => weekOf(step.dueOffsetDays)));
    const isLast = position === segmentIds.length - 1;
    const start = Math.min(cursor, PLAN_WEEKS);
    const end = Math.min(PLAN_WEEKS, Math.max(start, isLast ? Math.max(maxWeek, PLAN_WEEKS) : maxWeek));
    groups.push({ segmentIndex: segment, name: SEGMENT_NAMES[segment - 1]!, startWeek: start, endWeek: end, steps: members });
    cursor = end + 1;
  });
  const loose = indexed.filter(({ step }) => step.segmentIndex === null);
  if (loose.length > 0) {
    const weeks = loose.map(({ step }) => weekOf(step.dueOffsetDays));
    groups.push({
      segmentIndex: null,
      name: "No segment",
      startWeek: Math.min(...weeks),
      endWeek: Math.min(PLAN_WEEKS, Math.max(...weeks)),
      steps: loose,
    });
  }
  return groups;
}

export function segmentRangeLabel(group: Pick<OutlineGroup, "startWeek" | "endWeek" | "name">): string {
  const range =
    group.startWeek === group.endWeek
      ? `W${pad2(group.startWeek)}`
      : `W${pad2(group.startWeek)}–${pad2(group.endWeek)}`;
  return `${range} · ${group.name}`.toUpperCase();
}

/** "weeks 1 to 4" (or "week 5"), shown beside the segment name in the outline. */
export function segmentWeeksLabel(group: Pick<OutlineGroup, "startWeek" | "endWeek">): string {
  return group.startWeek === group.endWeek ? `week ${group.startWeek}` : `weeks ${group.startWeek} to ${group.endWeek}`;
}

export type ChecklistRow = { id: string; label: string; done: boolean; blocking: boolean; stepKeys: string[] };

function stepNumbers(steps: BuilderStep[], keys: string[]): string {
  const numbers = keys.map((key) => pad2(steps.findIndex((step) => step.key === key) + 1));
  const shown = numbers.slice(0, 3).join(", ");
  const more = numbers.length > 3 ? ` and ${numbers.length - 3} more` : "";
  return `${numbers.length === 1 ? "step" : "steps"} ${shown}${more}`;
}

/** Plan-level "Ready to publish?" rows (13a). The first four block publishing; the gate row is advice. */
export function planChecklist(steps: BuilderStep[]): ChecklistRow[] {
  const missing = (issue: StepIssue) => steps.filter((step) => stepIssues(step).includes(issue)).map((step) => step.key);
  const row = (id: string, label: string, keys: string[], blocking = true): ChecklistRow => ({
    id,
    label: keys.length ? `${label} (${stepNumbers(steps, keys)})` : label,
    done: steps.length > 0 && keys.length === 0,
    blocking,
    stepKeys: keys,
  });
  const titled = [...missing("type"), ...missing("title")];
  const segments = outlineGroups(steps).filter((group) => group.segmentIndex !== null);
  const ungated = segments.filter((group) => !group.steps.some(({ step }) => step.isSegmentGate));
  return [
    row("type", "Every step has a type and title", [...new Set(titled)]),
    row("criteria", "Every step has done-when criteria", missing("criteria")),
    row("evidence", "Every step asks for evidence", missing("evidence")),
    row("reviewer", "Every step has a reviewer", missing("reviewer")),
    {
      id: "gates",
      label: ungated.length
        ? `Every segment ends in a gate (${ungated.map((group) => group.name.toLowerCase()).join(", ")} has none)`
        : "Every segment ends in a gate",
      done: segments.length > 0 && ungated.length === 0,
      blocking: false,
      stepKeys: ungated.flatMap((group) => group.steps.map(({ step }) => step.key)).slice(0, 1),
    },
  ];
}

/** Gate number (1-based, in plan order) for each gate step key. */
export function gateNumbers(steps: BuilderStep[]): Map<string, number> {
  const map = new Map<string, number>();
  steps.filter((step) => step.isSegmentGate).forEach((step, index) => map.set(step.key, index + 1));
  return map;
}

export type GridBlock = { step: BuilderStep; index: number; startWeek: number; endWeek: number; row: number };

/**
 * Lays steps on the 13-week grid. A block spans from the week after the previous step's due week to
 * its own due week (gates always one week), then rows are packed so blocks never overlap.
 */
export function layoutGrid(steps: BuilderStep[]): { blocks: GridBlock[]; rows: number } {
  const rowsEnd: number[] = [];
  const blocks: GridBlock[] = [];
  let previousDue = 0;
  steps.forEach((step, index) => {
    const due = Math.min(PLAN_WEEKS, weekOf(step.dueOffsetDays));
    const start = step.isSegmentGate ? due : Math.min(due, Math.max(1, previousDue + 1));
    previousDue = Math.max(previousDue, due);
    let row = rowsEnd.findIndex((end) => end < start);
    if (row === -1) {
      row = rowsEnd.length;
      rowsEnd.push(due);
    } else {
      rowsEnd[row] = due;
    }
    blocks.push({ step, index, startWeek: start, endWeek: due, row });
  });
  return { blocks, rows: Math.max(1, rowsEnd.length) };
}

/** First row where a block spanning [start, end] fits. */
export function freeRowFor(blocks: GridBlock[], start: number, end: number): number {
  for (let row = 0; ; row += 1) {
    const clash = blocks.some((block) => block.row === row && block.startWeek <= end && block.endWeek >= start);
    if (!clash) return row;
  }
}

/** Minutes per week, attributed to each step's due week. `null` when no step that week has an estimate. */
export function minutesPerWeek(
  steps: BuilderStep[],
  minutesFor: (step: BuilderStep) => number | null,
): (number | null)[] {
  const weeks: (number | null)[] = Array.from({ length: PLAN_WEEKS }, () => null);
  for (const step of steps) {
    const minutes = minutesFor(step);
    if (minutes === null) continue;
    const week = Math.min(PLAN_WEEKS, weekOf(step.dueOffsetDays)) - 1;
    weeks[week] = (weeks[week] ?? 0) + minutes;
  }
  return weeks;
}

export function stepsEqual(a: BuilderStep[], b: BuilderStep[]): boolean {
  return JSON.stringify(builderStepsToPayload(a)) === JSON.stringify(builderStepsToPayload(b));
}
