import { formatDistanceToNow } from "date-fns";
import { Archive, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function buildReviewHistory(
  coachingCards: CoachingCard[],
  orgIds: Set<string>,
  profiles: Profile[],
  activity: ActivityLog[],
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
    .slice(0, 12);
}

export function ManagerReviewHistory({ entries }: { entries: ReviewHistoryEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card className="border-sp-blue/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4 text-sp-blue" />
          Review history
        </CardTitle>
        <CardDescription>
          Audit trail of completed reviews — approved and sent-back items leave the inbox but stay here.
        </CardDescription>
      </CardHeader>
      <div className="divide-y divide-sp-blue/10 border-t border-sp-blue/10">
        {entries.map((entry) => (
          <div className="flex items-start justify-between gap-3 px-4 py-3" key={entry.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={entry.decision === "approved" ? "green" : "amber"}>
                  {entry.decision === "approved" ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      Needs redo
                    </span>
                  )}
                </Badge>
                <span className="text-xs capitalize text-sp-navy-muted">{entry.type}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-sp-navy">{entry.personName}</p>
              <p className="truncate text-sm text-sp-navy-muted">{entry.title}</p>
              {entry.feedbackPreview ? (
                <p className="mt-1 line-clamp-2 text-xs text-sp-navy-muted">{entry.feedbackPreview}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-sp-navy-muted">
              {formatDistanceToNow(new Date(entry.reviewedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
