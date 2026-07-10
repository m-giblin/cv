"use client";

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import type { ReviewItem } from "@/components/manager/review-queue";
import type { ReviewSignoffContext } from "@/lib/coaching/signoff-policy";
import { signoffTierForReview } from "@/lib/coaching/signoff-policy";
import {
  CoachingSignoffForm,
  isSignoffReady,
  ManagerCoachingBriefPanel,
  useCoachingSignoffState,
} from "@/components/manager/coaching-signoff-form";
import { SimulationCoachingReviewPanel } from "@/components/manager/simulation-coaching-review-panel";
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
 border: "1.5px solid #E2DFD9",
 typeBg: "#fdf0fa",
 typeColor: "#a51e8e",
 iconBg: "#fdf0fa",
 iconColor: "#cc27b0",
 approveBg: "#dcfce7",
 approveColor: "#15803d",
 approveLabel: "Sign off coaching",
 previewBg: "#fdf0fa",
 previewBorder: "#ECEAE6",
 urgColor: item.score < 70 ? "#ef4444" : "#6B6860",
 };
 case "plan_step":
 return {
 type: "Plan step",
 border: "1.5px solid #E2DFD9",
 typeBg: "#dbeafe",
 typeColor: "#1d4ed8",
 iconBg: "#e8f2fc",
 iconColor: "#0071ce",
 approveBg: "#dcfce7",
 approveColor: "#15803d",
 approveLabel: "Validate",
 previewBg: "#f0f7ff",
 previewBorder: "#E2DFD9",
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
 border: "1.5px solid #E2DFD9",
 typeBg: "#ECEAE6",
 typeColor: "#3D3C38",
 iconBg: "#ECEAE6",
 iconColor: "#6B6860",
 approveBg: "#dcfce7",
 approveColor: "#15803d",
 approveLabel: "Approve",
 previewBg: "#F9F8F6",
 previewBorder: "#E2DFD9",
 urgColor: "#6B6860",
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

function usesStructuredSignoff(item: InboxItem) {
 return item.inboxType !== "mentor";
}

function signoffContextForItem(item: InboxItem): ReviewSignoffContext {
 switch (item.inboxType) {
 case "coaching":
 return { reviewType: "coaching_card" };
 case "submission":
 return { reviewType: "challenge_submission" };
 case "plan_step":
 return { reviewType: "plan_step", isManagerGate: item.isManagerGate };
 case "cert":
 return { reviewType: "certification", isManagerGate: true };
 case "deal_prep":
 return { reviewType: "deal_prep" };
 case "pitch":
 return { reviewType: "pitch" };
 default:
 return { reviewType: "mentor_review" };
 }
}

function briefPayloadForItem(item: InboxItem) {
 const personName =
 item.inboxType === "plan_step"
 ? item.personName
 : item.inboxType === "cert"
 ? item.personName
 : item.inboxType === "deal_prep"
 ? item.personName
 : item.inboxType === "pitch"
 ? item.personName
 : item.inboxType === "submission"
 ? item.personName
 : item.inboxType === "coaching"
 ? item.personName
 : "Team member";

 return {
 reviewType: signoffContextForItem(item).reviewType,
 personName,
 title: itemTitle(item),
 strengths: item.inboxType === "coaching" ? item.strengths : undefined,
 gaps: item.inboxType === "coaching" ? item.gaps : undefined,
 managerSummary: item.inboxType === "coaching" ? item.managerSummary : undefined,
 recommendedImprovements:
 item.inboxType === "coaching" ? item.recommendedImprovements : undefined,
 isManagerGate:
 item.inboxType === "plan_step" ? item.isManagerGate : item.inboxType === "cert",
 context:
 item.inboxType === "submission"
 ? `Challenge submission for ${item.personName}`
 : item.inboxType === "plan_step"
 ? `Plan step: ${item.stepType}${item.mentorEndorsed ? " (mentor endorsed)" : ""}`
 : undefined,
 };
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
 return (
 item.managerSummary ||
 item.recommendedImprovements[0] ||
 item.strengths[0] ||
 item.gaps[0] ||
 "Simulation coaching card awaiting review."
 );
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
 const signoff = useCoachingSignoffState();

 useEffect(() => {
 if (!activeKey) return;
 signoff.setStrength("");
 signoff.setGap("");
 signoff.setNextAction("");
 signoff.setConfidence(null);
 signoff.setLiveAttestation(false);
 signoff.setAttestationNote("");
 signoff.setOpenedAt(new Date().toISOString());
 setFeedback("");
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeKey]);

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
 const structured = usesStructuredSignoff(item);
 const tier = signoffTierForReview(signoffContextForItem(item));

 if (structured) {
 if (!isSignoffReady(tier, signoff.value, decision)) {
 toast.error("Complete the coaching sign-off fields before submitting.");
 return;
 }
 } else if (feedback.trim().length < 3) {
 toast.error("Add feedback before submitting.");
 return;
 }

 const coachingSignoff = signoff.value;
 const key = itemKey(item);
 setSavingKey(key);
 setSavingDecision(decision);

 let response: Response;

 if (item.inboxType === "submission") {
 response = await fetch(`/api/reviews/submissions/${item.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 managerGrade: Number(grade),
 decision,
 coachingSignoff,
 }),
 });
 } else if (item.inboxType === "coaching") {
 response = await fetch(`/api/reviews/coaching-cards/${item.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 managerGrade: Number(grade),
 decision,
 coachingSignoff,
 }),
 });
 } else if (item.inboxType === "plan_step") {
 response = await fetch(`/api/plans/steps/${item.assignmentStepId}/review`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ decision, coachingSignoff }),
 });
 } else if (item.inboxType === "cert") {
 response = await fetch(`/api/certifications/${item.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 status: decision === "approve" ? "approved" : "revoked",
 coachingSignoff,
 }),
 });
 } else if (item.inboxType === "deal_prep") {
 response = await fetch(`/api/deal-prep/sessions/${item.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ managerComment: structured ? undefined : feedback.trim(), coachingSignoff }),
 });
 } else if (item.inboxType === "pitch") {
 response = await fetch(`/api/pitch/submissions/${item.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 status: decision === "approve" ? "reviewed" : "rejected",
 managerGrade: decision === "approve" ? Number(grade) : undefined,
 coachingSignoff,
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
 const body = (await response.json().catch(() => null)) as { error?: string } | null;
 toast.error(body?.error ?? "Review failed.");
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
 className="font-mono text-[8px] uppercase tracking-[0.08em] px-[16px] py-[7px] text-[12px] font-semibold transition"
 key={key}
 onClick={() => setFilter(key)}
 style={
 filter === key
 ? { background: "#00143a", color: "white", border: "1.5px solid #00143a" }
 : { background: "white", color: "#6B6860", border: "1.5px solid #E2DFD9" }
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
 <div className="border border-[#E2DFD9] py-12 text-center">
 <CheckCircle2 className="mx-auto h-10 w-10 text-[#10b981]" />
 <p className="mt-3 font-semibold text-[#0D0E12]">Inbox clear</p>
 <p className="mt-1 text-[12.5px] text-[#6B6860]">No items waiting in this filter.</p>
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
 <div className="overflow-hidden bg-white" key={key} style={{ border: visual.border }}>
 <div className="flex items-start gap-[14px] p-[15px_18px]">
 <div
 className="flex h-[36px] w-[36px] shrink-0 items-center justify-center "
 style={{ background: visual.iconBg }}
 >
 <InboxTypeIcon color={visual.iconColor} />
 </div>

 <div className="min-w-0 flex-1">
 <div className="mb-[4px] flex items-center gap-[8px]">
 <span
 className="font-mono text-[8px] uppercase tracking-[0.08em] px-[8px] py-[2px] text-[9.5px] font-bold"
 style={{ background: visual.typeBg, color: visual.typeColor }}
 >
 {visual.type}
 </span>
 <span className="text-[9.5px] font-semibold" style={{ color: visual.urgColor }}>
 {itemUrgency(item)}
 </span>
 </div>
 <p className="mb-[3px] font-display text-[13.5px] font-bold text-[#0D0E12]">{itemTitle(item)}</p>
 <p className="text-[11.5px] text-[#6B6860]">{itemSubtitle(item)}</p>
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
 className="inline-flex items-center px-[10px] py-[5px] text-[11px] font-semibold"
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
 <p className="text-[11px] italic leading-[1.6] text-[#3D3C38]">&ldquo;{itemPreview(item)}&rdquo;</p>
 </div>
 ) : null}

 {isOpen && item.inboxType === "mentor" && item.seNotes ? (
 <p className="border-t border-[#ECEAE6] px-[18px] py-2 text-[11.5px] text-[#6B6860]">{item.seNotes}</p>
 ) : null}

 {isOpen && isCoaching ? (
 <SimulationCoachingReviewPanel
 item={{
 score: item.score,
 title: item.title,
 personName: item.personName,
 strengths: item.strengths,
 gaps: item.gaps,
 recommendedImprovements: item.recommendedImprovements,
 managerSummary: item.managerSummary,
 seReflection: item.seReflection,
 simulationLabel: item.simulationLabel,
 transcript: item.transcript,
 }}
 onAppendMoment={(moment) => {
 const current = signoff.value.nextAction;
 signoff.setNextAction(current.trim() ? `${current.trim()}\n\n• ${moment}` : moment);
 }}
 onDraft={(text) => {
 signoff.setNextAction(text);
 }}
 />
 ) : null}

 {isOpen ? (
 <div className="space-y-3 border-t border-[#ECEAE6] px-[18px] pb-[14px] pt-3">
 {usesStructuredSignoff(item) ? (
 <>
 <ManagerCoachingBriefPanel
 onBrief={signoff.applyBrief}
 payload={briefPayloadForItem(item)}
 />
 <CoachingSignoffForm
 decision="approve"
 onAttestationNoteChange={signoff.setAttestationNote}
 onConfidenceChange={signoff.setConfidence}
 onGapChange={signoff.setGap}
 onLiveAttestationChange={signoff.setLiveAttestation}
 onNextActionChange={signoff.setNextAction}
 onStrengthChange={signoff.setStrength}
 signoff={signoff.value}
 tier={signoffTierForReview(signoffContextForItem(item))}
 />
 </>
 ) : (
 <>
 <Textarea
 className="border-[#E2DFD9] text-[12px]"
 onChange={(e) => setFeedback(e.target.value)}
 placeholder="Coaching feedback — what worked, what to improve…"
 rows={3}
 value={feedback}
 />
 </>
 )}
 {item.inboxType === "pitch" ? (
 <Link
 className="text-[11px] font-semibold text-[#0071ce] hover:underline"
 href={`/pitch?review=${item.id}`}
 target="_blank"
 >
 Watch video pitch →
 </Link>
 ) : null}
 {item.inboxType === "submission" || item.inboxType === "coaching" || item.inboxType === "pitch" ? (
 <label className="block text-[11px] font-semibold text-[#6B6860]">
 Grade (1–5)
 <Input
 className="mt-1 max-w-[100px] border-[#E2DFD9]"
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
 className="inline-flex items-center gap-1 px-[10px] py-[5px] text-[11px] font-semibold text-white disabled:opacity-60"
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
 className="inline-flex items-center gap-1 border border-[#fde68a] bg-[#fef3c7] px-[10px] py-[5px] text-[11px] font-semibold text-[#92400e] disabled:opacity-60"
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
