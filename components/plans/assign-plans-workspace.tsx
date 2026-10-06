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
import { LinkButton, Notice, SecondaryButton, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { Chip } from "@/components/ui/chip";
import { StatusPill } from "@/components/ui/status-pill";
import { PersonCell } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { stepTypeStyle } from "@/lib/plans/plan-calendar-colors";
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

/** "Thu, Oct 9" (year only when it is not the current year). */
function shortDate(iso: string) {
  const date = parseISO(iso);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
}

function roleBadge(profile: Profile): { label: string; tone: "blue" | "neutral" } {
  if (profile.role === "basic_se") return { label: "SE I", tone: "blue" };
  if (profile.role === "senior_se") return { label: "Senior SE", tone: "neutral" };
  if (profile.role === "advisory_solutions_consultant") return { label: "ASC", tone: "neutral" };
  return { label: profile.level, tone: "neutral" };
}

function isNewHire(profile: Profile) {
  return profile.role === "basic_se" && profile.level === "Basic";
}

function profileMeta(profile: Profile) {
  if (isNewHire(profile)) {
    return `Started ${shortDate(profile.createdAt)}`;
  }
  const years = Math.max(1, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000)));
  return `${profile.level}, ${years} ${years === 1 ? "year" : "years"}`;
}

/** "12 steps over 90 days" / "4 steps in week 1". */
function planLengthSentence(stepCount: number, durationLabel: string) {
  const steps = `${stepCount} ${stepCount === 1 ? "step" : "steps"}`;
  return durationLabel.endsWith("days") ? `${steps} over ${durationLabel}` : `${steps} in ${durationLabel.toLowerCase()}`;
}

function segmentLabel(segment: string) {
  return segment.replace(/^Seg\s*/i, "Segment ");
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

  const planTabCounts = useMemo(() => {
    const locked = templates.filter((template) => isLockedTemplate(template)).length;
    return { all: templates.length, locked, custom: templates.length - locked } satisfies Record<PlanTab, number>;
  }, [templates]);

  const empFilterCounts = useMemo(() => {
    const seAssignees = assignees.filter((profile) =>
      ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(profile.role),
    );
    return {
      all: seAssignees.length,
      new: seAssignees.filter((profile) => isNewHire(profile)).length,
      existing: seAssignees.filter((profile) => !isNewHire(profile)).length,
      unassigned: seAssignees.filter((profile) => (plansByUser.get(profile.id)?.length ?? 0) === 0).length,
    } satisfies Record<EmpFilter, number>;
  }, [assignees, plansByUser]);

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
        name: `Custom plan, ${format(new Date(), "MMM d")}`,
        description: "Onboarding track created by a manager",
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

  /** Shared by drop and the keyboard "Assign" link so assigning never depends on drag and drop. */
  function proposeAssignment(profile: Profile, plan: PlanTemplate) {
    if (userAlreadyHasTemplate(profile.id, plan.id)) {
      toast.error(`${plan.name} is already assigned to ${profile.fullName}.`);
      return;
    }
    setPendingAssignment({
      planId: plan.id,
      planName: plan.name,
      userId: profile.id,
      personName: profile.fullName,
      existingPlanCount: (plansByUser.get(profile.id) ?? []).length,
    });
    selectPlan(plan);
  }

  function renderEmployeeCard(profile: Profile) {
    const userPlans = plansByUser.get(profile.id) ?? [];
    const badge = roleBadge(profile);
    const isDragOver = dragOverUserId === profile.id;
    const hasPlans = userPlans.length > 0;
    const isPending = pendingAssignment?.userId === profile.id;
    const dropLabel = isDragOver
      ? hasPlans
        ? "Release to add this plan"
        : "Release to assign"
      : hasPlans
        ? "Drop a plan here to add another"
        : "Drop a plan here";

    return (
      <div
        className={cn(
          "emp-card rounded-[14px] border bg-white transition-colors",
          isDragOver
            ? "border-dashed border-signal bg-signal-soft"
            : isPending
              ? "border-blue bg-blue-soft"
              : "border-line",
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
          proposeAssignment(profile, plan);
        }}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <PersonCell initials={initials(profile.fullName)} name={profile.fullName} subline={profileMeta(profile)} />
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
              <Tag tone={badge.tone}>{badge.label}</Tag>
              {hasPlans ? (
                <StatusPill tone="success">
                  {userPlans.length} {userPlans.length === 1 ? "plan" : "plans"}
                </StatusPill>
              ) : null}
            </div>
          </div>

          {hasPlans ? (
            <ul className="flex flex-col gap-2">
              {userPlans.map((assignment) => (
                <li className="rounded-[10px] border border-line bg-bg px-3 py-2.5" key={assignment.id}>
                  <p className="text-sm font-bold text-ink">{assignment.name}</p>
                  <p className="text-[13px] text-muted">
                    Starts {shortDate(assignment.startDate)}. {assignment.steps.length}{" "}
                    {assignment.steps.length === 1 ? "step" : "steps"}.
                  </p>
                  {editingAssignmentId === assignment.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <TextInput
                        aria-label={`New start date for ${assignment.name}`}
                        className="w-auto min-w-0 flex-1 py-1.5 text-sm"
                        onChange={(event) => setEditStartDate(event.target.value)}
                        type="date"
                        value={editStartDate}
                      />
                      <SecondaryButton className="px-3.5 py-1.5 text-[13px]" onClick={() => void saveEditedDates(assignment)}>
                        Save
                      </SecondaryButton>
                      <LinkButton className="text-[13px]" onClick={() => setEditingAssignmentId(null)}>
                        Cancel
                      </LinkButton>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <LinkButton
                        className="text-[13px]"
                        onClick={() => {
                          setEditingAssignmentId(assignment.id);
                          setEditStartDate(assignment.startDate);
                        }}
                      >
                        Edit start date
                      </LinkButton>
                      <LinkButton
                        className="text-[13px]"
                        onClick={() => void removeAssignment(assignment, profile.fullName)}
                        tone="danger"
                      >
                        Remove
                      </LinkButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed px-3 py-2.5 transition-colors",
              isDragOver ? "border-signal bg-signal-soft text-ink" : "border-line-strong text-muted",
            )}
          >
            <span className="text-[13px]">{dropLabel}</span>
            {selectedTemplate ? (
              <LinkButton
                aria-label={`Assign ${selectedTemplate.name} to ${profile.fullName}`}
                className="text-[13px]"
                onClick={() => proposeAssignment(profile, selectedTemplate)}
              >
                Assign selected plan
              </LinkButton>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div aria-busy="true" className="flex min-h-[480px] items-center justify-center" role="status">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-blue" />
        <span className="sr-only">Loading plans</span>
      </div>
    );
  }

  const confirmAssignmentPanel = pendingAssignment ? (
    <div className="on-navy animate-[dropIn_0.15s_ease-out] rounded-[16px] bg-navy p-[22px] text-on-navy">
      <p className="label-caps mb-2 text-on-navy-muted">Confirm assignment</p>
      <p className="text-[17px] leading-snug font-bold text-white">
        Assign <span className="text-signal">{pendingAssignment.planName}</span> to{" "}
        <span className="text-signal">{pendingAssignment.personName}</span>, starting{" "}
        <span className="text-signal">{shortDate(assignStartDate)}</span>.
      </p>
      {pendingAssignment.existingPlanCount > 0 ? (
        <p className="mt-2 text-sm leading-snug text-on-navy-muted">
          This adds to {pendingAssignment.existingPlanCount} existing{" "}
          {pendingAssignment.existingPlanCount === 1 ? "plan" : "plans"}. Stagger the start date to spread out their
          calendar.
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <label className="flex flex-col gap-1.5" htmlFor="assign-start-date">
          <span className="text-sm font-bold text-white">Start date</span>
          <TextInput
            className="py-2 text-sm"
            id="assign-start-date"
            onChange={(event) => setAssignStartDate(event.target.value)}
            type="date"
            value={assignStartDate}
          />
        </label>
        <label className="flex flex-col gap-1.5" htmlFor="assign-mentor">
          <span className="text-sm font-bold text-white">Mentor</span>
          <SelectInput
            className="py-2 text-sm"
            id="assign-mentor"
            onChange={(event) => setAssignMentorId(event.target.value)}
            value={assignMentorId}
          >
            <option value="">No mentor</option>
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.fullName}
              </option>
            ))}
          </SelectInput>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="btn-primary inline-flex items-center justify-center gap-1.5"
          disabled={isAssigning}
          onClick={() => void confirmAssignment()}
          type="button"
        >
          {isAssigning ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Assign plan
        </button>
        <button className="link text-sm" onClick={() => setPendingAssignment(null)} type="button">
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  const currentStage = pendingAssignment ? 3 : dragPlanId ? 2 : 1;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-bg">
      {/* Stepper */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line bg-white px-5 py-4">
        <ol aria-label="Assign a plan in three steps" className="grid min-w-0 flex-1 grid-cols-3 gap-3">
          {[
            { n: 1, label: "Plan", hint: "Pick a plan on the left" },
            { n: 2, label: "People", hint: "Drop it on a person, or use Assign" },
            { n: 3, label: "When", hint: "Set the start date and mentor" },
          ].map((step) => {
            const done = step.n < currentStage;
            const current = step.n === currentStage;
            return (
              <li aria-current={current ? "step" : undefined} className="flex min-w-0 flex-col gap-2" key={step.n}>
                <span
                  aria-hidden
                  className={cn(
                    "h-2 rounded-[2px]",
                    done ? "bg-blue" : current ? "bg-signal shadow-[0_0_0_2px_var(--color-ink)]" : "bg-track",
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className={cn("text-sm", current ? "font-bold text-ink" : "font-semibold text-ink-2")}>
                    {step.label}
                    {done ? <span className="sr-only"> (done)</span> : null}
                  </span>
                  <span className="truncate text-[13px] text-muted">{step.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Lock aria-hidden className="h-3.5 w-3.5" />
          Only an admin can delete steps from a locked plan.
        </p>
      </div>

      <div className="relative grid h-[min(720px,calc(100vh-10rem))] min-h-[640px] grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr_320px]">
        {confirmAssignmentPanel ? (
          <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
            <div className="pointer-events-auto absolute top-3 right-3 w-[min(320px,calc(100%-1.5rem))]">
              {confirmAssignmentPanel}
            </div>
          </div>
        ) : null}

        {confirmAssignmentPanel ? (
          <div className="border-b border-line bg-white p-3 lg:hidden">{confirmAssignmentPanel}</div>
        ) : null}
        {/* Column 1: plan library */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-white lg:border-r">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Plan library</h2>
                <p className="text-[13px] text-muted">Drag a plan onto a person.</p>
              </div>
              <SecondaryButton className="px-3.5 py-1.5 text-[13px]" onClick={() => void handleNewCustomPlan()}>
                <Plus aria-hidden className="h-3.5 w-3.5" />
                New plan
              </SecondaryButton>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "locked", label: "Locked" },
                  { id: "custom", label: "Custom" },
                ] as { id: PlanTab; label: string }[]
              ).map((tab) => (
                <Chip
                  active={planTab === tab.id}
                  className="px-3 py-1"
                  count={planTabCounts[tab.id]}
                  key={tab.id}
                  onClick={() => setPlanTab(tab.id)}
                >
                  {tab.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-bg p-3">
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
                    isSelected ? "border-blue bg-blue-soft" : "border-line bg-white hover:border-line-strong",
                    isDragging && "border-dashed border-blue opacity-50",
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
                  <div className="flex flex-col gap-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-tight font-bold text-ink">{template.name}</p>
                        {template.description ? (
                          <p className="mt-1 text-[13px] leading-snug text-muted">{template.description}</p>
                        ) : null}
                      </div>
                      {locked ? (
                        <Tag className="shrink-0" tone="warning">
                          <Lock aria-hidden className="h-3 w-3" />
                          Locked
                        </Tag>
                      ) : (
                        <Tag className="shrink-0" tone="blue">
                          Custom
                        </Tag>
                      )}
                    </div>
                    <ul aria-label="Step types" className="flex flex-wrap gap-1.5">
                      {stepTypePills(template.steps).map((pill) => (
                        <li key={pill.label}>
                          <Tag className="px-2.5 py-0.5" tone="neutral">
                            {pill.label}
                          </Tag>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-[13px] text-muted">
                        {planLengthSentence(template.steps.length, duration)}
                      </span>
                      <StatusPill tone={usedBy > 0 ? "success" : "neutral"}>
                        {usedBy > 0 ? `Used by ${usedBy}` : "Not in use"}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-divider px-3.5 py-2">
                    <GripVertical aria-hidden className="h-3.5 w-3.5 text-faint" />
                    <span className="text-[13px] text-muted">Drag to assign</span>
                    <button
                      aria-pressed={isSelected}
                      className="link ml-auto text-[13px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPlan(template);
                      }}
                      type="button"
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: team roster */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">My team</h2>
              <p className="text-[13px] text-muted">Drop a plan onto anyone to assign it.</p>
            </div>
            <div className="flex flex-wrap gap-2">
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
                  count={empFilterCounts[filter.id]}
                  key={filter.id}
                  onClick={() => setEmpFilter(filter.id)}
                >
                  {filter.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {(empFilter === "all" || empFilter === "new" || empFilter === "unassigned") && newHireEmps.length > 0 ? (
              <section aria-label="New hires" className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="label-caps">New hires</span>
                  <div aria-hidden className="h-px flex-1 bg-line" />
                  <StatusPill tone="warning">Needs a plan</StatusPill>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{newHireEmps.map(renderEmployeeCard)}</div>
              </section>
            ) : null}

            {(empFilter === "all" || empFilter === "existing" || empFilter === "unassigned") &&
            existingEmps.length > 0 ? (
              <section aria-label="Existing team">
                <div className="mb-3 flex items-center gap-3">
                  <span className="label-caps">Existing team</span>
                  <div aria-hidden className="h-px flex-1 bg-line" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{existingEmps.map(renderEmployeeCard)}</div>
              </section>
            ) : null}

            {roster.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No one on the team matches this filter.</p>
            ) : null}
          </div>
        </div>

        {/* Column 3: preview */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-white lg:border-l">
          <div className="flex flex-col gap-1 border-b border-line px-4 py-4">
            <span className="label-caps">Preview</span>
            <h2 className="text-lg leading-tight font-extrabold text-ink">{selectedTemplate?.name ?? "Pick a plan"}</h2>
            <p className="text-[13px] text-muted">
              {selectedTemplate
                ? `${planLengthSentence(
                    previewSteps.length,
                    templateDurationLabel(templateDurationDays(selectedTemplate.steps)),
                  )}. ${selectedLocked ? "Locked, so you can reorder steps only." : "Custom, so you can edit every step."}`
                : "Select or drag a plan from the library."}
            </p>
            {isSavingSteps ? (
              <span className="mt-1" role="status">
                <StatusPill tone="blue">Saving steps</StatusPill>
              </span>
            ) : null}
          </div>

          {selectedLocked ? (
            <Notice className="mx-3 mt-3 shrink-0 px-4 py-3">
              <p className="label-caps label-caps--blue mb-1">Locked plan</p>
              <p className="text-[13px] leading-snug text-ink-2">
                You can reorder steps but not add or delete them. Ask an admin to change the structure.
              </p>
            </Notice>
          ) : null}

          <ol aria-label="Plan steps" className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {previewSteps.map((step, index) => {
              const indicatorAbove =
                stepDropIndicator?.index === index && stepDropIndicator.position === "above";
              const indicatorBelow =
                stepDropIndicator?.index === index && stepDropIndicator.position === "below";
              const typeLabel = stepTypeStyle(step.stepType).label;
              const isDraggingStep = stepDragSrc === index;

              return (
                <li
                  className={cn(
                    "relative flex overflow-hidden rounded-[10px] border",
                    step.isGate ? "border-blue bg-blue-soft" : "border-line bg-white",
                    isDraggingStep && "shadow-[var(--shadow-drag)]",
                    indicatorAbove &&
                      "before:absolute before:top-0 before:right-0 before:left-0 before:z-10 before:h-0.5 before:bg-blue before:content-['']",
                    indicatorBelow &&
                      "after:absolute after:right-0 after:bottom-0 after:left-0 after:z-10 after:h-0.5 after:bg-blue after:content-['']",
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
                  <div aria-hidden className="flex w-6 shrink-0 cursor-grab items-center justify-center">
                    <GripVertical className="h-3.5 w-3.5 text-faint" />
                  </div>
                  <div className="num flex w-7 shrink-0 items-center justify-center text-[13px] font-semibold text-muted">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 py-2 pr-2 pl-1">
                    <p className="truncate text-sm font-bold text-ink">{step.title}</p>
                    <p className="truncate text-[13px] text-muted">
                      {typeLabel}. Due day {step.dueOffset}
                      {step.segment ? `, ${segmentLabel(step.segment).toLowerCase()}` : ""}.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pr-2.5">
                    {step.isGate ? (
                      <Tag className="px-2.5 py-0.5" tone="blue">
                        Gate
                      </Tag>
                    ) : null}
                    {canEditStructure ? (
                      <button
                        aria-label={`Delete step ${step.title}`}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                        onClick={() => void handleDeleteStep(index)}
                        title="Delete step"
                        type="button"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-muted" title="Only an admin can delete this step">
                        <Lock aria-hidden className="h-3.5 w-3.5" />
                        <span className="sr-only">Only an admin can delete this step</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {canEditStructure ? (
            <div className="shrink-0 px-3 pb-3">
              <SecondaryButton className="w-full justify-center" onClick={() => void handleAddStep()}>
                <Plus aria-hidden className="h-4 w-4" />
                Add step
              </SecondaryButton>
            </div>
          ) : null}

          {!pendingAssignment ? (
            <div className="shrink-0 border-t border-line px-4 py-3">
              <p className="text-center text-[13px] text-muted">Drop a plan onto a person to assign it.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
