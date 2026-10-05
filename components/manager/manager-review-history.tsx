import { formatDistanceToNow } from "date-fns";
import { Tag } from "@/components/ui/tag";
import type { ActivityLog, CoachingCard, Profile } from "@/lib/types";

export type ReviewHistoryEntry = {
 id: string;
 personName: string;
 title: string;
 type: "simulation" | "challenge" | "plan_step";
 decision: "approved" | "needs_revision";
 reviewedAt: string;
 feedbackPreview?: string;
};

const TYPE_LABEL: Record<ReviewHistoryEntry["type"], string> = {
 simulation: "Sim card",
 challenge: "Challenge",
 plan_step: "Plan step",
};

export function buildReviewHistory(
 coachingCards: CoachingCard[],
 orgIds: Set<string>,
 profiles: Profile[],
 activity: ActivityLog[],
 limit = 12,
): ReviewHistoryEntry[] {
 const fromCards: ReviewHistoryEntry[] = coachingCards
 .filter(
 (card) =>
 orgIds.has(card.userId) &&
 (card.managerReviewStatus === "reviewed" || card.managerReviewStatus === "needs_revision"),
 )
 .map((card) => {
 const person = profiles.find((profile) => profile.id === card.userId);
 return {
 id: card.id,
 personName: person?.fullName ?? "Team member",
 title: card.simulationContext?.persona ?? "Simulation",
 type: "simulation" as const,
 decision:
 card.managerReviewStatus === "reviewed" ? ("approved" as const) : ("needs_revision" as const),
 reviewedAt: card.reviewedAt ?? card.sentToManagerAt,
 feedbackPreview: card.managerComments ?? undefined,
 };
 });

 const fromActivity: ReviewHistoryEntry[] = activity
 .filter(
 (item) =>
 orgIds.has(item.userId) &&
 (item.eventType === "manager_feedback_received" || item.eventType === "coaching_card_reviewed"),
 )
 .map((item) => {
 const person = profiles.find((profile) => profile.id === item.userId);
 const decision =
 item.metadata.decision === "reject" || item.metadata.validation_status === "rejected"
 ? ("needs_revision" as const)
 : ("approved" as const);

 return {
 id: item.id,
 personName: person?.fullName ?? "Team member",
 title: item.title,
 type:
 item.eventType === "coaching_card_reviewed"
 ? ("simulation" as const)
 : item.metadata.submissionId
 ? ("challenge" as const)
 : ("plan_step" as const),
 decision,
 reviewedAt: item.createdAt,
 };
 });

 const merged = [...fromCards, ...fromActivity];
 const seen = new Set<string>();

 return merged
 .filter((entry) => {
 const dedupeKey = `${entry.personName}-${entry.title}-${entry.reviewedAt.slice(0, 16)}`;
 if (seen.has(dedupeKey)) return false;
 seen.add(dedupeKey);
 return true;
 })
 .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
 .slice(0, limit);
}

export function ManagerReviewHistory({
 entries,
}: {
 entries: ReviewHistoryEntry[];
 fullPage?: boolean;
}) {
 if (entries.length === 0) {
 return (
 <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
 No completed reviews yet. Approved and sent-back items appear here.
 </p>
 );
 }

 return (
 <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
 <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
 <caption className="sr-only">Completed reviews, newest first</caption>
 <thead className="bg-blue font-mono text-xs text-white uppercase">
 <tr>
 <th className="px-5 py-[11px] font-medium" scope="col">When</th>
 <th className="px-5 py-[11px] font-medium" scope="col">Decision</th>
 <th className="px-5 py-[11px] font-medium" scope="col">Type</th>
 <th className="px-5 py-[11px] font-medium" scope="col">Item</th>
 <th className="px-5 py-[11px] font-medium" scope="col">SE</th>
 </tr>
 </thead>
 <tbody>
 {entries.map((entry) => {
 const approved = entry.decision === "approved";
 return (
 <tr className="border-b border-divider align-top last:border-b-0" key={entry.id}>
 <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-ink-2">
 {formatDistanceToNow(new Date(entry.reviewedAt), { addSuffix: true })}
 </td>
 <td className="px-5 py-3">
 <Tag className="bg-transparent" tone={approved ? "success" : "warning"}>
 {approved ? "✓ Approved" : "• Changes requested"}
 </Tag>
 </td>
 <td className="px-5 py-3">
 <Tag>{TYPE_LABEL[entry.type]}</Tag>
 </td>
 <td className="px-5 py-3">
 <span className="block font-bold text-ink">{entry.title}</span>
 {entry.feedbackPreview ? (
 <span className="mt-1 line-clamp-2 block text-sm text-ink-2">{entry.feedbackPreview}</span>
 ) : null}
 </td>
 <td className="px-5 py-3 text-ink">{entry.personName}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 );
}
