"use client";

import { Loader2, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currentQuarter } from "@/lib/development/plan-utils";
import { Competency, DevelopmentPlan, GoalQuarterlyReview, GoalStatus, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD_SHELL = "rounded-xl border border-[#e2eaf5] bg-white";

function NorthstarGoalStatusBadge({ status }: { status: GoalStatus }) {
  const styles: Record<GoalStatus, string> = {
    not_started: "bg-[#f1f5f9] text-[#64748b]",
    on_track: "bg-[#dbeafe] text-[#1d4ed8]",
    at_risk: "bg-[#fef3c7] text-[#b45309]",
    achieved: "bg-[#dcfce7] text-[#15803d]",
  };
  const labels: Record<GoalStatus, string> = {
    not_started: "Not started",
    on_track: "In progress",
    at_risk: "At risk",
    achieved: "Achieved",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold", styles[status])}>{labels[status]}</span>
  );
}

function quarterCellStyle(review: GoalQuarterlyReview, activeQuarter: string) {
  if (review.reviewedAt || review.status === "achieved") {
    return {
      label: `${review.quarter} · Attested`,
      labelColor: "#10b981",
      textColor: "#475569",
      bg: undefined as string | undefined,
    };
  }
  if (review.quarter === activeQuarter) {
    return {
      label: `${review.quarter} · Active`,
      labelColor: "#0071ce",
      textColor: "#475569",
      bg: "#f0f7ff",
    };
  }
  return {
    label: `${review.quarter} · Upcoming`,
    labelColor: "#94a3b8",
    textColor: "#94a3b8",
    bg: undefined as string | undefined,
  };
}

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
      <div className={cn(CARD_SHELL, "p-6")}>
        <div className="mb-4 space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#0a1628]">
            <Target className="h-5 w-5 text-sp-magenta" />
            Create {year} development plan
          </h2>
          <p className="text-sm text-[#64748b]">
            Max 5 goals. Quarterly reviews are scheduled automatically (Q1–Q4).
          </p>
        </div>
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
            <button
              className={SP_OUTLINE_BTN}
              onClick={() =>
                setGoals([
                  ...goals,
                  { title: "", description: "", competencyId: "", evidenceType: "demo_recording" },
                ])
              }
              type="button"
            >
              Add goal
            </button>
          ) : null}
          <button className={cn(SP_BLUE_BTN, "w-full")} disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create plan & schedule reviews
          </button>
        </form>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={cn(CARD_SHELL, "p-6")}>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#0a1628]">No development plan for {year}</h2>
          <p className="text-sm text-[#64748b]">
            {viewerRole === "se"
              ? "Ask your manager to co-create your annual goals with quarterly checkpoints."
              : "Create a plan to set annual goals and auto-schedule Q1–Q4 reviews."}
          </p>
        </div>
        {viewerRole !== "se" ? (
          <button className={cn(SP_BLUE_BTN, "mt-4")} onClick={() => setShowCreate(true)} type="button">
            Create development plan
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
        {plan.goals.map((goal) => {
          const competency = competencies.find((item) => item.id === goal.competencyId);
          const isActive = goal.overallStatus === "on_track" || goal.overallStatus === "at_risk";
          const headerReviewTarget =
            goal.quarterlyReviews.find((review) => !review.reviewedAt && review.status !== "achieved") ?? goal.quarterlyReviews[0];

          return (
            <div
              className="overflow-hidden rounded-[13px] bg-white"
              key={goal.id}
              style={
                isActive
                  ? { border: "1.5px solid rgba(0,113,206,0.2)", boxShadow: "0 2px 12px rgba(0,113,206,0.07)" }
                  : { border: "1.5px solid #e2eaf5" }
              }
            >
              <div className="flex items-center justify-between border-b border-[#f1f5f9] p-[14px_18px_12px]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f2fc]">
                    <Target className="h-4 w-4 text-[#0071ce]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[13px] font-bold text-[#0a1628]">{goal.title}</p>
                      <NorthstarGoalStatusBadge status={goal.overallStatus} />
                    </div>
                    <p className="text-[10.5px] text-[#64748b]">
                      {competency
                        ? `Competency: ${competency.name} · FY${plan.year}`
                        : `${goal.evidenceType.replaceAll("_", " ")} · FY${plan.year}`}
                    </p>
                  </div>
                </div>
                <button
                  className={SP_OUTLINE_BTN}
                  disabled={!headerReviewTarget}
                  onClick={() => {
                    if (headerReviewTarget) setActiveReviewId(headerReviewTarget.id);
                  }}
                  type="button"
                >
                  Add evidence
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {goal.quarterlyReviews.map((review, index) => {
                  const cell = quarterCellStyle(review, quarter);
                  return (
                    <div
                      className={cn(
                        "border-[#f1f5f9] p-[11px_14px]",
                        index < goal.quarterlyReviews.length - 1 ? "border-r" : "",
                      )}
                      key={review.id}
                      style={{ background: cell.bg }}
                    >
                      <p
                        className="mb-1 text-[9.5px] font-bold tracking-[0.04em]"
                        style={{ color: cell.labelColor }}
                      >
                        {cell.label}
                      </p>
                      <p className="text-[11px] leading-[1.5]" style={{ color: cell.textColor }}>
                        {review.seEvidence?.trim() ||
                          review.managerComments?.trim() ||
                          (review.reviewedAt ? "Checkpoint complete." : `Due ${review.dueDate}`)}
                      </p>
                      <button
                        className="mt-2 text-[10.5px] font-semibold text-[#0071ce] hover:underline"
                        onClick={() => setActiveReviewId(review.id)}
                        type="button"
                      >
                        {review.reviewedAt ? "View" : "Add evidence"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {activeReviewId && goal.quarterlyReviews.some((review) => review.id === activeReviewId) ? (
                <div className="border-t border-[#f1f5f9] p-[10px_18px]">
                  <ReviewEditor
                    isManager={viewerRole !== "se"}
                    isSaving={isSaving}
                    onClose={() => setActiveReviewId("")}
                    onSave={(payload) =>
                      void updateReview(goal.quarterlyReviews.find((review) => review.id === activeReviewId)!, payload)
                    }
                    review={goal.quarterlyReviews.find((review) => review.id === activeReviewId)!}
                  />
                </div>
              ) : null}
            </div>
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
        <button
          className={SP_BLUE_BTN}
          disabled={isSaving}
          onClick={() =>
            onSave(
              isManager
                ? { managerComments, status }
                : { seEvidence, seEvidenceUrl, status: "on_track" },
            )
          }
          type="button"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save checkpoint
        </button>
        <button className={SP_OUTLINE_BTN} onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
