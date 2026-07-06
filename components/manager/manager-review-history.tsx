import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ActivityLog, CoachingCard, Profile } from "@/lib/types";

export type ReviewHistoryEntry = {
  id: string;
  personName: string;
  title: string;
  type: "simulation" | "challenge" | "plan_step";
  decision: "approved" | "needs_revision";
  reviewedAt: string;
  feedbackPreview?: string;
};

const TYPE_BADGE: Record<ReviewHistoryEntry["type"], { bg: string; color: string; label: string }> = {
  simulation: { bg: "#e8f2fc", color: "#0057a8", label: "Simulation" },
  challenge: { bg: "#ede9fe", color: "#5b21b6", label: "Challenge" },
  plan_step: { bg: "#fef3c7", color: "#b45309", label: "Plan step" },
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
  fullPage = false,
}: {
  entries: ReviewHistoryEntry[];
  fullPage?: boolean;
}) {
  if (entries.length === 0) {
    if (!fullPage) return null;
    return (
      <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
        <p className="px-5 py-10 text-center text-[12.5px] text-[#94a3b8]">
          No completed reviews yet — approved and sent-back items will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      {!fullPage ? (
        <div className="border-b border-[#f1f5f9] p-[13px_16px_11px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Review history</p>
          <p className="mt-[1px] text-[10.5px] text-[#94a3b8]">
            Audit trail of completed reviews — approved and sent-back items leave the inbox but stay here.
          </p>
        </div>
      ) : null}
      <div>
        {entries.map((entry) => {
          const typeBadge = TYPE_BADGE[entry.type];
          const approved = entry.decision === "approved";
          return (
            <div
              className="flex items-start justify-between gap-3 border-b border-[#f9fafb] px-[18px] py-[11px] last:border-0 hover:bg-[#f7fafd]"
              key={entry.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                    style={{
                      background: approved ? "#dcfce7" : "#fef3c7",
                      color: approved ? "#15803d" : "#b45309",
                    }}
                  >
                    {approved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        Needs redo
                      </>
                    )}
                  </span>
                  <span
                    className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                    style={{ background: typeBadge.bg, color: typeBadge.color }}
                  >
                    {typeBadge.label}
                  </span>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-[#1e293b]">{entry.personName}</p>
                <p className="truncate text-[11.5px] text-[#64748b]">{entry.title}</p>
                {entry.feedbackPreview ? (
                  <p className="mt-1 line-clamp-2 text-[10.5px] text-[#94a3b8]">{entry.feedbackPreview}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10.5px] text-[#94a3b8]">
                {formatDistanceToNow(new Date(entry.reviewedAt), { addSuffix: true })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
