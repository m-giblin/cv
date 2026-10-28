import { stepsAwaitingMentor } from "@/lib/mentoring/mentor-step-reviews";
import type { DashboardData } from "@/lib/types";

/**
 * Items in Readiness › Feedback: graded or commented work plus work waiting on a reviewer. Without
 * `mentorReviewCount` (loaded only on the Feedback tab) ramp steps waiting on the mentor are counted from
 * the plan, so the other tabs don't need an extra query.
 */
export function feedbackItemCount(
  data: Pick<DashboardData, "currentUser" | "submissions" | "coachingCards" | "plans">,
  mentorReviewCount?: number,
): number {
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
  const steps = mentorReviewCount ?? stepsAwaitingMentor(data.plans, userId).length;
  return challenges + cards + steps;
}
