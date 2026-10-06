"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { CARD_CLS, H2_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import type { AssignmentStatus, Challenge, ChallengeSubmission } from "@/lib/types";

type DifficultyFilter = "all" | Challenge["difficulty"];
type StatusFilter = "all" | "not_started" | "active" | "submitted" | "earned";

const DIFFICULTY_FILTERS: { id: DifficultyFilter; label: string }[] = [
 { id: "all", label: "All levels" },
 { id: "foundational", label: "Foundational" },
 { id: "intermediate", label: "Intermediate" },
 { id: "advanced", label: "Advanced" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
 { id: "all", label: "Any status" },
 { id: "not_started", label: "Not started" },
 { id: "active", label: "In progress" },
 { id: "submitted", label: "Submitted" },
 { id: "earned", label: "Earned" },
];

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

function statusBucket(submission: ChallengeSubmission | undefined): Exclude<StatusFilter, "all"> {
 if (!submission || submission.status === "not_started") return "not_started";
 if (submission.status === "reviewed" || submission.status === "completed") return "earned";
 if (submission.status === "submitted" || submission.status === "under_review") return "submitted";
 return "active";
}

function SubmissionStatusTag({ submission }: { submission?: ChallengeSubmission }) {
 const statusInfo = libraryStatusLabel(submission);
 if (!statusInfo.status) return <StatusPill tone="neutral">Not started</StatusPill>;
 if (statusInfo.label) return <StatusPill tone="danger">Needs revision</StatusPill>;
 switch (statusInfo.status) {
 case "reviewed":
 case "completed":
 return <StatusPill tone="success">Earned</StatusPill>;
 case "submitted":
 return <StatusPill tone="blue">Submitted</StatusPill>;
 case "under_review":
 return <StatusPill tone="blue">Under review</StatusPill>;
 case "in_progress":
 return <StatusPill tone="blue">In progress</StatusPill>;
 default:
 return <StatusPill tone="neutral">Not started</StatusPill>;
 }
}

function ChallengeDetail({
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
 <section aria-labelledby="challenge-detail-title" className={`${CARD_CLS} flex flex-col overflow-hidden`}>
 <div className="border-b border-divider px-5 py-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex min-w-0 flex-col gap-2">
 <div className="flex flex-wrap items-center gap-1.5">
 {challenge.targetLevel ? <Tag tone="blue">{challenge.targetLevel} SE</Tag> : null}
 <Tag tone="neutral">{challenge.difficulty}</Tag>
 <Tag tone="neutral">{challenge.isAiGenerated ? "AI" : "Curated"}</Tag>
 <SubmissionStatusTag submission={submission} />
 </div>
 <h2 className={H2_CLS} id="challenge-detail-title">
 {challenge.title}
 </h2>
 <p className="text-[13px] text-muted">
 About {challenge.estimatedMinutes} min, {challenge.steps.length} steps and {challenge.successCriteria.length}{" "}
 success criteria
 </p>
 </div>
 <button className="link shrink-0 text-sm" onClick={onClose} type="button">
 Close
 </button>
 </div>
 </div>

 <div className="flex flex-col gap-5 px-5 py-4">
 <section>
 <h3 className="text-[15px] font-bold text-ink">Overview</h3>
 <p className="mt-1.5 text-[15px] leading-[1.5] text-ink-2">{challenge.description}</p>
 </section>

 {challenge.steps.length > 0 ? (
 <section>
 <h3 className="text-[15px] font-bold text-ink">Steps</h3>
 <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.5] text-ink-2">
 {challenge.steps.map((step, index) => (
 <li key={index}>{step}</li>
 ))}
 </ol>
 </section>
 ) : null}

 {challenge.successCriteria.length > 0 ? (
 <section>
 <h3 className="text-[15px] font-bold text-ink">Success criteria</h3>
 <ul className="mt-1.5 space-y-1.5">
 {challenge.successCriteria.map((criterion) => (
 <li className="flex gap-2 text-[15px] leading-[1.5] text-ink-2" key={criterion}>
 <span aria-hidden="true" className="mt-[7px] block h-2.5 w-1.5 shrink-0 rotate-45 border-r-2 border-b-2 border-success" />
 <span>{criterion}</span>
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 {challenge.linkedSolutions.length > 0 ? (
 <section>
 <h3 className="text-[15px] font-bold text-ink">Solutions</h3>
 <div className="mt-1.5 flex flex-wrap gap-1.5">
 {challenge.linkedSolutions.map((solution) => (
 <Tag key={solution} tone="neutral">
 {solution}
 </Tag>
 ))}
 </div>
 </section>
 ) : null}

 {challenge.linkedResources.length > 0 ? (
 <section>
 <h3 className="text-[15px] font-bold text-ink">Resources</h3>
 <ul className="mt-1.5 space-y-1.5">
 {challenge.linkedResources.map((resource) => (
 <li key={resource}>
 <a className="link inline-flex items-center gap-1.5 text-sm" href={resource} rel="noreferrer" target="_blank">
 {resource.replace(/^https?:\/\//, "").slice(0, 72)}
 <ExternalLink aria-hidden="true" className="h-4 w-4" />
 <span className="sr-only">(opens in a new tab)</span>
 </a>
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 {submission?.managerFeedback ? (
 <section className="rounded-[14px] bg-warning-soft px-4 py-3">
 <h3 className="text-[13px] font-semibold text-warning">Manager feedback</h3>
 <p className="mt-1.5 text-[15px] leading-[1.5] text-ink">{submission.managerFeedback}</p>
 </section>
 ) : null}
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-5 py-4">
 <p className="text-[13px] text-muted">
 {isActive ? "Selected for submission" : "Choose this challenge to submit evidence"}
 </p>
 <button className="btn-primary" onClick={onWorkOn} type="button">
 {isActive ? "Use for submit" : "Work on this challenge"}
 </button>
 </div>
 </section>
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
 const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
 const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

 const visibleChallenges = useMemo(
 () =>
 sortedChallenges.filter((challenge) => {
 if (difficultyFilter !== "all" && challenge.difficulty !== difficultyFilter) return false;
 if (statusFilter !== "all") {
 const bucket = earnedTrophyChallengeIds?.has(challenge.id)
 ? "earned"
 : statusBucket(submissionForChallenge(submissions, challenge.id));
 if (bucket !== statusFilter) return false;
 }
 return true;
 }),
 [difficultyFilter, earnedTrophyChallengeIds, sortedChallenges, statusFilter, submissions],
 );

 const detailChallenge = detailChallengeId
 ? sortedChallenges.find((challenge) => challenge.id === detailChallengeId)
 : null;

 return (
 <div className="flex flex-col gap-4">
 <div className="flex flex-col gap-2">
 <div aria-label="Filter by difficulty" className="flex flex-wrap gap-2" role="group">
 {DIFFICULTY_FILTERS.map((option) => (
 <Chip active={difficultyFilter === option.id} key={option.id} onClick={() => setDifficultyFilter(option.id)}>
 {option.label}
 </Chip>
 ))}
 </div>
 <div aria-label="Filter by status" className="flex flex-wrap gap-2" role="group">
 {STATUS_FILTERS.map((option) => (
 <Chip active={statusFilter === option.id} key={option.id} onClick={() => setStatusFilter(option.id)}>
 {option.label}
 </Chip>
 ))}
 </div>
 </div>

 <p className="text-[13px] text-muted" role="status">
 {visibleChallenges.length} of {sortedChallenges.length} challenges
 </p>

 <div className={`grid gap-6 ${detailChallenge ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : ""}`}>
 {visibleChallenges.length === 0 ? (
 <p className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
 No challenges match these filters.
 </p>
 ) : (
 <ul className={`${LINE_CARD_CLS} self-start overflow-hidden`}>
 {visibleChallenges.map((challenge) => {
 const submission = submissionForChallenge(submissions, challenge.id);
 const isActive = challenge.id === activeChallengeId;
 const isOpen = challenge.id === detailChallengeId;
 const earned = earnedTrophyChallengeIds?.has(challenge.id);

 return (
 <li
 className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-divider px-5 py-3.5 last:border-b-0 ${
 isOpen ? "bg-blue-soft" : ""
 }`}
 key={challenge.id}
 >
 <div className="min-w-0 flex-1 basis-[240px]">
 <button
 aria-expanded={isOpen}
 className="link text-left text-[15px]"
 onClick={() => setDetailChallengeId(isOpen ? null : challenge.id)}
 type="button"
 >
 {challenge.title}
 </button>
 <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{challenge.description}</p>
 </div>
 <div className="flex flex-wrap items-center gap-1.5">
 {isActive ? <StatusPill tone="warning">Selected</StatusPill> : null}
 <Tag tone="neutral">{challenge.difficulty}</Tag>
 {earned ? <StatusPill tone="success">Earned</StatusPill> : <SubmissionStatusTag submission={submission} />}
 </div>
 <span className="w-[64px] text-right text-xs text-muted">{challenge.estimatedMinutes} min</span>
 </li>
 );
 })}
 </ul>
 )}

 {detailChallenge ? (
 <ChallengeDetail
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
 </div>
 </div>
 );
}
