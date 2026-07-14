"use client";

import { format, parseISO } from "date-fns";
import { GripVertical, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  stepTypeIcon,
  stepTypePills,
  templateAccentGradient,
} from "@/lib/plans/template-lock";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { PlanStepType, Profile, ProfileRole, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

type TemplateStep = {
  id: string;
  title: string;
  description: string | null;
  step_type: PlanStepType;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

type PlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_locked?: boolean;
  steps: TemplateStep[];
};

type PreviewStep = {
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

function roleBadge(profile: Profile) {
  if (profile.role === "basic_se") return { label: "SE-I", bg: "#EEF4FF", color: "#0057a8" };
  if (profile.role === "senior_se") return { label: "Senior SE", bg: "#EDE9FE", color: "#5b21b6" };
  if (profile.role === "advisory_solutions_consultant") {
    return { label: "ASC", bg: "#FDF0FA", color: "#A51E8E" };
  }
  return { label: profile.level, bg: "#F5F4F0", color: "#6B6860" };
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
  return steps.map((step) => ({
    id: step.id.startsWith("new-") ? undefined : step.id,
    title: step.title,
    stepType: step.stepType,
    dueOffsetDays: step.dueOffset,
    segmentIndex: step.segment ? Number.parseInt(step.segment.replace(/\D/g, ""), 10) : null,
    isSegmentGate: step.isGate,
  }));
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
        steps: templateToAssign.steps.map((step, index) => ({
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
    const dropBorderColor = isDragOver ? "#0071CE" : "#D4D1CB";
    const dropBg = isDragOver ? "#F0F7FF" : "transparent";
    const dropIconColor = isDragOver ? "#0071CE" : "#C4C1BB";
    const dropTextColor = isDragOver ? "#0071CE" : "#B0ADA8";
    const dropLabel = isDragOver
      ? userPlans.length > 0
        ? "Release to add plan"
        : "Release to assign"
      : userPlans.length > 0
        ? "Drop to add another plan"
        : "Drop plan here";

    return (
      <div
        className={`emp-card bg-white transition-colors ${
          userPlans.length > 0 ? "border-[#0A6E45] bg-[#EDFAF3]" : "border border-[#E2DFD9]"
        } ${isDragOver ? "!border-[#0071CE] !bg-[#F0F7FF]" : ""}`}
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
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white"
              style={{ background: avatarGradientForId(profile.id) }}
            >
              {initials(profile.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[#0D0E12]">{profile.fullName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="font-mono text-[8px] uppercase tracking-wide"
                  style={{ background: badge.bg, color: badge.color, padding: "2px 6px" }}
                >
                  {badge.label}
                </span>
                <span className="font-mono text-[8.5px] text-[#A09D98]">{profileMeta(profile)}</span>
              </div>
            </div>
            {userPlans.length > 0 ? (
              <div className="flex shrink-0 items-center gap-1 border border-[rgba(10,110,69,.15)] bg-[#EDFAF3] px-2 py-1">
                <span className="font-mono text-[8px] tracking-wide text-[#0A6E45]">
                  {userPlans.length} PLAN{userPlans.length === 1 ? "" : "S"}
                </span>
              </div>
            ) : null}
          </div>

          {userPlans.length > 0 ? (
            <div className="space-y-2">
              {userPlans.map((assignment) => (
                <div key={assignment.id}>
                  <div className="mb-1.5 border-l-[3px] border-[#0A6E45] bg-[#F0FDF7] px-2.5 py-2">
                    <p className="text-[11.5px] font-semibold text-[#0A6E45]">{assignment.name}</p>
                    <p className="font-mono text-[8.5px] text-[#A09D98]">
                      Start {format(parseISO(assignment.startDate), "MMM d")} · {assignment.steps.length} steps
                    </p>
                  </div>
                  {editingAssignmentId === assignment.id ? (
                    <div className="mt-1.5 flex gap-1.5">
                      <input
                        className="inp flex-1 border border-[#D4D1CB] bg-white px-2 py-1 text-[10.5px]"
                        onChange={(event) => setEditStartDate(event.target.value)}
                        type="date"
                        value={editStartDate}
                      />
                      <button
                        className="btn bn bxs px-2 py-1 text-[10px]"
                        onClick={() => void saveEditedDates(assignment)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="btn bo bxs px-2 py-1 text-[10px]"
                        onClick={() => setEditingAssignmentId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        className="btn bo bxs flex-1 justify-center py-1 text-[10px]"
                        onClick={() => {
                          setEditingAssignmentId(assignment.id);
                          setEditStartDate(assignment.startDate);
                        }}
                        type="button"
                      >
                        Edit dates
                      </button>
                      <button
                        className="btn bxs shrink-0 border border-[rgba(184,49,40,.15)] bg-[#FEF0EE] px-2 py-1 text-[10px] text-[#B83128]"
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
            className={`${userPlans.length > 0 ? "mt-2" : ""} flex items-center gap-2 border border-dashed px-2.5 py-2 transition-colors`}
            style={{ borderColor: dropBorderColor, background: dropBg }}
          >
            <svg fill="none" height="12" stroke={dropIconColor} strokeWidth="1.3" viewBox="0 0 14 14" width="12">
              <path d="M7 2v7M4 6l3 4 3-4" strokeLinecap="round" />
              <path d="M2 11h10" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-[9px] tracking-wide" style={{ color: dropTextColor }}>
              {dropLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  const confirmAssignmentPanel = pendingAssignment ? (
    <div className="animate-[dropIn_0.15s_ease-out] border border-[#0071CE]/25 border-l-[3px] border-l-[#0071CE] bg-white p-3 shadow-[0_10px_40px_rgba(0,20,58,.16)]">
      <p className="mb-1 font-mono text-[8px] tracking-wide text-[#0071CE]">CONFIRM ASSIGNMENT</p>
      <p className="text-[12px] font-semibold leading-snug text-[#0D0E12]">
        {pendingAssignment.planName} → {pendingAssignment.personName}
      </p>
      {pendingAssignment.existingPlanCount > 0 ? (
        <p className="mt-1 text-[10.5px] leading-snug text-[#6B6860]">
          Adds to {pendingAssignment.existingPlanCount} existing plan
          {pendingAssignment.existingPlanCount === 1 ? "" : "s"} — stagger the start date to lay out their calendar.
        </p>
      ) : null}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-0.5 font-mono text-[7.5px] text-[#A09D98]">Start date</p>
          <input
            className="w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[10.5px]"
            onChange={(event) => setAssignStartDate(event.target.value)}
            type="date"
            value={assignStartDate}
          />
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[7.5px] text-[#A09D98]">Mentor</p>
          <select
            className="w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[10.5px]"
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
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <button
          className="btn bn bsm flex flex-1 items-center justify-center gap-1 bg-[#00143A] px-3 py-2 text-[10.5px] font-semibold text-white"
          disabled={isAssigning}
          onClick={() => void confirmAssignment()}
          type="button"
        >
          {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Confirm & assign →
        </button>
        <button
          className="btn bo bsm border border-[#D4D1CB] px-3 py-2 text-[10.5px] font-semibold text-[#3D3C38]"
          onClick={() => setPendingAssignment(null)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="overflow-hidden border border-[#E2DFD9] bg-[#F5F4F0]">
      {/* Instruction strip */}
      <div className="flex flex-wrap items-center gap-3 bg-[#00143A] px-5 py-2">
        {[
          { n: "1", color: "#0071CE", label: "Drag a plan from the left" },
          { n: "2", color: "#CC27B0", label: "Drop it on an employee" },
          { n: "3", color: "#0A6E45", label: "Confirm start date & mentor, then assign" },
        ].map((step, index) => (
          <div className="flex items-center gap-2" key={step.n}>
            {index > 0 ? (
              <svg fill="none" height="8" viewBox="0 0 18 8" width="16">
                <path d="M1 4h14M11 1l4 3-4 3" stroke="rgba(255,255,255,.25)" strokeLinecap="round" strokeWidth="1.3" />
              </svg>
            ) : null}
            <div
              className="flex h-5 w-5 items-center justify-center"
              style={{ background: step.color }}
            >
              <span className="font-mono text-[9px] font-semibold text-white">{step.n}</span>
            </div>
            <span className="text-[11.5px] text-white/65">{step.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-white/30" />
          <span className="font-mono text-[9px] tracking-wide text-white/30">
            Locked plans — step delete requires Admin
          </span>
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
          <div className="border-b border-[#E2DFD9] bg-white p-3 lg:hidden">{confirmAssignmentPanel}</div>
        ) : null}
        {/* Col 1 — Plan library */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-[#E2DFD9] bg-[#F9F8F6] lg:border-r">
          <div className="border-b border-[#E2DFD9] px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-display text-sm font-extrabold text-[#0D0E12]">Plan library</p>
                <p className="text-[11px] text-[#6B6860]">Drag a plan onto an employee →</p>
              </div>
              <button
                className="btn bo bxs inline-flex items-center gap-1 border border-[#D4D1CB] px-2 py-1 text-[10px] font-semibold text-[#3D3C38]"
                onClick={() => void handleNewCustomPlan()}
                type="button"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
            <div className="flex border-b border-[#E2DFD9]">
              {(["all", "locked", "custom"] as PlanTab[]).map((tab) => (
                <button
                  className="flex-1 py-1.5 font-mono text-[8.5px] tracking-wide transition-colors"
                  key={tab}
                  onClick={() => setPlanTab(tab)}
                  style={{
                    borderBottom: `2px solid ${planTab === tab ? "#0071CE" : "transparent"}`,
                    color: planTab === tab ? "#0071CE" : "#A09D98",
                  }}
                  type="button"
                >
                  {tab.toUpperCase()}
                </button>
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
                  className={`plan-card cursor-grab overflow-hidden border bg-white transition active:cursor-grabbing ${
                    isSelected ? "border-[#CC27B0] shadow-[0_0_0_2px_rgba(204,39,176,.15)]" : "border-[#E2DFD9]"
                  } ${isDragging ? "border-dashed border-[#0071CE] opacity-35 shadow-none" : "hover:shadow-md"}`}
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
                  <div className="h-[3px]" style={{ background: templateAccentGradient(template.name) }} />
                  <div className="p-3">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold leading-tight text-[#0D0E12]">{template.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#6B6860]">{template.description}</p>
                      </div>
                      {locked ? (
                        <div className="flex shrink-0 items-center gap-1 border border-amber-200/60 bg-[#FEF3C7] px-1.5 py-0.5">
                          <Lock className="h-2.5 w-2.5 text-[#b45309]" />
                          <span className="font-mono text-[7.5px] tracking-wide text-[#b45309]">LOCKED</span>
                        </div>
                      ) : (
                        <span className="shrink-0 bg-[#EDFAF3] px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-wide text-[#0A6E45]">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {stepTypePills(template.steps).map((pill) => (
                        <span
                          className="font-mono text-[7.5px] tracking-wide"
                          key={pill.label}
                          style={{ background: pill.bg, color: pill.color, padding: "1px 5px" }}
                        >
                          {pill.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[9px] text-[#A09D98]">
                      <span>{template.steps.length} steps</span>
                      <span className="text-[#B0ADA8]">·</span>
                      <span>{duration}</span>
                      <span className="text-[#B0ADA8]">·</span>
                      <span style={{ color: usedBy > 0 ? "#0A6E45" : "#B0ADA8" }}>
                        {usedBy > 0 ? `Used by ${usedBy}` : "Unused"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-[#F2F0EC] px-3 py-1.5">
                    <GripVertical className="h-3 w-3 text-[#C4C1BB]" />
                    <span className="font-mono text-[8px] tracking-wide text-[#C4C1BB]">DRAG TO ASSIGN</span>
                    <button
                      className="ml-auto font-mono text-[8px] tracking-wide text-[#0071CE]"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPlan(template);
                      }}
                      type="button"
                    >
                      VIEW STEPS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2 — Employee roster */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F5F4F0]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DFD9] bg-white px-4 py-3">
            <div>
              <p className="font-display text-sm font-extrabold text-[#0D0E12]">My team</p>
              <p className="text-[11px] text-[#6B6860]">Drop a plan onto any employee to assign it</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "new", label: "New hires" },
                  { id: "existing", label: "Existing" },
                  { id: "unassigned", label: "Unassigned" },
                ] as { id: EmpFilter; label: string }[]
              ).map((filter) => (
                <button
                  className="px-2.5 py-1 text-[10px] font-semibold transition-colors"
                  key={filter.id}
                  onClick={() => setEmpFilter(filter.id)}
                  style={{
                    border: `1px solid ${empFilter === filter.id ? "#00143A" : "#E2DFD9"}`,
                    background: empFilter === filter.id ? "#00143A" : "#fff",
                    color: empFilter === filter.id ? "white" : "#6B6860",
                  }}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {(empFilter === "all" || empFilter === "new") && newHireEmps.length > 0 ? (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#B0ADA8]">New hires</span>
                  <div className="h-px flex-1 bg-[#E2DFD9]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0A6E45]" />
                  <span className="font-mono text-[8px] text-[#0A6E45]">Needs plan</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{newHireEmps.map(renderEmployeeCard)}</div>
              </div>
            ) : null}

            {(empFilter === "all" || empFilter === "existing") && existingEmps.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#B0ADA8]">Existing team</span>
                  <div className="h-px flex-1 bg-[#E2DFD9]" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{existingEmps.map(renderEmployeeCard)}</div>
              </div>
            ) : null}

            {roster.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B6860]">No team members match this filter.</p>
            ) : null}
          </div>
        </div>

        {/* Col 3 — Preview + confirm */}
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-[#E2DFD9] bg-[#F9F8F6] lg:border-l">
          <div className="border-b border-[#E2DFD9] px-3.5 py-3">
            <p className="font-display text-sm font-extrabold text-[#0D0E12]">
              {selectedTemplate?.name ?? "Select a plan"}
            </p>
            <p className="text-[11px] text-[#6B6860]">
              {selectedTemplate
                ? `${previewSteps.length} steps · ${templateDurationLabel(templateDurationDays(selectedTemplate.steps))}${
                    selectedLocked ? " · Locked — reorder only" : " · Custom — full edit"
                  }`
                : "Click or drag a plan from the left"}
            </p>
            {isSavingSteps ? (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-[#0071ce]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving steps…
              </p>
            ) : null}
          </div>

          {selectedLocked ? (
            <div className="mx-2 mt-2 shrink-0 border border-amber-200/40 border-l-[3px] border-l-[#b45309] bg-[#FFFBF0] px-3 py-2">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wide text-[#b45309]">
                <Lock className="h-3 w-3" />
                MANAGER-LOCKED PLAN
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#5C4200]">
                You can reorder steps but cannot add or delete them. Contact an Admin to modify structure.
              </p>
            </div>
          ) : null}

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {previewSteps.map((step, index) => {
              const info = stepTypeIcon(step.stepType);
              const indicatorAbove =
                stepDropIndicator?.index === index && stepDropIndicator.position === "above";
              const indicatorBelow =
                stepDropIndicator?.index === index && stepDropIndicator.position === "below";

              return (
                <div
                  className={`relative mb-1 flex border border-[#E2DFD9] bg-white ${
                    indicatorAbove
                      ? "before:absolute before:left-0 before:right-0 before:top-0 before:z-10 before:h-0.5 before:bg-[#0071CE] before:content-['']"
                      : ""
                  } ${
                    indicatorBelow
                      ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:z-10 after:h-0.5 after:bg-[#0071CE] after:content-['']"
                      : ""
                  }`}
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
                  <div className="flex w-6 shrink-0 cursor-grab items-center justify-center border-r border-[#ECEAE6] bg-[#F9F8F6]">
                    <GripVertical className="h-3 w-3 text-[#C4C1BB]" />
                  </div>
                  <div className="flex w-6 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-[#ECEAE6]">
                    <span className="font-mono text-[10px] text-[#A09D98]">{index + 1}</span>
                    {step.isGate ? (
                      <span className="h-2 w-2 rotate-45 bg-[#CC27B0]" title="Segment gate" />
                    ) : null}
                  </div>
                  <div
                    className="flex w-8 shrink-0 items-center justify-center border-r border-[#ECEAE6] text-xs"
                    style={{ background: info.iconBg }}
                  >
                    {info.icon}
                  </div>
                  <div className="min-w-0 flex-1 px-2.5 py-1.5">
                    <p className="truncate text-[11.5px] font-semibold text-[#0D0E12]">{step.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[8.5px] text-[#B0ADA8]">+{step.dueOffset}d</span>
                      {step.segment ? (
                        <span className="bg-[#F0F7FF] px-1 font-mono text-[7px] uppercase text-[#0057a8]">
                          {step.segment}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center px-2">
                    {canEditStructure ? (
                      <button
                        className="text-[#D4D1CB] transition-colors hover:text-[#B83128]"
                        onClick={() => void handleDeleteStep(index)}
                        title="Delete step"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span title="Admin only">
                        <Lock className="h-3.5 w-3.5 text-[#D4D1CB]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {canEditStructure ? (
              <button
                className="btn bo bsm mt-1 flex w-full items-center justify-center gap-1 border border-[#D4D1CB] py-1.5 text-[10px] font-semibold text-[#3D3C38]"
                onClick={() => void handleAddStep()}
                type="button"
              >
                <Plus className="h-3 w-3" />
                Add step
              </button>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#E2DFD9] bg-white p-2.5">
            {!pendingAssignment ? (
              <p className="py-2 text-center font-mono text-[9px] text-[#B0ADA8]">
                Drop a plan onto an employee to assign it
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
