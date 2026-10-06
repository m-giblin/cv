import type { DashboardData } from "@/lib/types";

/** Items in Readiness › Feedback: graded or commented work plus work waiting on the manager. */
export function feedbackItemCount(data: Pick<DashboardData, "currentUser" | "submissions" | "coachingCards">): number {
  const userId = data.currentUser.id;
  const challenges = data.submissions.filter(
    (submission) =>
      submission.userId === userId &&
      (submission.managerFeedback ||
        submission.managerGrade !== null ||
        submission.status === "submitted" ||
        submission.status === "under_review"),
  ).length;
  const cards = data.coachingCards.filter(
    (card) =>
      card.userId === userId &&
      ((card.managerReviewStatus !== "pending" && (card.managerComments || card.managerGrade !== null)) ||
        (!card.isPractice && card.managerReviewStatus === "pending")),
  ).length;
  return challenges + cards;
}
