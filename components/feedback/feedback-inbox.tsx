"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, Zap } from "lucide-react";
import { toast } from "sonner";
import { HandoffMetricStrip } from "@/components/dashboard/handoff-section-page";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { DashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type FeedbackKind = "challenge" | "coaching";

type FeedbackRow = {
 id: string;
 kind: FeedbackKind;
 title: string;
 grade: number | null;
 feedback: string | null;
 date: string | null;
 status: string;
};

function borderByStatus(status: string) {
 if (status === "needs_revision" || status === "redo" || status === "in_progress") {
 return "2px solid rgba(239,68,68,0.2)";
 }
 if (status === "reviewed" || status === "approved") {
 return "1.5px solid rgba(16,185,129,0.2)";
 }
 return "1.5px solid rgba(204,39,176,0.15)";
}

function statusBadgeClass(status: string) {
 if (status === "needs_revision" || status === "redo" || status === "in_progress") {
 return "bg-[#fee2e2] text-[#dc2626]";
 }
 if (status === "reviewed" || status === "approved") {
 return "bg-[#dcfce7] text-[#15803d]";
 }
 return "bg-[#fef3c7] text-[#b45309]";
}

function commentPanelClass(status: string) {
 if (status === "needs_revision" || status === "redo" || status === "in_progress") {
 return "border-red-100 bg-[#fef2f2]";
 }
 if (status === "reviewed" || status === "approved") {
 return "border-[#ECEAE6] bg-[#F9F8F6]";
 }
 return "border-[#f5d0fe] bg-[#fdf4ff]";
}

function statusLabel(status: string) {
 return status.replaceAll("_", " ");
}

export function FeedbackInbox({ data }: { data: DashboardData }) {
 const userId = data.currentUser.id;
 const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

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

 function ctaForRow(row: FeedbackRow) {
 if (row.status === "redo" || row.status === "in_progress") {
 return { label: "Resubmit challenge", href: "/challenges?focus=challenge" };
 }
 if (row.status === "needs_revision") {
 return { label: "Re-run simulation", href: "/simulations?focus=simulation" };
 }
 if (row.kind === "challenge") {
 return { label: "View plan step", href: "/my-plan" };
 }
 return { label: "View details", href: "/simulations" };
 }

 const CARD = "overflow-hidden border border-[#E2DFD9] bg-white ";

 return (
 <div className="animate-[fadeUp_0.2s_ease-out] space-y-5">
 <HandoffMetricStrip
 metrics={[
 {
 label: "Awaiting manager",
 value: String(awaitingManagerRows.length),
 sub: "Submitted for review",
 accent: "#0071ce",
 },
 {
 label: "Unread feedback",
 value: String(pendingRows.length),
 sub: "Needs your attention",
 accent: "#cc27b0",
 },
 {
 label: "Redo requested",
 value: String(revisionSubmissions.length + revisionCards.length),
 sub: revisionCards[0]?.simulationContext?.persona ?? "Awaiting revision",
 accent: "#f59e0b",
 valueClassName:
 revisionSubmissions.length + revisionCards.length > 0 ? "text-[#f59e0b]" : undefined,
 },
 {
 label: "Approved this month",
 value: String(approvedThisMonth),
 sub: "Reviewed work",
 accent: "#10b981",
 },
 {
 label: "Avg grade",
 value: avgGrade === "—" ? "—" : `${avgGrade}/5`,
 sub: "Across all reviewed work",
 accent: "#0071ce",
 },
 ]}
 />

 {awaitingManagerRows.length > 0 ? (
 <section>
 <h2 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-[#0D0E12]">
 Awaiting manager review
 <span className="rounded-full bg-[#0071ce] px-2 py-0.5 text-[9.5px] font-bold text-white">
 {awaitingManagerRows.length}
 </span>
 </h2>
 <div className="space-y-2.5">
 {awaitingManagerRows.map((row) => {
 const Icon = row.kind === "challenge" ? Zap : Bot;
 return (
 <div className={CARD} key={`awaiting-${row.kind}-${row.id}`} style={{ border: "1.5px solid rgba(0,113,206,0.15)" }}>
 <div className="flex items-start gap-3 p-[14px_18px]">
 <div
 className={cn(
 "flex h-9 w-9 shrink-0 items-center justify-center ",
 row.kind === "challenge" ? "bg-[#e8f2fc] text-[#0071ce]" : "bg-[#fdf0fa] text-[#cc27b0]",
 )}
 >
 <Icon className="h-4 w-4" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-[12.5px] font-bold text-[#0D0E12]">{row.title}</p>
 <p className="mt-0.5 text-[11px] text-[#6B6860]">
 Submitted {row.date ? formatDistanceToNow(new Date(row.date), { addSuffix: true }) : "recently"} ·
 waiting on your manager
 </p>
 </div>
 <span className="shrink-0 rounded-full bg-[#dbeafe] px-2 py-0.5 text-[9.5px] font-bold text-[#1d4ed8]">
 Pending
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </section>
 ) : null}

 {pendingRows.length > 0 ? (
 <section>
 <h2 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-[#0D0E12]">
 Pending review
 <span className="rounded-full bg-[#cc27b0] px-2 py-0.5 text-[9.5px] font-bold text-white">
 {pendingRows.length}
 </span>
 </h2>
 <div className="space-y-2.5">
 {pendingRows.map((row) => {
 const cta = ctaForRow(row);
 const Icon = row.kind === "challenge" ? Zap : Bot;
 return (
 <div className={CARD} key={`pending-${row.kind}-${row.id}`} style={{ border: borderByStatus(row.status) }}>
 <div className="flex items-start gap-3 p-[14px_18px]">
 <div
 className={cn(
 "flex h-9 w-9 shrink-0 items-center justify-center ",
 row.kind === "challenge" ? "bg-[#e8f2fc] text-[#0071ce]" : "bg-[#fdf0fa] text-[#cc27b0]",
 )}
 >
 <Icon className="h-4 w-4" />
 </div>
 <div className="min-w-0 flex-1">
 <div className="mb-1 flex flex-wrap items-center gap-1.5">
 <span
 className={cn(
 "rounded-full px-2 py-0.5 text-[9.5px] font-bold",
 row.kind === "challenge"
 ? "bg-[#e8f2fc] text-[#0057a8]"
 : "bg-[#fdf0fa] text-[#a51e8e]",
 )}
 >
 {row.kind === "challenge" ? "Challenge" : "Simulation"}
 </span>
 <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold capitalize", statusBadgeClass(row.status))}>
 {statusLabel(row.status)}
 </span>
 {row.grade !== null ? (
 <span className="font-display text-[13px] font-extrabold text-[#0D0E12]">
 {row.grade}/5
 </span>
 ) : null}
 </div>
 <p className="text-[13px] font-bold text-[#0D0E12]">{row.title}</p>
 <p className="text-[11px] text-[#A09D98]">
 Manager ·{" "}
 {row.date
 ? formatDistanceToNow(new Date(row.date), { addSuffix: true })
 : "Recently"}
 </p>
 </div>
 </div>
 {row.feedback ? (
 <div className={cn("border-t px-[18px] py-3", commentPanelClass(row.status))}>
 <p className="text-[12px] italic leading-relaxed text-[#374151]">
 &ldquo;{row.feedback}&rdquo;
 </p>
 <div className="mt-2.5 flex flex-wrap gap-2">
 <Link className={SP_BLUE_BTN} href={cta.href}>
 {cta.label}
 </Link>
 <button
 className={SP_OUTLINE_BTN}
 onClick={() => acknowledge(row.id, row.kind)}
 type="button"
 >
 Acknowledge
 </button>
 </div>
 </div>
 ) : null}
 </div>
 );
 })}
 </div>
 </section>
 ) : null}

 <section>
 <h2 className="mb-3 font-display text-[13.5px] font-bold text-[#0D0E12]">Feedback history</h2>
 {historyRows.length === 0 ? (
 <div className={CARD}>
 <p className="px-5 py-8 text-center text-sm text-[#A09D98]">
 Submit a challenge or simulation — manager feedback will appear here after review.
 </p>
 </div>
 ) : (
 <div className={cn(CARD, "overflow-hidden")}>
 <div
 className="grid gap-0 border-b border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[9px]"
 style={{ gridTemplateColumns: "1fr 100px 100px 60px 100px" }}
 >
 {["Item", "Type", "Status", "Grade", "Reviewed"].map((header) => (
 <span
 className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]"
 key={header}
 >
 {header}
 </span>
 ))}
 </div>
 {historyRows.map((row) => (
 <div
 className="grid gap-0 border-b border-[#f9fafb] px-[18px] py-[10px] last:border-b-0"
 key={`hist-${row.kind}-${row.id}`}
 style={{ gridTemplateColumns: "1fr 100px 100px 60px 100px" }}
 >
 <p className="truncate pr-2 text-[12px] font-semibold text-[#3D3C38]">{row.title}</p>
 <div className="flex items-center">
 <span
 className={cn(
 "rounded-full px-2 py-0.5 text-[9.5px] font-bold",
 row.kind === "challenge"
 ? "bg-[#e8f2fc] text-[#0057a8]"
 : "bg-[#fdf0fa] text-[#a51e8e]",
 )}
 >
 {row.kind === "challenge" ? "Challenge" : "Simulation"}
 </span>
 </div>
 <div className="flex items-center">
 <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold capitalize", statusBadgeClass(row.status))}>
 {statusLabel(row.status)}
 </span>
 </div>
 <div className="flex items-center">
 <span className="font-display text-[13px] font-extrabold text-[#0D0E12]">
 {row.grade !== null ? `${row.grade}/5` : "—"}
 </span>
 </div>
 <div className="flex items-center">
 <span className="text-[11.5px] text-[#A09D98]">
 {row.date ? new Date(row.date).toLocaleDateString() : "—"}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </section>
 </div>
 );
}
