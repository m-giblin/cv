"use client";

import { StatusPill } from "@/components/ui/status-pill";
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
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-[13px] text-muted">
 {challenges.length} challenges{earned > 0 ? `, ${earned} earned` : ""}
 </span>
 {inFlight > 0 ? <StatusPill tone="blue">{inFlight} in progress</StatusPill> : null}
 {redo > 0 ? <StatusPill tone="danger">{redo} redo requested</StatusPill> : null}
 </div>
 );
}
