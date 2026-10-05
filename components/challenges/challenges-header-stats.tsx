"use client";

import { Tag } from "@/components/ui/tag";
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
 <span className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-muted">
 {challenges.length} challenges{earned > 0 ? ` · ${earned} earned` : ""}
 </span>
 {inFlight > 0 ? <Tag tone="blue">● {inFlight} in progress</Tag> : null}
 {redo > 0 ? <Tag tone="danger">▲ {redo} redo requested</Tag> : null}
 </div>
 );
}
