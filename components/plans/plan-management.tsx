"use client";

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Profile, PlanStepType } from "@/lib/types";

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
});

function dbStepToTemplate(step: DbPlanStep): TemplateStep {
  const dueOffsetDays =
    typeof step.metadata?.dueOffsetDays === "number"
      ? step.metadata.dueOffsetDays
      : step.sort_order * 7;

  return {
    id: step.id,
    title: step.title,
    description: step.description ?? "",
    stepType: step.step_type,
    dueOffsetDays,
    contentUrl: step.content_url ?? "",
    contentAssetId: step.content_asset_id ?? "",
    challengeId: step.challenge_id ?? "",
    simulationTemplateId: step.simulation_template_id ?? "",
  };
}

export function PlanManagementPanel({
  assignees,
  mentors,
}: {
  assignees: Profile[];
  mentors: Profile[];
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
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className={editingId ? "ring-2 ring-sp-magenta/30" : undefined}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{editingId ? "Edit template" : "Plan template builder"}</CardTitle>
              <CardDescription>
                {editingId
                  ? "Update steps, content links, and due offsets. Changes apply to future assignments."
                  : "Create reusable onboarding templates with ordered steps and due offsets."}
              </CardDescription>
            </div>
            {editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </CardHeader>
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
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Assign plan to SE</CardTitle>
            <CardDescription>Creates assignment steps with due dates from template offsets.</CardDescription>
          </CardHeader>
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates ({templates.length})</CardTitle>
            <CardDescription>Click edit to load a template into the builder.</CardDescription>
          </CardHeader>
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
        </Card>
      </div>
    </div>
  );
}
