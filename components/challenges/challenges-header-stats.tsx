"use client";

import type { Challenge, ChallengeSubmission } from "@/lib/types";

export function ChallengesHeaderStats({
  challenges,
  submissions,
}: {
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
}) {
  const earned = new Set(
    submissions.filter((submission) => submission.status === "reviewed").map((submission) => submission.challengeId),
  ).size;
  const inFlight = submissions.filter(
    (submission) => submission.status === "submitted" || submission.status === "in_progress",
  ).length;
  const redo = submissions.filter(
    (submission) => submission.status === "in_progress" && submission.managerFeedback,
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
      <span className="text-[#64748b]">{challenges.length} challenges</span>
      {earned > 0 ? (
        <>
          <span className="text-[#d0dae8]">·</span>
          <span className="text-[#64748b]">{earned} earned</span>
        </>
      ) : null}
      {inFlight > 0 ? (
        <>
          <span className="text-[#d0dae8]">·</span>
          <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 font-semibold text-[#1d4ed8]">{inFlight} in progress</span>
        </>
      ) : null}
      {redo > 0 ? (
        <>
          <span className="text-[#d0dae8]">·</span>
          <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-semibold text-[#b45309]">{redo} redo requested</span>
        </>
      ) : null}
    </div>
  );
}
