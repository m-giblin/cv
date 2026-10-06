"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { GoalStatusBadge } from "@/components/development/goal-status-badge";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CARD_CLS,
  FIELD_CLS,
  H2_CLS,
  LABEL_CLS,
  LINE_CARD_CLS,
  SELECT_CLS,
  TEXTAREA_CLS,
} from "@/components/se/form-classes";
import { currentQuarter } from "@/lib/development/plan-utils";
import { Competency, DevelopmentPlan, GoalQuarterlyReview, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type QuarterCellState = "attested" | "active" | "upcoming";

function quarterCellState(review: GoalQuarterlyReview, activeQuarter: string): QuarterCellState {
  if (review.reviewedAt || review.status === "achieved") {
    return "attested";
  }
  if (review.quarter === activeQuarter) {
    return "active";
  }
  return "upcoming";
}

const QUARTER_LABEL: Record<QuarterCellState, string> = {
  attested: "Attested",
  active: "Active",
  upcoming: "Upcoming",
};

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
  const fieldId = useId();
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
      <section aria-labelledby={`${fieldId}-create-heading`} className={cn(CARD_CLS, "p-6")}>
        <div className="mb-5">
          <h2 className={H2_CLS} id={`${fieldId}-create-heading`}>
            Create {year} development plan
          </h2>
          <p className="mt-1 text-sm text-muted">Max 5 goals. Quarterly reviews are scheduled automatically (Q1–Q4).</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={createPlan}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-assignee`}>
                Team member
              </label>
              <select
                className={SELECT_CLS}
                id={`${fieldId}-assignee`}
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
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-year`}>
                Plan year
              </label>
              <input
                className={cn(FIELD_CLS, "")}
                id={`${fieldId}-year`}
                onChange={(event) => setYear(Number(event.target.value))}
                type="number"
                value={year}
              />
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {goals.map((goal, index) => {
              const base = `${fieldId}-goal-${index}`;
              return (
                <li className={cn(LINE_CARD_CLS, "flex flex-col gap-3 p-4")} key={index}>
                  <p className="text-[15px] font-bold text-ink">Goal {index + 1}</p>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL_CLS} htmlFor={`${base}-title`}>
                      Title
                    </label>
                    <input
                      className={FIELD_CLS}
                      id={`${base}-title`}
                      onChange={(event) => {
                        const next = [...goals];
                        next[index] = { ...next[index], title: event.target.value };
                        setGoals(next);
                      }}
                      placeholder={`Goal ${index + 1} title`}
                      required
                      value={goal.title}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL_CLS} htmlFor={`${base}-description`}>
                      What does success look like?
                    </label>
                    <textarea
                      className={TEXTAREA_CLS}
                      id={`${base}-description`}
                      onChange={(event) => {
                        const next = [...goals];
                        next[index] = { ...next[index], description: event.target.value };
                        setGoals(next);
                      }}
                      rows={3}
                      value={goal.description}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className={LABEL_CLS} htmlFor={`${base}-competency`}>
                        Competency
                      </label>
                      <select
                        className={SELECT_CLS}
                        id={`${base}-competency`}
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
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LABEL_CLS} htmlFor={`${base}-evidence`}>
                        Evidence type
                      </label>
                      <select
                        className={SELECT_CLS}
                        id={`${base}-evidence`}
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
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={isSaving} type="submit">
              {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Create plan &amp; schedule reviews
            </button>
            {goals.length < 5 ? (
              <button
                className="btn-secondary"
                onClick={() =>
                  setGoals([...goals, { title: "", description: "", competencyId: "", evidenceType: "demo_recording" }])
                }
                type="button"
              >
                Add goal
              </button>
            ) : null}
          </div>
        </form>
      </section>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-strong p-7 text-center">
        <h2 className="text-base font-bold text-ink">No development plan for {year}</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          {viewerRole === "se"
            ? "Ask your manager to co-create your annual goals with quarterly checkpoints."
            : "Create a plan to set annual goals and auto-schedule Q1–Q4 reviews."}
        </p>
        {viewerRole !== "se" ? (
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)} type="button">
            Create development plan
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className={cn(LINE_CARD_CLS, "divide-y divide-divider overflow-hidden")}>
      {plan.goals.map((goal) => {
        const competency = competencies.find((item) => item.id === goal.competencyId);
        const headerReviewTarget =
          goal.quarterlyReviews.find((review) => !review.reviewedAt && review.status !== "achieved") ??
          goal.quarterlyReviews[0];
        const activeReview = goal.quarterlyReviews.find((review) => review.id === activeReviewId);

        return (
          <li key={goal.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-ink">{goal.title}</p>
                  <GoalStatusBadge status={goal.overallStatus} />
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {competency
                    ? `${competency.name}, FY${plan.year}`
                    : `${goal.evidenceType.replaceAll("_", " ")}, FY${plan.year}`}
                </p>
              </div>
              <button
                className="btn-secondary"
                disabled={!headerReviewTarget}
                onClick={() => {
                  if (headerReviewTarget) setActiveReviewId(headerReviewTarget.id);
                }}
                type="button"
              >
                Add evidence
              </button>
            </div>

            <ul
              aria-label={`${goal.title} quarterly reviews`}
              className="-mb-px -mr-px grid grid-cols-1 border-t border-divider sm:grid-cols-2 lg:grid-cols-4"
            >
              {goal.quarterlyReviews.map((review) => {
                const state = quarterCellState(review, quarter);
                return (
                  <li
                    aria-current={state === "active" ? "true" : undefined}
                    className={cn(
                      "border-b border-r border-divider px-4 py-3",
                      state === "active" && "bg-blue-soft",
                    )}
                    key={review.id}
                  >
                    <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                      {review.quarter}
                      <StatusPill tone={state === "attested" ? "success" : state === "active" ? "blue" : "neutral"}>
                        {QUARTER_LABEL[state]}
                      </StatusPill>
                    </p>
                    <p className={cn("mt-1 text-sm leading-[1.5]", state === "upcoming" ? "text-muted" : "text-ink-2")}>
                      {review.seEvidence?.trim() || review.managerComments?.trim() || (review.reviewedAt ? (
                        "Checkpoint complete."
                      ) : (
                        <>
                          Due {review.dueDate}
                        </>
                      ))}
                    </p>
                    <button
                      aria-expanded={activeReviewId === review.id}
                      className="link mt-2 text-sm"
                      onClick={() => setActiveReviewId(review.id)}
                      type="button"
                    >
                      {review.reviewedAt ? "View" : "Add evidence"}
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeReview ? (
              <div className="border-t border-divider px-5 py-4">
                <ReviewEditor
                  isManager={viewerRole !== "se"}
                  isSaving={isSaving}
                  onClose={() => setActiveReviewId("")}
                  onSave={(payload) => void updateReview(activeReview, payload)}
                  review={activeReview}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
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
  const fieldId = useId();
  const [seEvidence, setSeEvidence] = useState(review.seEvidence ?? "");
  const [seEvidenceUrl, setSeEvidenceUrl] = useState(review.seEvidenceUrl ?? "");
  const [managerComments, setManagerComments] = useState(review.managerComments ?? "");
  const [status, setStatus] = useState(review.status);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-bold text-ink">{review.quarter} checkpoint</p>
      {!isManager ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={`${fieldId}-evidence`}>
              Evidence and progress this quarter
            </label>
            <textarea
              className={TEXTAREA_CLS}
              id={`${fieldId}-evidence`}
              onChange={(event) => setSeEvidence(event.target.value)}
              rows={4}
              value={seEvidence}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={`${fieldId}-evidence-url`}>
              Evidence link (optional)
            </label>
            <input
              className={FIELD_CLS}
              id={`${fieldId}-evidence-url`}
              onChange={(event) => setSeEvidenceUrl(event.target.value)}
              placeholder="https://"
              type="url"
              value={seEvidenceUrl}
            />
          </div>
        </>
      ) : (
        <>
          {review.seEvidence ? (
            <div className="rounded-[10px] border border-line bg-surface-2 px-4 py-3">
              <p className="text-sm font-bold text-ink">SE evidence</p>
              <p className="mt-1 text-sm text-ink-2">{review.seEvidence}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={`${fieldId}-comments`}>
              Manager coaching comments
            </label>
            <textarea
              className={TEXTAREA_CLS}
              id={`${fieldId}-comments`}
              onChange={(event) => setManagerComments(event.target.value)}
              rows={4}
              value={managerComments}
            />
          </div>
          <div className="flex max-w-[260px] flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={`${fieldId}-status`}>
              Status
            </label>
            <select
              className={SELECT_CLS}
              id={`${fieldId}-status`}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              <option value="on_track">On track</option>
              <option value="at_risk">At risk</option>
              <option value="achieved">Achieved</option>
            </select>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          disabled={isSaving}
          onClick={() =>
            onSave(isManager ? { managerComments, status } : { seEvidence, seEvidenceUrl, status: "on_track" })
          }
          type="button"
        >
          {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          Save checkpoint
        </button>
        <button className="btn-secondary" onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
