"use client";

import { Loader2, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GoalStatusBadge } from "@/components/development/goal-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currentQuarter } from "@/lib/development/plan-utils";
import { Competency, DevelopmentPlan, GoalQuarterlyReview, Profile } from "@/lib/types";

export function DevelopmentPlanPanel({
  competencies,
  assignees,
  initialPlan,
  viewerRole,
  focusReviewId,
  initialSelectedUserId,
}: {
  competencies: Competency[];
  assignees: Profile[];
  initialPlan: DevelopmentPlan | null;
  viewerRole: "se" | "manager" | "admin";
  focusReviewId?: string;
  initialSelectedUserId?: string;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(!initialPlan && viewerRole !== "se");
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId ?? assignees[0]?.id ?? "");
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState([
    { title: "", description: "", competencyId: "", evidenceType: "demo_recording" as const },
  ]);
  const [activeReviewId, setActiveReviewId] = useState(focusReviewId ?? "");

  const quarter = currentQuarter();

  const loadPlan = useCallback(async (userId: string) => {
    const response = await fetch(`/api/development/plans?userId=${userId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { plan: DevelopmentPlan | null };
    setPlan(body.plan);
  }, []);

  useEffect(() => {
    if (selectedUserId && viewerRole !== "se") {
      void loadPlan(selectedUserId);
    }
  }, [selectedUserId, viewerRole, loadPlan]);

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/development/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        year,
        goals: goals.filter((goal) => goal.title.trim()).map((goal) => ({
          title: goal.title,
          description: goal.description,
          competencyId: goal.competencyId || null,
          evidenceType: goal.evidenceType,
        })),
      }),
    });

    if (!response.ok) {
      toast.error("Could not create development plan.");
      setIsSaving(false);
      return;
    }

    toast.success("Development plan created with quarterly reviews.");
    setShowCreate(false);
    setIsSaving(false);
    void loadPlan(selectedUserId);
  }

  async function updateReview(review: GoalQuarterlyReview, payload: Record<string, unknown>) {
    setIsSaving(true);
    const response = await fetch(`/api/development/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error("Update failed.");
      setIsSaving(false);
      return;
    }

    toast.success("Checkpoint saved.");
    setIsSaving(false);
    setActiveReviewId("");
    if (viewerRole === "se") {
      window.location.reload();
    } else {
      void loadPlan(selectedUserId);
    }
  }

  if (showCreate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-sp-magenta" />
            Create {year} development plan
          </CardTitle>
          <CardDescription>Max 5 goals. Quarterly reviews are scheduled automatically (Q1–Q4).</CardDescription>
        </CardHeader>
        <form className="space-y-4" onSubmit={createPlan}>
          <select
            className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
            onChange={(event) => setSelectedUserId(event.target.value)}
            required
            value={selectedUserId}
          >
            {assignees.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
              </option>
            ))}
          </select>
          <Input onChange={(event) => setYear(Number(event.target.value))} type="number" value={year} />
          {goals.map((goal, index) => (
            <div className="rounded-2xl border border-sp-blue/10 p-4" key={index}>
              <Input
                className="mb-2"
                onChange={(event) => {
                  const next = [...goals];
                  next[index] = { ...next[index], title: event.target.value };
                  setGoals(next);
                }}
                placeholder={`Goal ${index + 1} title`}
                required
                value={goal.title}
              />
              <Textarea
                className="mb-2"
                onChange={(event) => {
                  const next = [...goals];
                  next[index] = { ...next[index], description: event.target.value };
                  setGoals(next);
                }}
                placeholder="What does success look like?"
                value={goal.description}
              />
              <select
                className="mb-2 h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                onChange={(event) => {
                  const next = [...goals];
                  next[index] = { ...next[index], competencyId: event.target.value };
                  setGoals(next);
                }}
                value={goal.competencyId}
              >
                <option value="">Link competency (optional)</option>
                {competencies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                onChange={(event) => {
                  const next = [...goals];
                  next[index] = {
                    ...next[index],
                    evidenceType: event.target.value as typeof goal.evidenceType,
                  };
                  setGoals(next);
                }}
                value={goal.evidenceType}
              >
                <option value="demo_recording">Demo recording</option>
                <option value="customer_reference">Customer reference</option>
                <option value="certification">Certification</option>
                <option value="deal_support">Deal support</option>
                <option value="shadow_notes">Shadow notes</option>
                <option value="other">Other</option>
              </select>
            </div>
          ))}
          {goals.length < 5 ? (
            <Button
              onClick={() =>
                setGoals([
                  ...goals,
                  { title: "", description: "", competencyId: "", evidenceType: "demo_recording" },
                ])
              }
              type="button"
              variant="outline"
            >
              Add goal
            </Button>
          ) : null}
          <Button className="w-full" disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create plan & schedule reviews
          </Button>
        </form>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No development plan for {year}</CardTitle>
          <CardDescription>
            {viewerRole === "se"
              ? "Ask your manager to co-create your annual goals with quarterly checkpoints."
              : "Create a plan to set annual goals and auto-schedule Q1–Q4 reviews."}
          </CardDescription>
        </CardHeader>
        {viewerRole !== "se" ? (
          <Button onClick={() => setShowCreate(true)}>Create development plan</Button>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-sp-magenta/15 bg-gradient-to-br from-white to-sp-magenta-soft/20">
        <CardHeader>
          <CardTitle>
            {plan.year} development plan
          </CardTitle>
          <CardDescription>
            Current quarter: {quarter} • {plan.goals.length} goals • Quarterly manager checkpoints
          </CardDescription>
        </CardHeader>
      </Card>

      {plan.goals.map((goal) => {
        const competency = competencies.find((item) => item.id === goal.competencyId);

        return (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{goal.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {competency ? `${competency.category} • ${competency.name}` : goal.evidenceType.replaceAll("_", " ")}
                  </CardDescription>
                </div>
                <GoalStatusBadge status={goal.overallStatus} />
              </div>
              {goal.description ? <p className="mt-2 text-sm text-sp-navy-muted">{goal.description}</p> : null}
            </CardHeader>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {goal.quarterlyReviews.map((review) => (
                <div
                  className={`rounded-2xl border p-3 text-sm ${
                    review.id === focusReviewId ? "border-sp-magenta ring-2 ring-sp-magenta/20" : "border-sp-blue/10"
                  }`}
                  key={review.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sp-navy">{review.quarter}</span>
                    <GoalStatusBadge status={review.status} />
                  </div>
                  <p className="mt-1 text-xs text-sp-navy-muted">Due {review.dueDate}</p>
                  <Button
                    className="mt-2 w-full"
                    onClick={() => setActiveReviewId(review.id)}
                    size="sm"
                    variant="outline"
                  >
                    {review.reviewedAt ? "View" : "Update"}
                  </Button>
                </div>
              ))}
            </div>

            {activeReviewId && goal.quarterlyReviews.some((review) => review.id === activeReviewId) ? (
              <ReviewEditor
                isManager={viewerRole !== "se"}
                isSaving={isSaving}
                onClose={() => setActiveReviewId("")}
                onSave={(payload) =>
                  void updateReview(goal.quarterlyReviews.find((review) => review.id === activeReviewId)!, payload)
                }
                review={goal.quarterlyReviews.find((review) => review.id === activeReviewId)!}
              />
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function ReviewEditor({
  review,
  isManager,
  isSaving,
  onSave,
  onClose,
}: {
  review: GoalQuarterlyReview;
  isManager: boolean;
  isSaving: boolean;
  onSave: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [seEvidence, setSeEvidence] = useState(review.seEvidence ?? "");
  const [seEvidenceUrl, setSeEvidenceUrl] = useState(review.seEvidenceUrl ?? "");
  const [managerComments, setManagerComments] = useState(review.managerComments ?? "");
  const [status, setStatus] = useState(review.status);

  return (
    <div className="mt-4 space-y-3 border-t border-sp-blue/10 pt-4">
      {!isManager ? (
        <>
          <Textarea
            onChange={(event) => setSeEvidence(event.target.value)}
            placeholder="Evidence and progress this quarter..."
            value={seEvidence}
          />
          <Input
            onChange={(event) => setSeEvidenceUrl(event.target.value)}
            placeholder="Evidence link (optional)"
            type="url"
            value={seEvidenceUrl}
          />
        </>
      ) : (
        <>
          {review.seEvidence ? (
            <p className="rounded-xl bg-sp-blue-soft/30 p-3 text-sm text-sp-navy">{review.seEvidence}</p>
          ) : null}
          <Textarea
            onChange={(event) => setManagerComments(event.target.value)}
            placeholder="Manager coaching comments..."
            value={managerComments}
          />
          <select
            className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="achieved">Achieved</option>
          </select>
        </>
      )}
      <div className="flex gap-2">
        <Button
          disabled={isSaving}
          onClick={() =>
            onSave(
              isManager
                ? { managerComments, status }
                : { seEvidence, seEvidenceUrl, status: "on_track" },
            )
          }
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save checkpoint
        </Button>
        <Button onClick={onClose} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </div>
  );
}
