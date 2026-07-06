"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import type { ReviewItem } from "@/components/manager/review-queue";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
import { ManagerOutlineBtn } from "@/components/manager/manager-ui-primitives";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MentorItem = {
  id: string;
  userId: string;
  topic: string;
  seNotes: string | null;
  seName?: string;
};

type PitchItem = {
  id: string;
  userId: string;
  title: string;
  personName: string;
  reflectionText: string | null;
  createdAt: string;
};

type InboxItem =
  | ({ inboxType: "submission" } & Extract<ReviewItem, { kind: "submission" }>)
  | ({ inboxType: "coaching" } & Extract<ReviewItem, { kind: "coaching" }>)
  | ({ inboxType: "plan_step" } & PlanStepReviewItem)
  | ({ inboxType: "mentor" } & MentorItem)
  | ({ inboxType: "cert" } & CertReviewItem)
  | ({ inboxType: "deal_prep" } & DealPrepReviewItem)
  | ({ inboxType: "pitch" } & PitchItem);

type Filter = "all" | "submission" | "coaching" | "plan_step" | "cert";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  submission: "Challenges",
  coaching: "Sim cards",
  plan_step: "Plan steps",
  cert: "Cert sign-offs",
};

const SPEC_FILTERS: Filter[] = ["all", "submission", "coaching", "plan_step", "cert"];

type InboxVisualConfig = {
  type: string;
  border: string;
  typeBg: string;
  typeColor: string;
  iconBg: string;
  iconColor: string;
  approveBg: string;
  approveColor: string;
  approveLabel: string;
  previewBg: string;
  previewBorder: string;
  urgColor: string;
};

function inboxVisualConfig(item: InboxItem): InboxVisualConfig {
  switch (item.inboxType) {
    case "submission":
      return {
        type: "Challenge",
        border: "2px solid rgba(124,58,237,0.15)",
        typeBg: "#ede9fe",
        typeColor: "#5b21b6",
        iconBg: "#ede9fe",
        iconColor: "#7c3aed",
        approveBg: "#dcfce7",
        approveColor: "#15803d",
        approveLabel: "Approve",
        previewBg: "#faf5ff",
        previewBorder: "rgba(124,58,237,0.1)",
        urgColor: "#d97706",
      };
    case "coaching":
      return {
        type: "Sim card",
        border: "1.5px solid #e2eaf5",
        typeBg: "#fdf0fa",
        typeColor: "#a51e8e",
        iconBg: "#fdf0fa",
        iconColor: "#cc27b0",
        approveBg: "#fee2e2",
        approveColor: "#dc2626",
        approveLabel: "Flag for redo",
        previewBg: "#fdf0fa",
        previewBorder: "#f1f5f9",
        urgColor: item.score < 70 ? "#ef4444" : "#64748b",
      };
    case "plan_step":
      return {
        type: "Plan step",
        border: "1.5px solid #e2eaf5",
        typeBg: "#dbeafe",
        typeColor: "#1d4ed8",
        iconBg: "#e8f2fc",
        iconColor: "#0071ce",
        approveBg: "#dcfce7",
        approveColor: "#15803d",
        approveLabel: "Validate",
        previewBg: "#f0f7ff",
        previewBorder: "#e2eaf5",
        urgColor: "#0071ce",
      };
    case "cert":
      return {
        type: "Cert gate",
        border: "1.5px solid rgba(16,185,129,0.2)",
        typeBg: "#dcfce7",
        typeColor: "#15803d",
        iconBg: "#dcfce7",
        iconColor: "#16a34a",
        approveBg: "#0071ce",
        approveColor: "white",
        approveLabel: "Sign off →",
        previewBg: "#f0fdf4",
        previewBorder: "rgba(16,185,129,0.15)",
        urgColor: "#16a34a",
      };
    default:
      return {
        type: "Review",
        border: "1.5px solid #e2eaf5",
        typeBg: "#f1f5f9",
        typeColor: "#475569",
        iconBg: "#f1f5f9",
        iconColor: "#64748b",
        approveBg: "#dcfce7",
        approveColor: "#15803d",
        approveLabel: "Approve",
        previewBg: "#f8fafd",
        previewBorder: "#e2eaf5",
        urgColor: "#64748b",
      };
  }
}

function InboxTypeIcon({ color }: { color: string }) {
  return (
    <svg fill="none" height="16" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 16 16" width="16">
      <path d="M2 4h12v9H2z" />
      <path d="M5 2h6v2H5z" />
    </svg>
  );
}

function buildInboxItems(
  reviewItems: ReviewItem[],
  planSteps: PlanStepReviewItem[],
  certItems: CertReviewItem[],
  dealPrepItems: DealPrepReviewItem[],
  pitchItems: PitchItem[],
  mentorItems: MentorItem[],
): InboxItem[] {
  return [
    ...reviewItems.map((item) =>
      item.kind === "submission"
        ? ({ inboxType: "submission" as const, ...item } as InboxItem)
        : ({ inboxType: "coaching" as const, ...item } as InboxItem),
    ),
    ...planSteps.map((item) => ({ inboxType: "plan_step" as const, ...item })),
    ...certItems.map((item) => ({ inboxType: "cert" as const, ...item })),
    ...dealPrepItems.map((item) => ({ inboxType: "deal_prep" as const, ...item })),
    ...pitchItems.map((item) => ({ inboxType: "pitch" as const, ...item })),
    ...mentorItems.map((item) => ({ inboxType: "mentor" as const, ...item })),
  ];
}

function inboxItemKey(item: InboxItem) {
  if (item.inboxType === "plan_step") return `plan-${item.assignmentStepId}`;
  if (item.inboxType === "mentor") return `mentor-${item.id}`;
  if (item.inboxType === "cert") return `cert-${item.id}`;
  if (item.inboxType === "deal_prep") return `prep-${item.id}`;
  if (item.inboxType === "pitch") return `pitch-${item.id}`;
  if (item.inboxType === "coaching") return `coaching-${item.id}`;
  return `submission-${item.id}`;
}

function itemTitle(item: InboxItem) {
  if (item.inboxType === "mentor") return item.topic;
  if (item.inboxType === "cert") return item.label;
  if (item.inboxType === "deal_prep") return `${item.accountName} · ${item.industry}`;
  if (item.inboxType === "pitch") return item.title;
  if (item.inboxType === "plan_step") return item.title;
  return item.title;
}

function itemSubtitle(item: InboxItem) {
  if (item.inboxType === "mentor") return item.seName ?? "SE";
  if (item.inboxType === "coaching") return `${item.personName} · Score ${item.score}`;
  if (item.inboxType === "plan_step") return `${item.personName} · ${item.stepType.replaceAll("_", " ")}`;
  if (item.inboxType === "cert") return item.personName;
  if (item.inboxType === "deal_prep") return item.personName;
  if (item.inboxType === "pitch") return item.personName;
  return item.personName;
}

function itemPreview(item: InboxItem) {
  if (item.inboxType === "coaching") {
    return item.managerSummary || item.strengths[0] || item.gaps[0] || "Simulation coaching card awaiting review.";
  }
  if (item.inboxType === "mentor" && item.seNotes) return item.seNotes;
  if (item.inboxType === "pitch" && item.reflectionText) return item.reflectionText;
  if (item.inboxType === "deal_prep") return `Deal prep shared by ${item.personName}`;
  return itemTitle(item);
}

function itemUrgency(item: InboxItem) {
  if (item.inboxType === "coaching" && item.score < 70) return "Below target";
  if (item.inboxType === "cert") return "Awaiting sign-off";
  return "Needs review";
}

export function ManagerActionInbox({
  reviewItems,
  planSteps,
  certItems = [],
  dealPrepItems = [],
}: {
  reviewItems: ReviewItem[];
  planSteps: PlanStepReviewItem[];
  certItems?: CertReviewItem[];
  dealPrepItems?: DealPrepReviewItem[];
}) {
  const router = useRouter();
  const [mentorItems, setMentorItems] = useState<MentorItem[]>([]);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [pitchItems, setPitchItems] = useState<PitchItem[]>([]);
  const [pitchLoading, setPitchLoading] = useState(true);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("4");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingDecision, setSavingDecision] = useState<"approve" | "reject" | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/mentor-reviews")
      .then((response) => response.json())
      .then((body: { requests: Array<MentorItem & { status: string }> }) => {
        setMentorItems(body.requests.filter((item) => item.status === "pending"));
      })
      .finally(() => setMentorLoading(false));
  }, []);

  useEffect(() => {
    void fetch("/api/pitch/submissions/pending")
      .then((response) => (response.ok ? response.json() : { pitches: [] }))
      .then((body: { pitches: PitchItem[] }) => setPitchItems(body.pitches ?? []))
      .finally(() => setPitchLoading(false));
  }, []);

  const allItems: InboxItem[] = useMemo(
    () =>
      buildInboxItems(reviewItems, planSteps, certItems, dealPrepItems, pitchItems, mentorItems).filter(
        (item) => !removedKeys.has(inboxItemKey(item)),
      ),
    [reviewItems, planSteps, certItems, dealPrepItems, pitchItems, mentorItems, removedKeys],
  );

  const counts = useMemo(
    () => ({
      all: allItems.length,
      submission: allItems.filter(
        (item) => item.inboxType === "submission" || item.inboxType === "mentor" || item.inboxType === "pitch",
      ).length,
      coaching: allItems.filter((item) => item.inboxType === "coaching").length,
      plan_step: allItems.filter((item) => item.inboxType === "plan_step").length,
      cert: allItems.filter((item) => item.inboxType === "cert").length,
    }),
    [allItems],
  );

  const visible = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "submission") {
      return item.inboxType === "submission" || item.inboxType === "mentor" || item.inboxType === "pitch";
    }
    if (filter === "coaching") {
      return item.inboxType === "coaching" || item.inboxType === "deal_prep";
    }
    return item.inboxType === filter;
  });

  function itemKey(item: InboxItem) {
    return inboxItemKey(item);
  }

  function removeItemFromLocalState(item: InboxItem) {
    setRemovedKeys((current) => new Set(current).add(itemKey(item)));
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
    } else if (item.inboxType === "cert") {
      response = await fetch(`/api/certifications/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision === "approve" ? "approved" : "revoked",
          managerNotes: feedback.trim(),
        }),
      });
    } else if (item.inboxType === "deal_prep") {
      response = await fetch(`/api/deal-prep/sessions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerComment: feedback.trim() }),
      });
    } else if (item.inboxType === "pitch") {
      response = await fetch(`/api/pitch/submissions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision === "approve" ? "reviewed" : "rejected",
          managerFeedback: feedback.trim(),
          managerGrade: decision === "approve" ? Number(grade) : undefined,
        }),
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

  return (
    <div>
      <div className="mb-[16px] flex flex-wrap gap-[8px]">
        {SPEC_FILTERS.map((key) => {
          if (key !== "all" && counts[key] === 0) return null;
          return (
            <button
              className="rounded-full px-[16px] py-[7px] text-[12px] font-semibold transition"
              key={key}
              onClick={() => setFilter(key)}
              style={
                filter === key
                  ? { background: "#00143a", color: "white", border: "1.5px solid #00143a" }
                  : { background: "white", color: "#64748b", border: "1.5px solid #e2eaf5" }
              }
              type="button"
            >
              {FILTER_LABELS[key]}
              {counts[key] > 0 ? ` (${counts[key]})` : ""}
            </button>
          );
        })}
      </div>

      {mentorLoading || pitchLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#e2eaf5] py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#10b981]" />
          <p className="mt-3 font-semibold text-[#0a1628]">Inbox clear</p>
          <p className="mt-1 text-[12.5px] text-[#64748b]">No items waiting in this filter.</p>
        </div>
      ) : (
        <div className={`space-y-[10px] max-h-[calc(100vh-14rem)] overflow-y-auto`}>
          {visible.map((item) => {
            const key = itemKey(item);
            const isOpen = activeKey === key;
            const isCoaching = item.inboxType === "coaching";
            const isSavingThis = savingKey === key;
            const visual = inboxVisualConfig(item);

            return (
              <div className="overflow-hidden rounded-[13px] bg-white" key={key} style={{ border: visual.border }}>
                <div className="flex items-start gap-[14px] p-[15px_18px]">
                  <div
                    className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[9px]"
                    style={{ background: visual.iconBg }}
                  >
                    <InboxTypeIcon color={visual.iconColor} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-[4px] flex items-center gap-[8px]">
                      <span
                        className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                        style={{ background: visual.typeBg, color: visual.typeColor }}
                      >
                        {visual.type}
                      </span>
                      <span className="text-[9.5px] font-semibold" style={{ color: visual.urgColor }}>
                        {itemUrgency(item)}
                      </span>
                    </div>
                    <p className="mb-[3px] font-display text-[13.5px] font-bold text-[#0a1628]">{itemTitle(item)}</p>
                    <p className="text-[11.5px] text-[#64748b]">{itemSubtitle(item)}</p>
                  </div>

                  <div className="flex shrink-0 gap-[7px]">
                    <ManagerOutlineBtn
                      onClick={() => {
                        setActiveKey(isOpen ? null : key);
                        setFeedback("");
                      }}
                    >
                      Give feedback
                    </ManagerOutlineBtn>
                    <button
                      className="inline-flex items-center rounded-md px-[10px] py-[5px] text-[11px] font-semibold"
                      onClick={() => {
                        setActiveKey(isOpen ? null : key);
                        setFeedback("");
                      }}
                      style={{ background: visual.approveBg, color: visual.approveColor }}
                      type="button"
                    >
                      {visual.approveLabel}
                    </button>
                  </div>
                </div>

                {!isOpen ? (
                  <div
                    className="border-t px-[18px] py-[10px] pb-[14px]"
                    style={{ background: visual.previewBg, borderColor: visual.previewBorder }}
                  >
                    <p className="text-[11px] italic leading-[1.6] text-[#475569]">&ldquo;{itemPreview(item)}&rdquo;</p>
                  </div>
                ) : null}

                {isOpen && item.inboxType === "mentor" && item.seNotes ? (
                  <p className="border-t border-[#f1f5f9] px-[18px] py-2 text-[11.5px] text-[#64748b]">{item.seNotes}</p>
                ) : null}

                {isOpen && isCoaching ? (
                  <div className="space-y-3 border-t border-[#f1f5f9] px-[18px] pb-3 pt-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]">Strengths</p>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-[#475569]">
                          {item.strengths.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]">Gaps</p>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-[#475569]">
                          {item.gaps.slice(0, 3).map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {item.transcript ? (
                      <div>
                        <button
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#0071ce]"
                          onClick={() => setExpandedTranscript(expandedTranscript === key ? null : key)}
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
                          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#f8fafd] p-2 text-[11px] leading-5 text-[#475569]">
                            {item.transcript}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isOpen ? (
                  <div className="space-y-3 border-t border-[#f1f5f9] px-[18px] pb-[14px] pt-3">
                    {isCoaching ? (
                      <ManagerCopilotDraft
                        gaps={item.gaps}
                        onDraft={setFeedback}
                        strengths={item.strengths}
                        transcript={item.transcript}
                      />
                    ) : item.inboxType === "submission" ? (
                      <ManagerCopilotDraft
                        context={`Challenge: ${item.title}\nSE: ${item.personName}`}
                        onDraft={setFeedback}
                      />
                    ) : item.inboxType === "cert" ? (
                      <ManagerCopilotDraft
                        context={`Certification: ${item.label}\nSE: ${item.personName}`}
                        onDraft={setFeedback}
                      />
                    ) : item.inboxType === "deal_prep" ? (
                      <ManagerCopilotDraft
                        context={`Deal prep for ${item.accountName} (${item.industry})`}
                        onDraft={setFeedback}
                      />
                    ) : item.inboxType === "pitch" ? (
                      <ManagerCopilotDraft
                        context={`Video pitch: ${item.title}\nSE: ${item.personName}\nReflection: ${item.reflectionText ?? "—"}`}
                        onDraft={setFeedback}
                      />
                    ) : null}
                    {item.inboxType === "pitch" ? (
                      <Link
                        className="text-[11px] font-semibold text-[#0071ce] hover:underline"
                        href={`/pitch?review=${item.id}`}
                        target="_blank"
                      >
                        Watch video pitch →
                      </Link>
                    ) : null}
                    <Textarea
                      className="border-[#e2eaf5] text-[12px]"
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Coaching feedback — what worked, what to improve…"
                      rows={3}
                      value={feedback}
                    />
                    {item.inboxType === "submission" || item.inboxType === "coaching" || item.inboxType === "pitch" ? (
                      <label className="block text-[11px] font-semibold text-[#64748b]">
                        Grade (1–5)
                        <Input
                          className="mt-1 max-w-[100px] border-[#e2eaf5]"
                          max={5}
                          min={1}
                          onChange={(e) => setGrade(e.target.value)}
                          type="number"
                          value={grade}
                        />
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-[7px]">
                      <button
                        className="inline-flex items-center gap-1 rounded-md px-[10px] py-[5px] text-[11px] font-semibold text-white disabled:opacity-60"
                        disabled={isSavingThis}
                        onClick={() => void submitReview(item, "approve")}
                        style={{ background: visual.approveBg, color: visual.approveColor }}
                        type="button"
                      >
                        {isSavingThis && savingDecision === "approve" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {visual.approveLabel}
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-[#fde68a] bg-[#fef3c7] px-[10px] py-[5px] text-[11px] font-semibold text-[#92400e] disabled:opacity-60"
                        disabled={isSavingThis}
                        onClick={() => void submitReview(item, "reject")}
                        type="button"
                      >
                        {isSavingThis && savingDecision === "reject" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Send back for revision
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
