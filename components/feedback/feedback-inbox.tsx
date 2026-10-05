"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { LINE_CARD_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { Tag } from "@/components/ui/tag";
import { DashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";

type FeedbackKind = "challenge" | "coaching";

type NudgeStatus = {
  canNudge: boolean;
  pendingDays?: number;
  nextNudgeAt?: string | null;
  reason?: string | null;
};

type FeedbackRow = {
 id: string;
 kind: FeedbackKind;
 title: string;
 grade: number | null;
 feedback: string | null;
 date: string | null;
 status: string;
};

type FeedbackFilter = "all" | "action" | "awaiting" | "reviewed";

type ListItem = FeedbackRow & { awaiting: boolean };

const REVISION_STATUSES = new Set(["needs_revision", "redo", "in_progress"]);
const APPROVED_STATUSES = new Set(["reviewed", "approved"]);

function statusLabel(status: string) {
 return status.replaceAll("_", " ");
}

/** Status tag: symbol + text so meaning never relies on colour alone. */
function statusTag(status: string, awaiting: boolean) {
 if (awaiting) return { tone: "blue" as const, text: "● Awaiting manager" };
 if (status === "needs_revision") return { tone: "danger" as const, text: "▲ Needs revision" };
 if (REVISION_STATUSES.has(status)) return { tone: "danger" as const, text: "▲ Redo requested" };
 if (APPROVED_STATUSES.has(status)) return { tone: "success" as const, text: `✓ ${statusLabel(status)}` };
 return { tone: "neutral" as const, text: `• ${statusLabel(status)}` };
}

/** Manager grades are out of 5; the v2 rule is danger <60%, warning 60–69%, blue ≥70%. */
function gradeTone(grade: number) {
 const pct = (grade / 5) * 100;
 if (pct < 60) return { rule: "bg-danger", text: "text-danger", label: "▲ Below bar" };
 if (pct < 70) return { rule: "bg-warning", text: "text-warning", label: "• Close" };
 return { rule: "bg-blue", text: "text-blue", label: "✓ At bar" };
}

const EMPTY_CLS =
 "rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

export function FeedbackInbox({ data }: { data: DashboardData }) {
 const userId = data.currentUser.id;
 const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
 const [nudgeStatus, setNudgeStatus] = useState<Record<string, NudgeStatus>>({});
 const [nudgingKey, setNudgingKey] = useState<string | null>(null);
 const [filter, setFilter] = useState<FeedbackFilter>("all");
 const [expanded, setExpanded] = useState<Set<string>>(new Set());

 const revisionSubmissions = data.submissions.filter(
 (submission) => submission.userId === userId && submission.status === "in_progress" && Boolean(submission.managerFeedback),
 );
 const revisionCards = data.coachingCards.filter(
 (card) => card.userId === userId && card.managerReviewStatus === "needs_revision",
 );

 const historyRows: FeedbackRow[] = useMemo(() => {
 const rows: FeedbackRow[] = [
 ...data.submissions
 .filter((submission) => submission.userId === userId && (submission.managerFeedback || submission.managerGrade !== null))
 .map((submission) => {
 const challenge = data.challenges.find((item) => item.id === submission.challengeId);
 return {
 id: submission.id,
 kind: "challenge" as const,
 title: challenge?.title ?? "Challenge submission",
 grade: submission.managerGrade,
 feedback: submission.managerFeedback,
 date: submission.reviewedAt ?? submission.submittedAt,
 status: submission.status === "in_progress" ? "redo" : submission.status,
 };
 }),
 ...data.coachingCards
 .filter(
 (card) =>
 card.userId === userId &&
 (card.managerComments || card.managerGrade !== null) &&
 card.managerReviewStatus !== "pending",
 )
 .map((card) => ({
 id: card.id,
 kind: "coaching" as const,
 title: card.simulationContext?.persona ?? "Simulation coaching card",
 grade: card.managerGrade,
 feedback: card.managerComments,
 date: card.reviewedAt,
 status: card.managerReviewStatus,
 })),
 ];
 return rows.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
 }, [data, userId]);

 const awaitingManagerRows: FeedbackRow[] = useMemo(() => {
 const rows: FeedbackRow[] = [
 ...data.submissions
 .filter(
 (submission) =>
 submission.userId === userId &&
 (submission.status === "submitted" || submission.status === "under_review"),
 )
 .map((submission) => {
 const challenge = data.challenges.find((item) => item.id === submission.challengeId);
 return {
 id: submission.id,
 kind: "challenge" as const,
 title: challenge?.title ?? "Challenge submission",
 grade: null,
 feedback: null,
 date: submission.submittedAt,
 status: "pending",
 };
 }),
 ...data.coachingCards
 .filter(
 (card) =>
 card.userId === userId && !card.isPractice && card.managerReviewStatus === "pending",
 )
 .map((card) => ({
 id: card.id,
 kind: "coaching" as const,
 title: card.simulationContext?.persona ?? "Simulation coaching card",
 grade: card.score,
 feedback: null,
 date: card.sentToManagerAt,
 status: "pending",
 })),
 ];
 return rows.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
 }, [data, userId]);

 useEffect(() => {
 if (awaitingManagerRows.length === 0) {
 setNudgeStatus({});
 return;
 }

 const items = awaitingManagerRows.map((row) => `${row.kind}:${row.id}`).join(",");
 void fetch(`/api/reviews/remind?items=${encodeURIComponent(items)}`, { credentials: "same-origin" })
 .then((res) => (res.ok ? res.json() : null))
 .then((json: { items?: Array<NudgeStatus & { kind: FeedbackKind; id: string }> } | null) => {
 if (!json?.items) return;
 const next: Record<string, NudgeStatus> = {};
 for (const item of json.items) {
 next[`${item.kind}-${item.id}`] = {
 canNudge: item.canNudge,
 pendingDays: item.pendingDays,
 nextNudgeAt: item.nextNudgeAt,
 reason: item.reason,
 };
 }
 setNudgeStatus(next);
 })
 .catch(() => undefined);
 }, [awaitingManagerRows]);

 const pendingRows = historyRows.filter(
 (row) =>
 (row.status === "redo" || row.status === "needs_revision" || row.status === "in_progress") &&
 !acknowledged.has(`${row.kind}-${row.id}`),
 );

 const now = new Date();
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
 const approvedThisMonth = historyRows.filter(
 (row) =>
 (row.status === "reviewed" || row.status === "approved") &&
 row.date &&
 new Date(row.date) >= monthStart,
 ).length;

 const grades = historyRows.map((row) => row.grade).filter((grade): grade is number => grade !== null && grade !== undefined);
 const avgGrade = grades.length
 ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1)
 : "—";

 function acknowledge(id: string, kind: FeedbackKind) {
 setAcknowledged((current) => new Set(current).add(`${kind}-${id}`));
 toast.success("Acknowledged");
 }

 async function nudgeManager(kind: FeedbackKind, id: string) {
 const key = `${kind}-${id}`;
 setNudgingKey(key);
 try {
 const res = await fetch("/api/reviews/remind", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 credentials: "same-origin",
 body: JSON.stringify({ kind, id }),
 });
 const json = (await res.json()) as {
 error?: string;
 eligibility?: NudgeStatus & { nextReminderAt?: string | null };
 };
 if (!res.ok) {
 if (json.eligibility) {
 setNudgeStatus((current) => ({
 ...current,
 [key]: {
 canNudge: false,
 pendingDays: json.eligibility?.pendingDays,
 nextNudgeAt: json.eligibility?.nextReminderAt ?? json.eligibility?.nextNudgeAt,
 reason: json.error ?? json.eligibility?.reason,
 },
 }));
 }
 throw new Error(json.error ?? "Could not send reminder");
 }
 toast.success("Reminder sent to your manager.");
 setNudgeStatus((current) => ({
 ...current,
 [key]: {
 canNudge: false,
 nextNudgeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
 reason: "Reminder sent — available again in 7 days",
 },
 }));
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "Could not nudge manager.");
 } finally {
 setNudgingKey(null);
 }
 }

 function ctaForRow(row: FeedbackRow) {
 if (row.status === "redo" || row.status === "in_progress") {
 return { label: "Resubmit challenge", href: "/practice/challenges?focus=challenge" };
 }
 if (row.status === "needs_revision") {
 return { label: "Re-run simulation", href: "/practice/simulations?focus=simulation" };
 }
 if (row.kind === "challenge") {
 return { label: "View plan step", href: "/my-plan" };
 }
 return { label: "View details", href: "/practice/simulations" };
 }

 const reviewedRows = historyRows.filter((row) => APPROVED_STATUSES.has(row.status));
 const redoCount = revisionSubmissions.length + revisionCards.length;

 const allItems: ListItem[] = [
 ...awaitingManagerRows.map((row) => ({ ...row, awaiting: true })),
 ...historyRows.map((row) => ({ ...row, awaiting: false })),
 ];
 const pendingKeys = new Set(pendingRows.map((row) => `${row.kind}-${row.id}`));

 const filters: Array<{ id: FeedbackFilter; label: string; count: number }> = [
 { id: "all", label: "All", count: allItems.length },
 { id: "action", label: "Needs action", count: pendingRows.length },
 { id: "awaiting", label: "Awaiting manager", count: awaitingManagerRows.length },
 { id: "reviewed", label: "Approved", count: reviewedRows.length },
 ];

 const visibleItems = allItems.filter((item) => {
 if (filter === "all") return true;
 if (filter === "awaiting") return item.awaiting;
 if (filter === "action") return !item.awaiting && pendingKeys.has(`${item.kind}-${item.id}`);
 return !item.awaiting && APPROVED_STATUSES.has(item.status);
 });

 function toggleExpanded(key: string) {
 setExpanded((current) => {
 const next = new Set(current);
 if (next.has(key)) next.delete(key);
 else next.add(key);
 return next;
 });
 }

 return (
 <div className="flex flex-col gap-6">
 <p className="text-[15px] leading-[1.5] text-ink-2">
 The evidence behind each score: manager grades and comments on your challenges and simulations.
 </p>

 <dl className={cn(LINE_CARD_CLS, "grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-[18px] sm:grid-cols-3 lg:grid-cols-5")}>
 {[
 { label: "Awaiting manager", value: String(awaitingManagerRows.length) },
 { label: "Needs action", value: String(pendingRows.length), danger: pendingRows.length > 0 },
 {
 label: "Redo requested",
 value: String(redoCount),
 danger: redoCount > 0,
 note: redoCount > 0 ? (revisionCards[0]?.simulationContext?.persona ?? "▲ Awaiting revision") : undefined,
 },
 { label: "Approved this month", value: String(approvedThisMonth) },
 { label: "Avg grade", value: avgGrade === "—" ? "—" : `${avgGrade}/5` },
 ].map((metric) => (
 <div key={metric.label}>
 <dt className="sr-only">{metric.label}</dt>
 <dd>
 <Stat
 label={metric.label}
 note={metric.note}
 tone={metric.danger ? "danger" : "blue"}
 value={metric.value}
 />
 </dd>
 </div>
 ))}
 </dl>

 <section aria-labelledby="feedback-list-heading" className="flex flex-col gap-3">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h2 className="text-lg font-extrabold text-ink" id="feedback-list-heading">
 Feedback
 </h2>
 <div aria-label="Filter feedback" className="flex flex-wrap gap-2" role="group">
 {filters.map((item) => (
 <Chip active={filter === item.id} key={item.id} onClick={() => setFilter(item.id)}>
 {item.label} · {item.count}
 </Chip>
 ))}
 </div>
 </div>
 <p className="sr-only" role="status">
 Showing {visibleItems.length} of {allItems.length} items
 </p>

 {allItems.length === 0 ? (
 <p className={EMPTY_CLS}>
 Submit a challenge or simulation — manager feedback will appear here after review.
 </p>
 ) : visibleItems.length === 0 ? (
 <p className={EMPTY_CLS}>Nothing in this view right now.</p>
 ) : (
 <ul className={cn(LINE_CARD_CLS, "divide-y divide-divider overflow-hidden")}>
 {visibleItems.map((row) => {
 const key = `${row.kind}-${row.id}`;
 const itemKey = `${row.awaiting ? "awaiting" : "hist"}-${key}`;
 const detailId = `feedback-detail-${itemKey}`;
 const isOpen = expanded.has(itemKey);
 const tag = statusTag(row.status, row.awaiting);
 const showGrade = !row.awaiting && row.grade !== null && row.grade !== undefined;
 const tone = showGrade ? gradeTone(row.grade as number) : null;
 const nudge = row.awaiting ? nudgeStatus[key] : undefined;
 const isNudging = nudgingKey === key;
 const needsAction = !row.awaiting && pendingKeys.has(key);
 const cta = ctaForRow(row);

 return (
 <li key={itemKey}>
 <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_96px_110px]">
 <button
 aria-controls={detailId}
 aria-expanded={isOpen}
 className="col-span-2 flex min-w-0 items-start gap-2 text-left sm:col-span-1"
 onClick={() => toggleExpanded(itemKey)}
 type="button"
 >
 <ChevronDown
 aria-hidden
 className={cn("mt-1 h-4 w-4 shrink-0 text-muted transition-transform", isOpen ? "rotate-180" : "")}
 />
 <span className="flex min-w-0 flex-col gap-1.5">
 <span className="text-[15px] font-semibold text-ink">{row.title}</span>
 <span className="flex flex-wrap items-center gap-1.5">
 <Tag>{row.kind === "challenge" ? "Challenge" : "Simulation"}</Tag>
 <Tag tone={tag.tone}>{tag.text}</Tag>
 </span>
 {row.feedback ? (
 <span className={cn("text-sm leading-[1.5] text-ink-2", isOpen ? "" : "line-clamp-2")}>
 &ldquo;{row.feedback}&rdquo;
 </span>
 ) : null}
 </span>
 </button>

 <div className="flex items-stretch gap-2.5 sm:justify-self-start">
 {tone ? (
 <>
 <span aria-hidden className={cn("w-[3px] rounded-full", tone.rule)} />
 <span className="flex flex-col">
 <span className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">
 {row.grade}
 <span className="text-sm font-bold text-muted">/5</span>
 </span>
 <span className={cn("mt-1 font-mono text-xs uppercase", tone.text)}>{tone.label}</span>
 </span>
 </>
 ) : (
 <span className="font-mono text-xs text-muted">
 <span aria-hidden>—</span>
 <span className="sr-only">No grade yet</span>
 </span>
 )}
 </div>

 <span className="justify-self-end whitespace-nowrap text-right font-mono text-xs uppercase text-muted">
 {row.date ? new Date(row.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
 </span>
 </div>

 <div
 className="border-t border-divider bg-bg px-5 py-4 sm:pl-11"
 hidden={!isOpen}
 id={detailId}
 >
 {row.awaiting ? (
 <div className="flex flex-col gap-3">
 <p className="text-sm text-ink-2">
 Submitted{" "}
 {row.date ? formatDistanceToNow(new Date(row.date), { addSuffix: true }) : "recently"} · waiting on
 your manager.
 </p>
 {nudge && !nudge.canNudge && nudge.reason ? (
 <p className="text-[13px] text-muted">{nudge.reason}</p>
 ) : null}
 <button
 className="btn-secondary inline-flex items-center gap-2 self-start disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted disabled:hover:bg-white"
 disabled={!nudge?.canNudge || isNudging}
 onClick={() => void nudgeManager(row.kind, row.id)}
 title={nudge?.canNudge ? "Send your manager a reminder email" : nudge?.reason ?? "Loading…"}
 type="button"
 >
 {isNudging ? (
 <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
 ) : (
 <Bell aria-hidden className="h-4 w-4" />
 )}
 Nudge manager
 </button>
 </div>
 ) : (
 <div className="flex flex-col gap-3">
 <p className="label-mono">
 Manager ·{" "}
 {row.date ? formatDistanceToNow(new Date(row.date), { addSuffix: true }) : "recently"}
 </p>
 {row.feedback ? null : (
 <p className="text-sm text-muted">No written comment — grade only.</p>
 )}
 <div className="flex flex-wrap items-center gap-4">
 <Link className="btn-secondary no-underline" href={cta.href}>
 {cta.label}
 </Link>
 {needsAction ? (
 <button className="link text-sm" onClick={() => acknowledge(row.id, row.kind)} type="button">
 Acknowledge
 </button>
 ) : null}
 </div>
 </div>
 )}
 </div>
 </li>
 );
 })}
 </ul>
 )}
 </section>
 </div>
 );
}
