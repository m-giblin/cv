import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/lib/types";

export function FeedbackInbox({ data }: { data: DashboardData }) {
  const userId = data.currentUser.id;
  const reviewedSubmissions = data.submissions.filter(
    (submission) =>
      submission.userId === userId &&
      (submission.managerFeedback || submission.managerGrade !== null) &&
      submission.status !== "not_started",
  );
  const reviewedCards = data.coachingCards.filter(
    (card) =>
      card.userId === userId &&
      card.managerReviewStatus === "reviewed" &&
      (card.managerComments || card.managerGrade !== null),
  );

  const items = [
    ...reviewedSubmissions.map((submission) => {
      const challenge = data.challenges.find((item) => item.id === submission.challengeId);
      return {
        id: submission.id,
        kind: "challenge" as const,
        title: challenge?.title ?? "Challenge submission",
        grade: submission.managerGrade,
        feedback: submission.managerFeedback,
        date: submission.reviewedAt ?? submission.submittedAt,
      };
    }),
    ...reviewedCards.map((card) => ({
      id: card.id,
      kind: "coaching" as const,
      title: card.simulationContext?.persona ?? "Simulation coaching card",
      grade: card.managerGrade,
      feedback: card.managerComments,
      date: card.reviewedAt,
      score: card.score,
    })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No feedback yet</CardTitle>
            <CardDescription>
              Submit a challenge or simulation coaching card — manager feedback will appear here after review.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Link className="text-sm font-semibold text-sp-blue hover:text-sp-blue-deep" href="/challenges">
              Practice a challenge →
            </Link>
            <Link className="text-sm font-semibold text-sp-blue hover:text-sp-blue-deep" href="/simulations">
              Run a simulation →
            </Link>
          </div>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={`${item.kind}-${item.id}`}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Badge tone={item.kind === "challenge" ? "blue" : "magenta"}>
                    {item.kind === "challenge" ? "Challenge" : "Simulation"}
                  </Badge>
                  <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                    <MessageSquare className="h-4 w-4 text-sp-blue" />
                    {item.title}
                  </CardTitle>
                  {item.date ? (
                    <CardDescription>
                      Reviewed {new Date(item.date).toLocaleDateString()}
                    </CardDescription>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {"score" in item && item.score !== undefined ? (
                    <span className="text-2xl font-bold text-sp-navy">{item.score}</span>
                  ) : null}
                  {item.grade !== null && item.grade !== undefined ? (
                    <StatusBadge status="reviewed" />
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {item.grade !== null && item.grade !== undefined ? (
                <p className="text-sm">
                  <span className="font-semibold text-sp-navy">Grade:</span>{" "}
                  <span className="text-sp-navy-muted">{item.grade} / 5</span>
                </p>
              ) : null}
              {item.feedback ? (
                <p className="rounded-2xl bg-sp-blue-soft/30 p-4 text-sm leading-6 text-sp-navy-muted">
                  {item.feedback}
                </p>
              ) : null}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
