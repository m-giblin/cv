"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MentorItem = {
  id: string;
  userId: string;
  topic: string;
  seNotes: string | null;
  seName?: string;
};

type InboxItem =
  | ({ inboxType: "submission" } & Extract<ReviewItem, { kind: "submission" }>)
  | ({ inboxType: "coaching" } & Extract<ReviewItem, { kind: "coaching" }>)
  | ({ inboxType: "plan_step" } & PlanStepReviewItem)
  | ({ inboxType: "mentor" } & MentorItem);

type Filter = "all" | "submission" | "coaching" | "plan_step" | "mentor";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  submission: "Challenges",
  coaching: "Simulations",
  plan_step: "Plan steps",
  mentor: "Mentor",
};

export function ManagerActionInbox({
  reviewItems,
  planSteps,
}: {
  reviewItems: ReviewItem[];
  planSteps: PlanStepReviewItem[];
}) {
  const router = useRouter();
  const [mentorItems, setMentorItems] = useState<MentorItem[]>([]);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [localReviewItems, setLocalReviewItems] = useState(reviewItems);
  const [localPlanSteps, setLocalPlanSteps] = useState(planSteps);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("4");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingDecision, setSavingDecision] = useState<"approve" | "reject" | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  useEffect(() => {
    setLocalReviewItems(reviewItems);
  }, [reviewItems]);

  useEffect(() => {
    setLocalPlanSteps(planSteps);
  }, [planSteps]);

  useEffect(() => {
    void fetch("/api/mentor-reviews")
      .then((response) => response.json())
      .then((body: { requests: Array<MentorItem & { status: string }> }) => {
        setMentorItems(body.requests.filter((item) => item.status === "pending"));
      })
      .finally(() => setMentorLoading(false));
  }, []);

  const allItems: InboxItem[] = useMemo(
    () => [
      ...localReviewItems.map((item) =>
        item.kind === "submission"
          ? ({ inboxType: "submission" as const, ...item } as InboxItem)
          : ({ inboxType: "coaching" as const, ...item } as InboxItem),
      ),
      ...localPlanSteps.map((item) => ({ inboxType: "plan_step" as const, ...item })),
      ...mentorItems.map((item) => ({ inboxType: "mentor" as const, ...item })),
    ],
    [localReviewItems, localPlanSteps, mentorItems],
  );

  const counts = useMemo(
    () => ({
      all: allItems.length,
      submission: localReviewItems.filter((item) => item.kind === "submission").length,
      coaching: localReviewItems.filter((item) => item.kind === "coaching").length,
      plan_step: localPlanSteps.length,
      mentor: mentorItems.length,
    }),
    [allItems.length, localPlanSteps.length, localReviewItems, mentorItems.length],
  );

  const visible = allItems.filter((item) => filter === "all" || item.inboxType === filter);

  function itemKey(item: InboxItem) {
    if (item.inboxType === "plan_step") return `plan-${item.assignmentStepId}`;
    if (item.inboxType === "mentor") return `mentor-${item.id}`;
    if (item.inboxType === "coaching") return `coaching-${item.id}`;
    return `submission-${item.id}`;
  }

  function removeItemFromLocalState(item: InboxItem) {
    if (item.inboxType === "plan_step") {
      setLocalPlanSteps((current) =>
        current.filter((step) => step.assignmentStepId !== item.assignmentStepId),
      );
    } else if (item.inboxType === "mentor") {
      setMentorItems((current) => current.filter((request) => request.id !== item.id));
    } else if (item.inboxType === "coaching") {
      setLocalReviewItems((current) =>
        current.filter((entry) => !(entry.kind === "coaching" && entry.id === item.id)),
      );
    } else {
      setLocalReviewItems((current) =>
        current.filter((entry) => !(entry.kind === "submission" && entry.id === item.id)),
      );
    }
  }

  async function submitReview(item: InboxItem, decision: "approve" | "reject") {
    if (feedback.trim().length < 3) {
      toast.error("Add feedback before submitting.");
      return;
    }

    const key = itemKey(item);
    setSavingKey(key);
    setSavingDecision(decision);

    let response: Response;

    if (item.inboxType === "submission") {
      response = await fetch(`/api/reviews/submissions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerFeedback: feedback,
          managerGrade: Number(grade),
          decision,
        }),
      });
    } else if (item.inboxType === "coaching") {
      response = await fetch(`/api/reviews/coaching-cards/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerComments: feedback,
          managerGrade: Number(grade),
          decision,
        }),
      });
    } else if (item.inboxType === "plan_step") {
      response = await fetch(`/api/plans/steps/${item.assignmentStepId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, feedback: feedback.trim() }),
      });
    } else {
      response = await fetch("/api/mentor-reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, mentorFeedback: feedback, decision }),
      });
    }

    setSavingKey(null);
    setSavingDecision(null);

    if (!response.ok) {
      toast.error("Review failed.");
      return;
    }

    removeItemFromLocalState(item);
    setActiveKey(null);
    setFeedback("");
    toast.success(
      decision === "approve"
        ? "Approved — removed from your inbox."
        : "Sent back for revision — SE notified to redo.",
    );
    router.refresh();
  }

  function typeLabel(item: InboxItem) {
    switch (item.inboxType) {
      case "submission":
        return "Challenge";
      case "coaching":
        return "Simulation";
      case "plan_step":
        return "Plan step";
      case "mentor":
        return "Mentor";
    }
  }

  return (
    <Card className="border-sp-magenta/15">
      <CardHeader className="pb-3">
        <CardTitle>Action inbox</CardTitle>
        <CardDescription>
          Validate SE work — approve or send back for revision. Completed reviews move to history below.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === key
                  ? "bg-sp-magenta text-white"
                  : "bg-sp-blue-soft/50 text-sp-navy-muted hover:bg-sp-blue-soft"
              }`}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              {FILTER_LABELS[key]}
              {counts[key] > 0 ? ` (${counts[key]})` : ""}
            </button>
          ))}
        </div>
      </CardHeader>

      {mentorLoading && filter === "mentor" ? (
        <div className="flex justify-center border-t border-sp-blue/10 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
        </div>
      ) : visible.length === 0 ? (
        <div className="border-t border-sp-blue/10 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <p className="mt-3 font-semibold text-sp-navy">Inbox clear</p>
          <p className="mt-1 text-sm text-sp-navy-muted">No items waiting in this filter.</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto border-t border-sp-blue/10 p-4">
          {visible.map((item) => {
            const key = itemKey(item);
            const isOpen = activeKey === key;
            const isCoaching = item.inboxType === "coaching";
            const isSavingThis = savingKey === key;
            const personName =
              item.inboxType === "mentor" ? (item.seName ?? "SE") : item.personName;
            const title = item.inboxType === "mentor" ? item.topic : item.title;

            return (
              <div
                className={`rounded-xl border transition ${isOpen ? "border-sp-magenta/30 bg-white shadow-sm" : "border-sp-blue/10 bg-sp-blue-soft/10"}`}
                key={key}
              >
                <div className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.inboxType === "coaching" ? "magenta" : "amber"}>
                        {typeLabel(item)}
                      </Badge>
                      {isCoaching ? (
                        <span className="text-xs font-bold text-sp-navy">Score {item.score}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-bold text-sp-navy">{personName}</p>
                    <p className="truncate text-sm text-sp-navy-muted">{title}</p>
                  </div>
                  <Button
                    onClick={() => {
                      setActiveKey(isOpen ? null : key);
                      setFeedback("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {isOpen ? "Close" : "Review"}
                  </Button>
                </div>

                {isOpen && item.inboxType === "mentor" && item.seNotes ? (
                  <p className="border-t border-sp-blue/10 px-3 py-2 text-sm text-sp-navy-muted">
                    {item.seNotes}
                  </p>
                ) : null}

                {isOpen && isCoaching ? (
                  <div className="space-y-3 border-t border-sp-blue/10 px-3 pb-3 pt-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-sp-navy">Strengths</p>
                        <ul className="mt-1 list-disc pl-4 text-xs text-sp-navy-muted">
                          {item.strengths.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-sp-navy">Gaps</p>
                        <ul className="mt-1 list-disc pl-4 text-xs text-sp-navy-muted">
                          {item.gaps.slice(0, 3).map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {item.transcript ? (
                      <div>
                        <button
                          className="flex items-center gap-1 text-xs font-semibold text-sp-blue"
                          onClick={() =>
                            setExpandedTranscript(expandedTranscript === key ? null : key)
                          }
                          type="button"
                        >
                          {expandedTranscript === key ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          Transcript
                        </button>
                        {expandedTranscript === key ? (
                          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] leading-5 text-slate-600">
                            {item.transcript}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isOpen ? (
                  <div className="space-y-3 border-t border-sp-blue/10 px-3 pb-3 pt-2">
                    <Textarea
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Coaching feedback — what worked, what to improve…"
                      rows={3}
                      value={feedback}
                    />
                    {item.inboxType === "submission" || item.inboxType === "coaching" ? (
                      <label className="block text-xs font-semibold text-sp-navy-muted">
                        Grade (1–5)
                        <Input
                          className="mt-1 max-w-[100px]"
                          max={5}
                          min={1}
                          onChange={(e) => setGrade(e.target.value)}
                          type="number"
                          value={grade}
                        />
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isSavingThis}
                        onClick={() => void submitReview(item, "approve")}
                        size="sm"
                        variant="default"
                      >
                        {isSavingThis && savingDecision === "approve" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve & complete
                      </Button>
                      <Button
                        className="border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100"
                        disabled={isSavingThis}
                        onClick={() => void submitReview(item, "reject")}
                        size="sm"
                        variant="outline"
                      >
                        {isSavingThis && savingDecision === "reject" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Send back for revision
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
