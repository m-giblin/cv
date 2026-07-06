"use client";

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import { Profile, PlanStepType, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

type TemplateStep = {
  id?: string;
  title: string;
  description: string;
  stepType: PlanStepType;
  dueOffsetDays: number;
  contentUrl: string;
  contentAssetId: string;
  challengeId: string;
  simulationTemplateId: string;
  segmentIndex: number | null;
  isSegmentGate: boolean;
};

type ContentAssetOption = { id: string; title: string; url: string };
type ChallengeOption = { id: string; title: string };
type SimTemplateOption = { id: string; name: string };

type DbPlanStep = {
  id: string;
  title: string;
  description: string | null;
  step_type: PlanStepType;
  sort_order: number;
  content_url: string | null;
  content_asset_id: string | null;
  challenge_id: string | null;
  simulation_template_id: string | null;
  metadata: Record<string, unknown>;
};

type PlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  steps: DbPlanStep[];
};

const STEP_TYPES: PlanStepType[] = [
  "content_review",
  "challenge",
  "simulation",
  "deal_prep",
  "shadow_meeting_log",
  "mentor_review",
  "custom",
];

const emptyStep = (): TemplateStep => ({
  title: "",
  description: "",
  stepType: "content_review",
  dueOffsetDays: 7,
  contentUrl: "",
  contentAssetId: "",
  challengeId: "",
  simulationTemplateId: "",
  segmentIndex: null,
  isSegmentGate: false,
});

function dbStepToTemplate(step: DbPlanStep): TemplateStep {
  const meta = parsePlanStepMetadata(step.metadata, step.sort_order);
  return {
    id: step.id,
    title: step.title,
    description: step.description ?? "",
    stepType: step.step_type,
    dueOffsetDays: meta.dueOffsetDays ?? step.sort_order * 7,
    contentUrl: step.content_url ?? "",
    contentAssetId: step.content_asset_id ?? "",
    challengeId: step.challenge_id ?? "",
    simulationTemplateId: step.simulation_template_id ?? "",
    segmentIndex: meta.segmentIndex,
    isSegmentGate: meta.isSegmentGate,
  };
}

function templateVisuals(template: PlanTemplate, index: number) {
  const lower = template.name.toLowerCase();
  const accentGradient = lower.includes("senior")
    ? "linear-gradient(90deg,#5b21b6,#7c3aed)"
    : lower.includes("lateral")
      ? "linear-gradient(90deg,#0369a1,#0891b2)"
      : "linear-gradient(90deg,#0033a1,#0071ce)";

  if (index === 0) {
    return { accentGradient, badge: "Most used", badgeBg: "#dbeafe", badgeColor: "#1d4ed8" };
  }
  if (template.steps.length > 0) {
    return { accentGradient, badge: "In use", badgeBg: "#ede9fe", badgeColor: "#5b21b6" };
  }
  return { accentGradient, badge: "Draft", badgeBg: "#f1f5f9", badgeColor: "#64748b" };
}

function assignmentStatusStyle(status: UserPlan["status"]) {
  if (status === "completed") {
    return { label: "Complete", statBg: "#dcfce7", statColor: "#15803d" };
  }
  if (status === "not_started") {
    return { label: "Not started", statBg: "#f1f5f9", statColor: "#64748b" };
  }
  return { label: "Active", statBg: "#e8f2fc", statColor: "#0057a8" };
}

export function PlanManagementPanel({
  assignees,
  mentors,
  plans = [],
  profiles = [],
}: {
  assignees: Profile[];
  mentors: Profile[];
  plans?: UserPlan[];
  profiles?: Profile[];
}) {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<TemplateStep[]>([emptyStep()]);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignMentorId, setAssignMentorId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetCompletion, setTargetCompletion] = useState("");
  const [contentAssets, setContentAssets] = useState<ContentAssetOption[]>([]);
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [simTemplates, setSimTemplates] = useState<SimTemplateOption[]>([]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setSteps([emptyStep()]);
  }, []);

  const loadPickers = useCallback(async () => {
    const [contentRes, challengeRes, simRes] = await Promise.all([
      fetch("/api/content"),
      fetch("/api/challenges"),
      fetch("/api/simulations/assignments"),
    ]);

    if (contentRes.ok) {
      const body = (await contentRes.json()) as { assets: ContentAssetOption[] };
      setContentAssets(body.assets);
    }

    if (challengeRes.ok) {
      const body = (await challengeRes.json()) as { challenges: ChallengeOption[] };
      setChallenges(body.challenges ?? []);
    }

    if (simRes.ok) {
      const body = (await simRes.json()) as { templates: SimTemplateOption[] };
      setSimTemplates(body.templates ?? []);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/plans/templates");

    if (!response.ok) {
      toast.error("Failed to load plan templates.");
      setIsLoading(false);
      return;
    }

    const body = (await response.json()) as { templates: PlanTemplate[] };
    setTemplates(body.templates);
    if (body.templates[0] && !assignPlanId) {
      setAssignPlanId(body.templates[0].id);
    }
    setIsLoading(false);
  }, [assignPlanId]);

  useEffect(() => {
    void loadTemplates();
    void loadPickers();
  }, [loadTemplates, loadPickers]);

  function startEdit(template: PlanTemplate) {
    setEditingId(template.id);
    setName(template.name);
    setDescription(template.description ?? "");
    setSteps(
      template.steps.length > 0
        ? template.steps.sort((a, b) => a.sort_order - b.sort_order).map(dbStepToTemplate)
        : [emptyStep()],
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const payload = { name, description, steps };
    const response = await fetch(
      editingId ? `/api/plans/templates/${editingId}` : "/api/plans/templates",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not save template.");
      setIsSaving(false);
      return;
    }

    toast.success(editingId ? "Template updated." : "Plan template saved.");
    resetForm();
    setIsSaving(false);
    void loadTemplates();
  }

  async function deleteTemplate(template: PlanTemplate) {
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
      return;
    }

    const response = await fetch(`/api/plans/templates/${template.id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not delete template.");
      return;
    }

    if (editingId === template.id) {
      resetForm();
    }

    if (assignPlanId === template.id) {
      setAssignPlanId("");
    }

    toast.success("Template deleted.");
    void loadTemplates();
  }

  async function assignPlan(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/plans/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: assignPlanId,
        userId: assignUserId,
        mentorId: assignMentorId || null,
        startDate,
        targetCompletion: targetCompletion || null,
      }),
    });

    if (!response.ok) {
      toast.error("Assignment failed.");
      setIsSaving(false);
      return;
    }

    toast.success("Plan assigned. SE will receive a notification.");
    setIsSaving(false);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template, index) => {
          const visual = templateVisuals(template, index);
          const tags = [
            `${template.steps.length} steps`,
            ...new Set(template.steps.map((step) => step.step_type.replaceAll("_", " "))),
          ].slice(0, 3);
          return (
            <div
              className="cursor-pointer overflow-hidden rounded-xl border border-[#e2eaf5] bg-white transition hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(0,20,58,0.1)]"
              key={template.id}
            >
              <div className="h-[4px]" style={{ background: visual.accentGradient }} />
              <div className="p-[15px_16px]">
                <div className="mb-[10px] flex items-start justify-between">
                  <p className="text-[12.5px] font-bold text-[#0a1628]">{template.name}</p>
                  <span
                    className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                    style={{ background: visual.badgeBg, color: visual.badgeColor }}
                  >
                    {visual.badge}
                  </span>
                </div>
                <p className="mb-[10px] text-[11px] leading-[1.5] text-[#64748b]">
                  {template.description ?? "Reusable onboarding template with ordered steps and due offsets."}
                </p>
                <div className="mb-[10px] flex flex-wrap gap-[5px]">
                  {tags.map((tag) => (
                    <span
                      className="rounded-full bg-[#f1f5f9] px-[8px] py-[2px] text-[10px] font-semibold text-[#64748b]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-[7px]">
                  <button
                    className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                    onClick={() => startEdit(template)}
                    type="button"
                  >
                    Edit steps
                  </button>
                  <button
                    className="inline-flex items-center rounded-md bg-[#0071ce] px-[10px] py-[5px] text-[11px] font-semibold text-white"
                    onClick={() => setAssignPlanId(template.id)}
                    type="button"
                  >
                    Assign →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
        <div className="border-b border-[#f1f5f9] p-[13px_18px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Active assignments</p>
          <p className="text-[11px] text-[#64748b]">Ramp progress across assigned SEs</p>
        </div>
        {plans.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-sm text-[#94a3b8]">No plan assignments yet.</p>
        ) : (
          plans.map((plan) => {
            const se = profiles.find((profile) => profile.id === plan.userId);
            const manager = se?.managerId ? profiles.find((profile) => profile.id === se.managerId) : null;
            const progress = `${plan.progress}%`;
            const status = assignmentStatusStyle(plan.status);
            return (
              <div
                className="flex items-center gap-[14px] border-b border-[#f9fafb] px-[18px] py-[10px] transition hover:bg-[#f7fafd] last:border-b-0"
                key={plan.id}
              >
                <div
                  className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                  style={{ background: avatarGradientForId(plan.userId) }}
                >
                  {initials(se?.fullName ?? "SE")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#1e293b]">{se?.fullName ?? "Assigned SE"}</p>
                  <p className="text-[10.5px] text-[#94a3b8]">
                    {plan.name} · {manager?.fullName ?? "No manager"}
                  </p>
                </div>
                <div className="w-[120px]">
                  <div className="mb-[3px] flex justify-between">
                    <span className="text-[10px] text-[#64748b]">{progress}</span>
                    <span className="text-[10px] font-bold text-[#0071ce]">{progress}</span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-[#e8f2fc]">
                    <div className="prog-fill h-full rounded-full bg-[#0071ce]" style={{ width: progress }} />
                  </div>
                </div>
                <span
                  className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                  style={{ background: status.statBg, color: status.statColor }}
                >
                  {status.label}
                </span>
                <div className="flex flex-shrink-0 gap-[6px]">
                  <button
                    className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                    type="button"
                  >
                    Reassign
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <div className={`rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px] ${editingId ? "ring-2 ring-[#cc27b0]/30" : ""}`}>
          <div className="mb-[14px] flex items-start justify-between gap-3">
            <div>
              <p className="text-[12.5px] font-bold text-[#0a1628]">{editingId ? "Edit template" : "Plan template builder"}</p>
              <p className="mt-[2px] text-[11px] text-[#64748b]">
                {editingId
                  ? "Update steps, content links, and due offsets. Changes apply to future assignments."
                  : "Create reusable onboarding templates with ordered steps and due offsets."}
              </p>
            </div>
            {editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        <form className="space-y-4" onSubmit={saveTemplate}>
          <Input onChange={(e) => setName(e.target.value)} placeholder="Plan name" required value={name} />
          <Textarea
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            value={description}
          />
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div className="rounded-2xl border border-sp-blue/10 p-4" key={step.id ?? `new-${index}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-sp-blue">Step {index + 1}</p>
                  {steps.length > 1 ? (
                    <Button
                      onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <Input
                  className="mb-2"
                  onChange={(e) => {
                    const next = [...steps];
                    next[index] = { ...next[index], title: e.target.value };
                    setSteps(next);
                  }}
                  placeholder="Step title"
                  required
                  value={step.title}
                />
                <Textarea
                  className="mb-2"
                  onChange={(e) => {
                    const next = [...steps];
                    next[index] = { ...next[index], description: e.target.value };
                    setSteps(next);
                  }}
                  placeholder="Step description"
                  value={step.description}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="h-10 rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...next[index], stepType: e.target.value as PlanStepType };
                      setSteps(next);
                    }}
                    value={step.stepType}
                  >
                    {STEP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <Input
                    min={1}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...next[index], dueOffsetDays: Number(e.target.value) };
                      setSteps(next);
                    }}
                    placeholder="Due offset (days)"
                    type="number"
                    value={step.dueOffsetDays}
                  />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select
                    className="h-10 rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = {
                        ...next[index],
                        segmentIndex: e.target.value ? Number(e.target.value) : null,
                      };
                      setSteps(next);
                    }}
                    value={step.segmentIndex ?? ""}
                  >
                    <option value="">No segment (optional)</option>
                    <option value="1">Segment 1 — Days 1–30</option>
                    <option value="2">Segment 2 — Days 31–60</option>
                    <option value="3">Segment 3 — Days 61–90</option>
                    <option value="4">Segment 4 — Days 91–120</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs font-semibold text-sp-navy-muted">
                    <input
                      checked={step.isSegmentGate}
                      onChange={(e) => {
                        const next = [...steps];
                        next[index] = { ...next[index], isSegmentGate: e.target.checked };
                        setSteps(next);
                      }}
                      type="checkbox"
                    />
                    Assessment gate (unlocks next segment)
                  </label>
                </div>
                {step.stepType === "content_review" ? (
                  <div className="mt-2 space-y-2">
                    <select
                      className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                      onChange={(e) => {
                        const asset = contentAssets.find((item) => item.id === e.target.value);
                        const next = [...steps];
                        next[index] = {
                          ...next[index],
                          contentAssetId: e.target.value,
                          contentUrl: asset?.url ?? next[index].contentUrl,
                        };
                        setSteps(next);
                      }}
                      value={step.contentAssetId}
                    >
                      <option value="">Pick from content library</option>
                      {contentAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title}
                        </option>
                      ))}
                    </select>
                    <Input
                      onChange={(e) => {
                        const next = [...steps];
                        next[index] = { ...next[index], contentUrl: e.target.value };
                        setSteps(next);
                      }}
                      placeholder="Or paste URL directly"
                      value={step.contentUrl}
                    />
                  </div>
                ) : null}
                {step.stepType === "challenge" ? (
                  <select
                    className="mt-2 h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...next[index], challengeId: e.target.value };
                      setSteps(next);
                    }}
                    value={step.challengeId}
                  >
                    <option value="">Link to challenge (optional)</option>
                    {challenges.map((challenge) => (
                      <option key={challenge.id} value={challenge.id}>
                        {challenge.title}
                      </option>
                    ))}
                  </select>
                ) : null}
                {step.stepType === "simulation" ? (
                  <select
                    className="mt-2 h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...next[index], simulationTemplateId: e.target.value };
                      setSteps(next);
                    }}
                    value={step.simulationTemplateId}
                  >
                    <option value="">Link to sim template (optional)</option>
                    {simTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          </div>
          <Button onClick={() => setSteps([...steps, emptyStep()])} type="button" variant="outline">
            <Plus className="h-4 w-4" />
            Add step
          </Button>
          <Button className="w-full" disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingId ? "Update template" : "Save template"}
          </Button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Assign plan to SE</p>
          <p className="mb-[14px] mt-[2px] text-[11px] text-[#64748b]">
            Creates assignment steps with due dates from template offsets.
          </p>
          <form className="space-y-4" onSubmit={assignPlan}>
            <select
              className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
              onChange={(e) => setAssignPlanId(e.target.value)}
              required
              value={assignPlanId}
            >
              <option disabled value="">
                Select template
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
              onChange={(e) => setAssignUserId(e.target.value)}
              required
              value={assignUserId}
            >
              <option disabled value="">
                Assign to
              </option>
              {assignees.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
              onChange={(e) => setAssignMentorId(e.target.value)}
              value={assignMentorId}
            >
              <option value="">No mentor</option>
              {mentors.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input onChange={(e) => setStartDate(e.target.value)} required type="date" value={startDate} />
              <Input
                onChange={(e) => setTargetCompletion(e.target.value)}
                placeholder="Target completion"
                type="date"
                value={targetCompletion}
              />
            </div>
            <Button className="w-full" disabled={isSaving || isLoading} type="submit">
              Assign plan
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Template builder</p>
          <p className="mb-[14px] mt-[2px] text-[11px] text-[#64748b]">
            Create or edit templates in the builder below.
          </p>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                  editingId === template.id ? "border-sp-magenta/30 bg-sp-magenta-soft/10" : "border-sp-blue/10"
                }`}
                key={template.id}
              >
                <div>
                  <p className="font-bold text-sp-navy">{template.name}</p>
                  <p className="text-sp-navy-muted">{template.steps.length} steps</p>
                </div>
                <div className="flex gap-1">
                  <Button onClick={() => startEdit(template)} size="sm" type="button" variant="ghost">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => void deleteTemplate(template)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
