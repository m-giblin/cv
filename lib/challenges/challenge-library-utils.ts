import type { AssignmentStatus, Challenge, ChallengeSubmission } from "@/lib/types";

export function difficultyTone(difficulty: Challenge["difficulty"]) {
  if (difficulty === "advanced") return "purple" as const;
  if (difficulty === "intermediate") return "amber" as const;
  return "slate" as const;
}

export function submissionForChallenge(submissions: ChallengeSubmission[], challengeId: string) {
  return submissions
    .filter((submission) => submission.challengeId === challengeId)
    .sort((a, b) => {
      const aTime = a.submittedAt ?? a.reviewedAt ?? "";
      const bTime = b.submittedAt ?? b.reviewedAt ?? "";
      return bTime.localeCompare(aTime);
    })[0];
}

export function libraryStatusLabel(submission: ChallengeSubmission | undefined): {
  status: AssignmentStatus | null;
  label?: string;
} {
  if (!submission) return { status: null };
  if (submission.status === "in_progress" && submission.managerFeedback) {
    return { status: "in_progress", label: "needs revision" };
  }
  return { status: submission.status };
}

export function isAgenticChallenge(challenge: Challenge) {
  return (
    challenge.id.startsWith("e5000001") ||
    challenge.id.startsWith("e5000002") ||
    challenge.linkedSolutions.some((s) => /agentic|ais/i.test(s))
  );
}

export type ChallengeFilter = "all" | "basic" | "senior" | "advisory" | "agentic" | "active" | "done";

export function filterChallenges(
  challenges: Challenge[],
  submissions: ChallengeSubmission[],
  query: string,
  filter: ChallengeFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return challenges.filter((challenge) => {
    const submission = submissionForChallenge(submissions, challenge.id);

    if (filter === "basic" && challenge.targetLevel !== "Basic") return false;
    if (filter === "senior" && challenge.targetLevel !== "Senior") return false;
    if (filter === "advisory" && challenge.targetLevel !== "Advisory") return false;
    if (filter === "agentic" && !isAgenticChallenge(challenge)) return false;
    if (filter === "active" && submission?.status === "reviewed") return false;
    if (filter === "done" && submission?.status !== "reviewed") return false;

    if (!normalizedQuery) return true;

    const haystack = [
      challenge.title,
      challenge.description,
      challenge.difficulty,
      challenge.targetLevel ?? "",
      ...challenge.linkedSolutions,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function sortChallenges(challenges: Challenge[]) {
  const levelOrder = { Basic: 0, Senior: 1, Advisory: 2 };
  return [...challenges].sort((a, b) => {
    const aLevel = a.targetLevel ? levelOrder[a.targetLevel] : 3;
    const bLevel = b.targetLevel ? levelOrder[b.targetLevel] : 3;
    if (aLevel !== bLevel) return aLevel - bLevel;
    return a.title.localeCompare(b.title);
  });
}
