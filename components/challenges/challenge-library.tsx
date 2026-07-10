"use client";

import { CheckCircle2, ExternalLink, LayoutGrid, List, X } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssignmentStatus, Challenge, ChallengeSubmission } from "@/lib/types";

type ViewMode = "cards" | "list";

function difficultyTone(difficulty: Challenge["difficulty"]) {
 if (difficulty === "advanced") return "purple" as const;
 if (difficulty === "intermediate") return "amber" as const;
 return "slate" as const;
}

function submissionForChallenge(submissions: ChallengeSubmission[], challengeId: string) {
 return submissions
 .filter((submission) => submission.challengeId === challengeId)
 .sort((a, b) => {
 const aTime = a.submittedAt ?? a.reviewedAt ?? "";
 const bTime = b.submittedAt ?? b.reviewedAt ?? "";
 return bTime.localeCompare(aTime);
 })[0];
}

function libraryStatusLabel(submission: ChallengeSubmission | undefined): {
 status: AssignmentStatus | null;
 label?: string;
} {
 if (!submission) return { status: null };
 if (submission.status === "in_progress" && submission.managerFeedback) {
 return { status: "in_progress", label: "needs revision" };
 }
 return { status: submission.status };
}

function SubmissionStatusBadge({ submission }: { submission?: ChallengeSubmission }) {
 const statusInfo = libraryStatusLabel(submission);
 if (!statusInfo.status) return null;
 if (statusInfo.label) {
 return <Badge tone="amber">{statusInfo.label}</Badge>;
 }
 return <StatusBadge status={statusInfo.status} />;
}

function ChallengeRowBadges({ challenge }: { challenge: Challenge }) {
 return (
 <div className="flex shrink-0 flex-wrap justify-end gap-1">
 {challenge.targetLevel ? <Badge tone="blue">{challenge.targetLevel} SE</Badge> : null}
 <Badge tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
 <Badge tone={challenge.isAiGenerated ? "magenta" : "green"}>
 {challenge.isAiGenerated ? "AI" : "Curated"}
 </Badge>
 </div>
 );
}

function ChallengeDetailModal({
 challenge,
 submission,
 isActive,
 onClose,
 onWorkOn,
}: {
 challenge: Challenge;
 submission?: ChallengeSubmission;
 isActive: boolean;
 onClose: () => void;
 onWorkOn: () => void;
}) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <button
 aria-label="Close challenge details"
 className="absolute inset-0 bg-sp-navy/45 backdrop-blur-[2px]"
 onClick={onClose}
 type="button"
 />

 <div
 aria-labelledby="challenge-detail-title"
 aria-modal="true"
 className="relative flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden border border-sp-blue/15 bg-white shadow-sp-navy/20"
 role="dialog"
 >
 <div className="border-b border-sp-blue/10 bg-gradient-to-br from-sp-blue-soft/40 via-white to-sp-magenta-soft/30 px-6 py-5">
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0 space-y-2">
 <div className="flex flex-wrap items-center gap-2">
 <ChallengeRowBadges challenge={challenge} />
 {submission ? <SubmissionStatusBadge submission={submission} /> : null}
 </div>
 <h2 className="text-xl font-bold text-sp-navy" id="challenge-detail-title">
 {challenge.title}
 </h2>
 <p className="text-sm text-sp-navy-muted">
 {challenge.estimatedMinutes} min · {challenge.steps.length} steps ·{" "}
 {challenge.successCriteria.length} success criteria
 </p>
 </div>
 <button
 aria-label="Close"
 className="p-2 text-sp-navy-muted transition hover:bg-sp-blue-soft/50 hover:text-sp-navy"
 onClick={onClose}
 type="button"
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 </div>

 <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
 <section>
 <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Overview</h3>
 <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{challenge.description}</p>
 </section>

 {challenge.steps.length > 0 ? (
 <section>
 <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Steps</h3>
 <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-sp-navy-muted">
 {challenge.steps.map((step, index) => (
 <li key={index}>{step}</li>
 ))}
 </ol>
 </section>
 ) : null}

 {challenge.successCriteria.length > 0 ? (
 <section>
 <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Success criteria</h3>
 <ul className="mt-2 space-y-2">
 {challenge.successCriteria.map((criterion) => (
 <li className="flex gap-2 text-sm leading-6 text-sp-navy-muted" key={criterion}>
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sp-green" />
 <span>{criterion}</span>
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 {challenge.linkedSolutions.length > 0 ? (
 <section>
 <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Solutions</h3>
 <div className="mt-2 flex flex-wrap gap-2">
 {challenge.linkedSolutions.map((solution) => (
 <Badge key={solution}>{solution}</Badge>
 ))}
 </div>
 </section>
 ) : null}

 {challenge.linkedResources.length > 0 ? (
 <section>
 <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Resources</h3>
 <ul className="mt-2 space-y-2">
 {challenge.linkedResources.map((resource) => (
 <li key={resource}>
 <a
 className="inline-flex items-center gap-1.5 text-sm text-sp-blue hover:underline"
 href={resource}
 rel="noreferrer"
 target="_blank"
 >
 {resource.replace(/^https?:\/\//, "").slice(0, 72)}
 <ExternalLink className="h-3.5 w-3.5" />
 </a>
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 {submission?.managerFeedback ? (
 <section className="border border-amber-200 bg-amber-50/80 p-4">
 <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">Manager feedback</h3>
 <p className="mt-2 text-sm leading-6 text-amber-950">{submission.managerFeedback}</p>
 </section>
 ) : null}
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sp-blue/10 bg-sp-blue-soft/20 px-6 py-4">
 <p className="text-xs text-sp-navy-muted">
 {isActive ? "Selected for submission" : "Choose this challenge to submit evidence"}
 </p>
 <div className="flex gap-2">
 <Button onClick={onClose} type="button" variant="ghost">
 Close
 </Button>
 <Button onClick={onWorkOn} type="button">
 {isActive ? "Use for submit" : "Work on this challenge"}
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}

export function ChallengeLibrary({
 challenges,
 submissions,
 activeChallengeId,
 onSelectChallenge,
 earnedTrophyChallengeIds,
}: {
 challenges: Challenge[];
 submissions: ChallengeSubmission[];
 activeChallengeId: string | null;
 onSelectChallenge: (challengeId: string) => void;
 earnedTrophyChallengeIds?: Set<string>;
}) {
 const [viewMode, setViewMode] = useState<ViewMode>("cards");
 const [detailChallengeId, setDetailChallengeId] = useState<string | null>(null);

 const sortedChallenges = useMemo(
 () =>
 [...challenges].sort((a, b) => {
 const levelOrder = { Basic: 0, Senior: 1, Advisory: 2 };
 const aLevel = a.targetLevel ? levelOrder[a.targetLevel] : 3;
 const bLevel = b.targetLevel ? levelOrder[b.targetLevel] : 3;
 if (aLevel !== bLevel) return aLevel - bLevel;
 return a.title.localeCompare(b.title);
 }),
 [challenges],
 );

 const detailChallenge = detailChallengeId
 ? sortedChallenges.find((challenge) => challenge.id === detailChallengeId)
 : null;

 return (
 <>
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sp-blue/10 px-6 py-4">
 <p className="text-sm text-sp-navy-muted">{sortedChallenges.length} challenges</p>
 <div className="flex border border-sp-blue/15 bg-white p-1">
 <button
 aria-label="Card view"
 aria-pressed={viewMode === "cards"}
 className={`p-2 transition ${viewMode === "cards" ? "bg-sp-blue text-white" : "text-sp-navy-muted hover:text-sp-navy"}`}
 onClick={() => setViewMode("cards")}
 type="button"
 >
 <LayoutGrid className="h-4 w-4" />
 </button>
 <button
 aria-label="List view"
 aria-pressed={viewMode === "list"}
 className={`p-2 transition ${viewMode === "list" ? "bg-sp-blue text-white" : "text-sp-navy-muted hover:text-sp-navy"}`}
 onClick={() => setViewMode("list")}
 type="button"
 >
 <List className="h-4 w-4" />
 </button>
 </div>
 </div>

 {viewMode === "cards" ? (
 <div className="grid gap-4 p-6 lg:grid-cols-2">
 {sortedChallenges.map((challenge) => {
 const submission = submissionForChallenge(submissions, challenge.id);
 const isActive = challenge.id === activeChallengeId;

 return (
 <button
 className={`border p-4 text-left transition hover:border-sp-blue/30 hover:${
 isActive
 ? "border-sp-magenta/40 bg-gradient-to-br from-white to-sp-magenta-soft/40 ring-1 ring-sp-magenta/20"
 : "border-sp-blue/10 bg-gradient-to-br from-white to-sp-magenta-soft/30"
 }`}
 key={challenge.id}
 onClick={() => setDetailChallengeId(challenge.id)}
 type="button"
 >
 <div className="flex items-start justify-between gap-3">
 <h3 className="text-sm font-bold text-sp-navy">{challenge.title}</h3>
 <ChallengeRowBadges challenge={challenge} />
 </div>
 <p className="mt-2 line-clamp-3 text-sm leading-6 text-sp-navy-muted">{challenge.description}</p>
 <div className="mt-4 flex flex-wrap items-center gap-2">
 {submission ? <SubmissionStatusBadge submission={submission} /> : null}
 {earnedTrophyChallengeIds?.has(challenge.id) ? (
 <Badge tone="amber">🏆 earned</Badge>
 ) : null}
 <span className="text-xs text-sp-navy-muted">
 {challenge.estimatedMinutes} min · click for details
 </span>
 </div>
 </button>
 );
 })}
 </div>
 ) : (
 <div className="divide-y divide-sp-blue/10">
 {sortedChallenges.map((challenge) => {
 const submission = submissionForChallenge(submissions, challenge.id);
 const isActive = challenge.id === activeChallengeId;

 return (
 <button
 className={`flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-sp-blue-soft/20 ${
 isActive ? "bg-sp-magenta-soft/30" : ""
 }`}
 key={challenge.id}
 onClick={() => setDetailChallengeId(challenge.id)}
 type="button"
 >
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <p className="text-sm font-bold text-sp-navy">{challenge.title}</p>
 {challenge.targetLevel ? <Badge tone="blue">{challenge.targetLevel}</Badge> : null}
 {submission ? <SubmissionStatusBadge submission={submission} /> : null}
 {earnedTrophyChallengeIds?.has(challenge.id) ? (
 <Badge tone="amber">🏆 earned</Badge>
 ) : null}
 </div>
 <p className="mt-1 line-clamp-1 text-sm text-sp-navy-muted">{challenge.description}</p>
 </div>
 <div className="hidden shrink-0 text-right text-xs text-sp-navy-muted sm:block">
 <p>{challenge.difficulty}</p>
 <p className="mt-1">{challenge.estimatedMinutes} min</p>
 </div>
 </button>
 );
 })}
 </div>
 )}

 {detailChallenge ? (
 <ChallengeDetailModal
 challenge={detailChallenge}
 isActive={detailChallenge.id === activeChallengeId}
 onClose={() => setDetailChallengeId(null)}
 onWorkOn={() => {
 onSelectChallenge(detailChallenge.id);
 setDetailChallengeId(null);
 }}
 submission={submissionForChallenge(submissions, detailChallenge.id)}
 />
 ) : null}
 </>
 );
}
