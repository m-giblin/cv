"use client";

import { format, parseISO } from "date-fns";
import { GripVertical, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  builderStepsToPayload,
  dbStepToBuilder,
  emptyBuilderStep,
  type BuilderStep,
  type DbTemplateStep,
} from "@/lib/admin/plan-builder";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import {
  addDaysToIsoDate,
  sortPlanTemplates,
  templateDurationDays,
  templateDurationLabel,
} from "@/lib/plans/template-catalog";
import {
  canEditTemplateStructure,
  isLockedTemplate,
  stepTypePills,
} from "@/lib/plans/template-lock";
import type { PlanStepType, Profile, ProfileRole, UserPlan } from "@/lib/types";
import { Tag } from "@/components/ui/tag";
import { Chip } from "@/components/ui/chip";
import { cn, initials } from "@/lib/utils";

type TemplateStep = DbTemplateStep;

type PlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_locked?: boolean;
  steps: TemplateStep[];
};

type PreviewStep = {
  /** Full builder step so a PATCH never drops description, links or builder metadata. */
  source?: BuilderStep;
  id: string;
  title: string;
  stepType: PlanStepType;
  dueOffset: number;
  segment: string | null;
  isGate: boolean;
};

type PendingAssignment = {
  planId: string;
  planName: string;
  userId: string;
  personName: string;
  existingPlanCount: number;
};

type PlanTab = "all" | "locked" | "custom";
type EmpFilter = "all" | "new" | "existing" | "unassigned";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function roleBadge(profile: Profile): { label: string; tone: "blue" | "neutral" } {
  if (profile.role === "basic_se") return { label: "SE-I", tone: "blue" };
  if (profile.role === "senior_se") return { label: "Senior SE", tone: "neutral" };
  if (profile.role === "advisory_solutions_consultant") return { label: "ASC", tone: "neutral" };
  return { label: profile.level, tone: "neutral" };
}

/** Text glyph per step type (no emoji); the label carries the meaning. */
const STEP_TYPE_GLYPH: Record<string, string> = {
  content_review: "•",
  challenge: "▲",
  simulation: "◆",
  deal_prep: "■",
  mentor_review: "✓",
  shadow_meeting_log: "○",
  custom: "+",
};

function stepTypeGlyph(type: string) {
  return STEP_TYPE_GLYPH[type] ?? STEP_TYPE_GLYPH.custom;
}

function isNewHire(profile: Profile) {
  return profile.role === "basic_se" && profile.level === "Basic";
}

function profileMeta(profile: Profile) {
  if (isNewHire(profile)) {
    const start = format(parseISO(profile.createdAt), "MMM d");
    return `Start ${start}`;
  }
  const years = Math.max(1, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000)));
  return `${profile.level} · ${years}y`;
}

function stepsToPreview(steps: TemplateStep[]): PreviewStep[] {
  return [...steps]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step) => {
      const meta = parsePlanStepMetadata(step.metadata, step.sort_order);
      return {
        source: dbStepToBuilder(step),
        id: step.id,
        title: step.title,
        stepType: step.step_type,
        dueOffset: meta.dueOffsetDays ?? step.sort_order * 7,
        segment: meta.segmentIndex ? `Seg ${meta.segmentIndex}` : null,
        isGate: meta.isSegmentGate ?? false,
      };
    });
}

function previewToPayload(steps: PreviewStep[]) {
  return builderStepsToPayload(
    steps.map((step) => ({
      ...(step.source ?? emptyBuilderStep({ criteria: [] })),
      id: step.id.startsWith("new-") ? undefined : step.id,
      title: step.title,
      stepType: step.stepType,
      dueOffsetDays: step.dueOffset,
      segmentIndex: step.segment ? Number.parseInt(step.segment.replace(/\D/g, ""), 10) : null,
      isSegmentGate: step.isGate,
    })),
  );
}

export function AssignPlansWorkspace({
  assignees,
  mentors,
  plans,
  viewerRole = "manager",
}: {
  assignees: Profile[];
  mentors: Profile[];
  plans: UserPlan[];
  viewerRole?: ProfileRole;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planTab, setPlanTab] = useState<PlanTab>("all");
  const [empFilter, setEmpFilter] = useState<EmpFilter>("all");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [dragPlanId, setDragPlanId] = useState<string | null>(null);
  const [previewSteps, setPreviewSteps] = useState<PreviewStep[]>([]);
  const [stepDragSrc, setStepDragSrc] = useState<number | null>(null);
  const [stepDropIndicator, setStepDropIndicator] = useState<{ index: number; position: "above" | "below" } | null>(
    null,
  );
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
  const [assignStartDate, setAssignStartDate] = useState(todayIso());
  const [assignMentorId, setAssignMentorId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSavingSteps, setIsSavingSteps] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState(todayIso());
  const [localPlans, setLocalPlans] = useState(plans);

  useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/plans/templates");
    if (!response.ok) {
      toast.error("Failed to load plan templates.");
      setIsLoading(false);
      return;
    }
    const body = (await response.json()) as { templates: PlanTemplate[] };
    const sorted = sortPlanTemplates(body.templates ?? []);
    setTemplates(sorted);
    setSelectedPlanId((current) => {
      if (current && sorted.some((template) => template.id === current)) return current;
      return sorted[0]?.id ?? null;
    });
    setPreviewSteps((current) => {
      if (current.length > 0) return current;
      return sorted[0] ? stepsToPreview(sorted[0].steps) : [];
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedPlanId);
    if (template) {
      setPreviewSteps(stepsToPreview(template.steps));
    }
  }, [selectedPlanId, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedPlanId) ?? null,
    [templates, selectedPlanId],
  );

  const selectedLocked = selectedTemplate ? isLockedTemplate(selectedTemplate) : false;
  const canEditStructure = selectedTemplate
    ? canEditTemplateStructure(viewerRole, isLockedTemplate(selectedTemplate))
    : false;

  const plansByUser = useMemo(() => {
    const map = new Map<string, UserPlan[]>();
    for (const plan of localPlans) {
      if (plan.status === "completed") continue;
      const existing = map.get(plan.userId) ?? [];
      existing.push(plan);
      map.set(plan.userId, existing);
    }
    for (const [userId, userPlans] of map) {
      userPlans.sort((a, b) => a.startDate.localeCompare(b.startDate));
      map.set(userId, userPlans);
    }
    return map;
  }, [localPlans]);

  function userAlreadyHasTemplate(userId: string, planId: string) {
    const userPlans = plansByUser.get(userId) ?? [];
    return userPlans.some((plan) => plan.planTemplateId === planId);
  }

  const usageByTemplateName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plan of plans) {
      if (plan.status === "completed") continue;
      counts.set(plan.name, (counts.get(plan.name) ?? 0) + 1);
    }
    return counts;
  }, [plans]);

  const visiblePlans = useMemo(() => {
    return templates.filter((template) => {
      const locked = isLockedTemplate(template);
      if (planTab === "locked") return locked;
      if (planTab === "custom") return !locked;
      return true;
    });
  }, [templates, planTab]);

  const roster = useMemo(() => {
    const seAssignees = assignees.filter((profile) =>
      ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(profile.role),
    );

    return seAssignees.filter((profile) => {
      const hasPlan = (plansByUser.get(profile.id)?.length ?? 0) > 0;
      if (empFilter === "new") return isNewHire(profile);
      if (empFilter === "existing") return !isNewHire(profile);
      if (empFilter === "unassigned") return !hasPlan;
      return true;
    });
  }, [assignees, plansByUser, empFilter]);

  const newHireEmps = roster.filter((profile) => isNewHire(profile));
  const existingEmps = roster.filter((profile) => !isNewHire(profile));

  function selectPlan(template: PlanTemplate) {
    setSelectedPlanId(template.id);
    setPreviewSteps(stepsToPreview(template.steps));
  }

  async function saveTemplateSteps(nextSteps: PreviewStep[], template: PlanTemplate) {
    setIsSavingSteps(true);
    const response = await fetch(`/api/plans/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        description: template.description ?? "",
        steps: previewToPayload(nextSteps),
      }),
    });
    setIsSavingSteps(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not save step order.");
      return false;
    }

    void loadTemplates();
    return true;
  }

  async function handleStepReorder(targetIndex: number) {
    if (stepDragSrc === null || !selectedTemplate || stepDragSrc === targetIndex) return;
    const next = [...previewSteps];
    const [moved] = next.splice(stepDragSrc, 1);
    next.splice(targetIndex, 0, moved!);
    setPreviewSteps(next);
    setStepDragSrc(null);
    setStepDropIndicator(null);
    await saveTemplateSteps(next, selectedTemplate);
  }

  async function handleDeleteStep(index: number) {
    if (!selectedTemplate || selectedLocked) return;
    const next = previewSteps.filter((_, i) => i !== index);
    setPreviewSteps(next);
    await saveTemplateSteps(next, selectedTemplate);
  }

  async function handleAddStep() {
    if (!selectedTemplate || selectedLocked) return;
    const next = [
      ...previewSteps,
      {
        id: `new-${Date.now()}`,
        title: "Custom step",
        stepType: "custom" as PlanStepType,
        dueOffset: (previewSteps.length + 1) * 7,
        segment: null,
        isGate: false,
      },
    ];
    setPreviewSteps(next);
    await saveTemplateSteps(next, selectedTemplate);
  }

  async function handleNewCustomPlan() {
    const response = await fetch("/api/plans/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Custom plan — ${format(new Date(), "MMM d")}`,
        description: "Manager-created onboarding track",
        steps: [
          {
            title: "Orientation checkpoint",
            stepType: "content_review",
            dueOffsetDays: 7,
          },
        ],
      }),
    });

    if (!response.ok) {
      toast.error("Could not create custom plan.");
      return;
    }

    const body = (await response.json()) as { id: string };
    toast.success("Custom plan created.");
    setPlanTab("custom");
    await loadTemplates();
    setSelectedPlanId(body.id);
  }

  async function confirmAssignment() {
    if (!pendingAssignment) return;

    const templateToAssign = templates.find((template) => template.id === pendingAssignment.planId);
    if (!templateToAssign) {
      toast.error("Plan template not found. Refresh and try again.");
      return;
    }

    if (userAlreadyHasTemplate(pendingAssignment.userId, pendingAssignment.planId)) {
      toast.error(`${pendingAssignment.planName} is already assigned to ${pendingAssignment.personName}.`);
      return;
    }

    setIsAssigning(true);

    const durationDays = templateDurationDays(templateToAssign.steps);
    const targetCompletion = addDaysToIsoDate(assignStartDate, durationDays);

    const response = await fetch("/api/plans/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: pendingAssignment.planId,
        userId: pendingAssignment.userId,
        mentorId: assignMentorId || null,
        startDate: assignStartDate,
        targetCompletion,
      }),
    });
    setIsAssigning(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not assign plan.");
      return;
    }

    const body = (await response.json()) as { id: string };
    setLocalPlans((prev) => [
      ...prev.filter(
        (plan) => !(plan.userId === pendingAssignment.userId && plan.planTemplateId === pendingAssignment.planId),
      ),
      {
        id: body.id,
        planTemplateId: pendingAssignment.planId,
        userId: pendingAssignment.userId,
        mentorId: assignMentorId || null,
        name: templateToAssign.name,
        startDate: assignStartDate,
        targetCompletion,
        status: "not_started",
        progress: 0,
        steps: templateToAssign.steps.map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description ?? "",
          type: step.step_type,
          order: step.sort_order,
          status: "not_started" as const,
        })),
      },
    ]);

    toast.success(`${pendingAssignment.planName} assigned to ${pendingAssignment.personName}.`);
    setPendingAssignment(null);
    setAssignMentorId("");
    setAssignStartDate(todayIso());
    router.refresh();
  }

  async function removeAssignment(assignment: UserPlan, personName: string) {
    if (!window.confirm(`Remove ${assignment.name} from ${personName}?`)) return;
    const response = await fetch(`/api/plans/assignments/${assignment.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not remove assignment.");
      return;
    }
    setLocalPlans((prev) => prev.filter((plan) => plan.id !== assignment.id));
    toast.success("Assignment removed.");
    router.refresh();
  }

  async function saveEditedDates(assignment: UserPlan) {
    const response = await fetch(`/api/plans/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: editStartDate }),
    });
    if (!response.ok) {
      toast.error("Could not update start date.");
      return;
    }
    toast.success("Start date updated.");
    setEditingAssignmentId(null);
    router.refresh();
  }


  function renderEmployeeCard(profile: Profile) {
    const userPlans = plansByUser.get(profile.id) ?? [];
    const badge = roleBadge(profile);
    const isDragOver = dragOverUserId === profile.id;
    const hasPlans = userPlans.length > 0;
    const dropLabel = isDragOver
      ? hasPlans
        ? "Release to add plan"
        : "Release to assign"
      : hasPlans
        ? "Drop to add another plan"
        : "Drop plan here";

    return (
      <div
        className={cn(
          "emp-card rounded-[14px] border bg-white transition-colors",
          hasPlans ? "border-line-strong" : "border-line",
          isDragOver && "border-ink bg-signal-soft",
        )}
        key={profile.id}
        onDragLeave={(event) => {
          const related = event.relatedTarget as Node | null;
          if (related && event.currentTarget.contains(related)) return;
          setDragOverUserId(null);
        }}
        onDragOver={(event) => {
          const hasPlanDrag =
            Boolean(dragPlanId) ||
            event.dataTransfer.types.includes("application/x-plan-id") ||
            event.dataTransfer.types.includes("text/plain");
          if (!hasPlanDrag) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragOverUserId(profile.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOverUserId(null);
          const planId =
            event.dataTransfer.getData("application/x-plan-id") ||
            dragPlanId ||
            selectedPlanId;
          if (!planId) return;
          const plan = templates.find((item) => item.id === planId);
          if (!plan) return;
          if (userAlreadyHasTemplate(profile.id, plan.id)) {
            toast.error(`${plan.name} is already assigned to ${profile.fullName}.`);
            return;
          }
          setPendingAssignment({
            planId: plan.id,
            planName: plan.name,
            userId: profile.id,
            personName: profile.fullName,
            existingPlanCount: userPlans.length,
          });
          selectPlan(plan);
        }}
      >
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft font-mono text-xs font-semibold text-blue">
              {initials(profile.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{profile.fullName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Tag tone={badge.tone}>{badge.label}</Tag>
                <span className="font-mono text-xs text-muted">{profileMeta(profile)}</span>
              </div>
            </div>
            {hasPlans ? (
              <Tag className="shrink-0" tone="success">
                ✓ {userPlans.length} plan{userPlans.length === 1 ? "" : "s"}
              </Tag>
            ) : null}
          </div>

          {hasPlans ? (
            <div className="space-y-2">
              {userPlans.map((assignment) => (
                <div key={assignment.id}>
                  <div className="mb-1.5 rounded-[10px] border border-line bg-surface-2 px-2.5 py-2">
                    <p className="text-xs font-semibold text-ink">{assignment.name}</p>
                    <p className="font-mono text-xs text-muted">
                      Start {format(parseISO(assignment.startDate), "MMM d")} · {assignment.steps.length} steps
                    </p>
                  </div>
                  {editingAssignmentId === assignment.id ? (
                    <div className="mt-1.5 flex gap-1.5">
                      <input
                        aria-label={`New start date for ${assignment.name}`}
                        className="min-w-0 flex-1 rounded-[10px] border border-line-strong bg-white px-2 py-1 text-xs text-ink"
                        onChange={(event) => setEditStartDate(event.target.value)}
                        type="date"
                        value={editStartDate}
                      />
                      <button
                        className="rounded-full bg-blue px-3 py-1 text-xs font-semibold text-white hover:bg-blue-2"
                        onClick={() => void saveEditedDates(assignment)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-full border-[1.5px] border-ink bg-white px-3 py-1 text-xs font-semibold text-ink hover:bg-blue-soft"
                        onClick={() => setEditingAssignmentId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        className="flex-1 rounded-full border-[1.5px] border-ink bg-white py-1 text-xs font-semibold text-ink hover:bg-blue-soft"
                        onClick={() => {
                          setEditingAssignmentId(assignment.id);
                          setEditStartDate(assignment.startDate);
                        }}
                        type="button"
                      >
                        Edit dates
                      </button>
                      <button
                        className="shrink-0 rounded-full border-[1.5px] border-danger bg-danger-soft px-3 py-1 text-xs font-semibold text-danger"
                        onClick={() => void removeAssignment(assignment, profile.fullName)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div
            className={cn(
              "flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed px-2.5 py-2 transition-colors",
              hasPlans && "mt-2",
              isDragOver ? "border-ink bg-signal-soft text-ink" : "border-dash text-muted",
            )}
          >
            <svg aria-hidden fill="none" height="12" stroke="currentColor" strokeWidth="1.3" viewBox="0 0 14 14" width="12">
              <path d="M7 2v7M4 6l3 4 3-4" strokeLinecap="round" />
              <path d="M2 11h10" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-xs">{dropLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue" />
      </div>
    );
  }

  const confirmAssignmentPanel = pendingAssignment ? (
    <div className="animate-[dropIn_0.15s_ease-out] rounded-[18px] bg-ink p-4 text-white">
      <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-[0.03em] text-on-blue-muted">
        Confirm assignment
      </p>
      <p className="text-[15px] font-semibold leading-snug">
        Assign <span className="text-signal">{pendingAssignment.planName}</span> to{" "}
        <span className="text-signal">{pendingAssignment.personName}</span>.
      </p>
      {pendingAssignment.existingPlanCount > 0 ? (
        <p className="mt-1.5 text-xs leading-snug text-on-blue">
          Adds to {pendingAssignment.existingPlanCount} existing plan
          {pendingAssignment.existingPlanCount === 1 ? "" : "s"} — stagger the start date to lay out their calendar.
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-[0.03em] text-on-blue-muted">
            Start date
          </span>
          <input
            className="w-full rounded-[10px] border border-badge-line bg-white px-2 py-1.5 text-xs text-ink"
            onChange={(event) => setAssignStartDate(event.target.value)}
            type="date"
            value={assignStartDate}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-[0.03em] text-on-blue-muted">
            Mentor
          </span>
          <select
            className="w-full rounded-[10px] border border-badge-line bg-white px-2 py-1.5 text-xs text-ink"
            onChange={(event) => setAssignMentorId(event.target.value)}
            value={assignMentorId}
          >
            <option value="">No mentor</option>
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5"
          disabled={isAssigning}
          onClick={() => void confirmAssignment()}
          type="button"
        >
          {isAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Confirm & assign →
        </button>
        <button
          className="rounded-full border-[1.5px] border-on-blue-muted px-4 py-2 text-sm font-semibold text-white hover:bg-badge-line"
          onClick={() => setPendingAssignment(null)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  const currentStage = pendingAssignment ? 3 : dragPlanId ? 2 : 1;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-bg">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-3">
        <ol className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {[
            { n: 1, label: "Drag a plan from the left" },
            { n: 2, label: "Drop it on an employee" },
            { n: 3, label: "Confirm start date & mentor, then assign" },
          ].map((step) => {
            const done = step.n < currentStage;
            const current = step.n === currentStage;
            return (
              <li
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex min-w-[180px] flex-1 items-center gap-2 rounded-[10px] px-3 py-2 text-sm",
                  done && "bg-blue text-white",
                  current && "border-[1.5px] border-ink bg-signal font-semibold text-ink",
                  !done && !current && "border-[1.5px] border-dashed border-dash text-ink-2",
                )}
                key={step.n}
              >
                <span className="font-mono text-xs font-medium">{done ? "✓" : `0${step.n}`}</span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted" />
          <span className="font-mono text-xs text-muted">Locked plans — step delete requires Admin</span>
        </div>
      </div>

      <div className="relative grid h-[min(720px,calc(100vh-10rem))] min-h-[640px] grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr_300px]">
        {confirmAssignmentPanel ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
            aria-hidden={!pendingAssignment}
          >
            <div className="pointer-events-auto absolute right-3 top-3 w-[min(300px,calc(100%-1.5rem))]">
              {confirmAssignmentPanel}
            </div>
          </div>
        ) : null}

        {confirmAssignmentPanel ? (
          <div className="border-b border-line bg-white p-3 lg:hidden">{confirmAssignmentPanel}</div>
        ) : null}
        {/* Col 1 — Plan library */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-surface-2 lg:border-r">
          <div className="border-b border-line px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-ink">Plan library</h2>
                <p className="text-xs text-muted">Drag a plan onto an employee →</p>
              </div>
              <button
                className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink bg-white px-3 py-1 text-xs font-semibold text-ink hover:bg-blue-soft"
                onClick={() => void handleNewCustomPlan()}
                type="button"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "locked", "custom"] as PlanTab[]).map((tab) => (
                <Chip active={planTab === tab} className="px-3 py-1" key={tab} onClick={() => setPlanTab(tab)}>
                  {tab}
                </Chip>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
            {visiblePlans.map((template) => {
              const locked = isLockedTemplate(template);
              const usedBy = usageByTemplateName.get(template.name) ?? 0;
              const duration = templateDurationLabel(templateDurationDays(template.steps));
              const isSelected = template.id === selectedPlanId;
              const isDragging = dragPlanId === template.id;

              return (
                <div
                  className={cn(
                    "plan-card cursor-grab overflow-hidden rounded-[14px] border transition-colors active:cursor-grabbing",
                    isSelected ? "border-[1.5px] border-ink bg-signal-soft" : "border-line bg-white hover:border-line-strong",
                    isDragging && "border-dashed border-blue opacity-35",
                  )}
                  draggable
                  key={template.id}
                  onClick={() => selectPlan(template)}
                  onDragEnd={(event) => {
                    event.currentTarget.classList.remove("dragging");
                    setDragPlanId(null);
                  }}
                  onDragStart={(event) => {
                    setDragPlanId(template.id);
                    selectPlan(template);
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("application/x-plan-id", template.id);
                    event.dataTransfer.setData("text/plain", template.id);
                  }}
                >
                  <div className="p-3">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-tight text-ink">{template.name}</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted">{template.description}</p>
                      </div>
                      {locked ? (
                        <Tag className="shrink-0" tone="warning">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Tag>
                      ) : (
                        <Tag className="shrink-0" tone="blue">
                          Custom
                        </Tag>
                      )}
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {stepTypePills(template.steps).map((pill) => (
                        <span
                          className="rounded-[6px] bg-surface-2 px-1.5 font-mono text-xs text-ink-2"
                          key={pill.label}
                        >
                          {pill.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                      <span>{template.steps.length} steps</span>
                      <span aria-hidden>·</span>
                      <span>{duration}</span>
                      <span aria-hidden>·</span>
                      <span className={usedBy > 0 ? "text-success" : undefined}>
                        {usedBy > 0 ? `● Used by ${usedBy}` : "○ Unused"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-divider px-3 py-1.5">
                    <GripVertical className="h-3 w-3 text-faint" />
                    <span className="font-mono text-xs uppercase tracking-[0.03em] text-muted">Drag to assign</span>
                    <button
                      className="ml-auto font-mono text-xs font-medium uppercase tracking-[0.03em] text-blue hover:text-ink"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPlan(template);
                      }}
                      type="button"
                    >
                      View steps
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2 — Employee roster */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-3">
            <div>
              <h2 className="text-base font-extrabold text-ink">My team</h2>
              <p className="text-xs text-muted">Drop a plan onto any employee to assign it</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "new", label: "New hires" },
                  { id: "existing", label: "Existing" },
                  { id: "unassigned", label: "Unassigned" },
                ] as { id: EmpFilter; label: string }[]
              ).map((filter) => (
                <Chip
                  active={empFilter === filter.id}
                  className="px-3 py-1"
                  key={filter.id}
                  onClick={() => setEmpFilter(filter.id)}
                >
                  {filter.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {(empFilter === "all" || empFilter === "new") && newHireEmps.length > 0 ? (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="label-mono">New hires</span>
                  <div className="h-px flex-1 bg-line" />
                  <span className="font-mono text-xs text-warning">▲ Needs plan</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{newHireEmps.map(renderEmployeeCard)}</div>
              </div>
            ) : null}

            {(empFilter === "all" || empFilter === "existing") && existingEmps.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="label-mono">Existing team</span>
                  <div className="h-px flex-1 bg-line" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{existingEmps.map(renderEmployeeCard)}</div>
              </div>
            ) : null}

            {roster.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No team members match this filter.</p>
            ) : null}
          </div>
        </div>

        {/* Col 3 — Preview + confirm */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-surface-2 lg:border-l">
          <div className="border-b border-line px-3.5 py-3">
            <h2 className="text-base font-extrabold text-ink">{selectedTemplate?.name ?? "Select a plan"}</h2>
            <p className="text-xs text-muted">
              {selectedTemplate
                ? `${previewSteps.length} steps · ${templateDurationLabel(templateDurationDays(selectedTemplate.steps))}${
                    selectedLocked ? " · Locked — reorder only" : " · Custom — full edit"
                  }`
                : "Click or drag a plan from the left"}
            </p>
            {isSavingSteps ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-blue">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving steps…
              </p>
            ) : null}
          </div>

          {selectedLocked ? (
            <div className="mx-2 mt-2 shrink-0 rounded-[14px] border border-warning bg-warning-soft px-3 py-2">
              <p className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.03em] text-warning">
                <Lock className="h-3 w-3" />
                Manager-locked plan
              </p>
              <p className="mt-1 text-xs leading-snug text-ink-2">
                You can reorder steps but cannot add or delete them. Contact an Admin to modify structure.
              </p>
            </div>
          ) : null}

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {previewSteps.map((step, index) => {
              const indicatorAbove =
                stepDropIndicator?.index === index && stepDropIndicator.position === "above";
              const indicatorBelow =
                stepDropIndicator?.index === index && stepDropIndicator.position === "below";

              return (
                <div
                  className={cn(
                    "relative mb-1 flex overflow-hidden rounded-[10px] border border-line bg-white",
                    indicatorAbove &&
                      "before:absolute before:left-0 before:right-0 before:top-0 before:z-10 before:h-0.5 before:bg-blue before:content-['']",
                    indicatorBelow &&
                      "after:absolute after:bottom-0 after:left-0 after:right-0 after:z-10 after:h-0.5 after:bg-blue after:content-['']",
                  )}
                  draggable
                  key={step.id}
                  onDragEnd={() => {
                    setStepDragSrc(null);
                    setStepDropIndicator(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (stepDragSrc === null) return;
                    setStepDropIndicator({
                      index,
                      position: index < stepDragSrc ? "above" : "below",
                    });
                  }}
                  onDragStart={() => setStepDragSrc(index)}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleStepReorder(index);
                  }}
                >
                  <div className="flex w-6 shrink-0 cursor-grab items-center justify-center border-r border-divider bg-surface-2">
                    <GripVertical className="h-3 w-3 text-faint" />
                  </div>
                  <div className="flex w-7 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-divider">
                    <span className="font-mono text-xs text-muted">{index + 1}</span>
                    {step.isGate ? (
                      <span className="h-2 w-2 rotate-45 bg-blue" title="Segment gate">
                        <span className="sr-only">Segment gate</span>
                      </span>
                    ) : null}
                  </div>
                  <div
                    aria-hidden
                    className="flex w-8 shrink-0 items-center justify-center border-r border-divider bg-blue-soft font-mono text-xs text-blue"
                  >
                    {stepTypeGlyph(step.stepType)}
                  </div>
                  <div className="min-w-0 flex-1 px-2.5 py-1.5">
                    <p className="truncate text-xs font-semibold text-ink">{step.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted">+{step.dueOffset}d</span>
                      {step.segment ? (
                        <span className="rounded-[6px] bg-blue-soft px-1 font-mono text-xs uppercase text-blue">
                          {step.segment}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center px-2">
                    {canEditStructure ? (
                      <button
                        aria-label={`Delete step ${step.title}`}
                        className="text-faint transition-colors hover:text-danger"
                        onClick={() => void handleDeleteStep(index)}
                        title="Delete step"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span title="Admin only">
                        <Lock className="h-3.5 w-3.5 text-faint" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {canEditStructure ? (
              <button
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-full border-[1.5px] border-ink bg-white py-1.5 text-xs font-semibold text-ink hover:bg-blue-soft"
                onClick={() => void handleAddStep()}
                type="button"
              >
                <Plus className="h-3 w-3" />
                Add step
              </button>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-line bg-white p-2.5">
            {!pendingAssignment ? (
              <p className="py-2 text-center font-mono text-xs text-muted">
                Drop a plan onto an employee to assign it
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
