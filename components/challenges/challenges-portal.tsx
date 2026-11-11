"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChallengeFlow, type ChallengeAttemptSummary } from "@/components/challenges/challenge-flow";
import { CARD_CLS, FIELD_CLS, LINE_CARD_CLS, SELECT_CLS } from "@/components/se/form-classes";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import { useLearnerTerms } from "@/components/tenant/tenant-branding-provider";
import {
 type ChallengeFilter,
 filterChallenges,
 isAgenticChallenge,
 libraryStatusLabel,
 sortChallenges,
 submissionForChallenge,
} from "@/lib/challenges/challenge-library-utils";
import { competencyNamesForChallenge } from "@/lib/challenges/lookup-competencies";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";
import type { Challenge, ChallengeSubmission } from "@/lib/types";
import type { NextUpStep } from "@/lib/plans/next-up";

const ChallengeGenerator = dynamic(
 () => import("@/components/challenge-generator").then((mod) => mod.ChallengeGenerator),
 {
 loading: () => (
 <p
 className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted"
 role="status"
 >
 Loading generator...
 </p>
 ),
 },
);

type PortalView = "browse" | "submissions" | "generate";

const PAGE_SIZE = 12;

const VERTICALS = ["All verticals", "Enterprise", "SLED", "Healthcare", "Financial", "Federal"] as const;
const COMPETENCY_FILTERS = [
 "All competencies",
 "Discovery",
 "Objection handling",
 "Competitive positioning",
 "Demo execution",
 "Value articulation",
 "Agentic AI",
] as const;
const STATUS_FILTERS = [
 "All statuses",
 "Not started",
 "In progress",
 "Submitted",
 "Approved",
 "Redo requested",
 "Canceled",
] as const;
const SORT_OPTIONS = ["Recommended", "Newest", "Shortest first", "By competency"] as const;

type LibraryStatus =
 | "Not started"
 | "In progress"
 | "Submitted"
 | "Approved"
 | "Redo requested"
 | "Canceled";

function inferVertical(challenge: Challenge): string {
 const hay = [
 challenge.title,
 challenge.description,
 ...(challenge.competencyNames ?? []),
 ...challenge.linkedSolutions,
 ]
 .join(" ")
 .toLowerCase();
 if (hay.includes("sled")) return "SLED";
 if (hay.includes("health")) return "Healthcare";
 if (hay.includes("federal") || hay.includes("fedramp")) return "Federal";
 if (hay.includes("financial") || hay.includes("bank")) return "Financial";
 return "Enterprise";
}

function libraryStatus(submission?: ChallengeSubmission, attempt?: ChallengeAttemptSummary): LibraryStatus {
 if (attempt?.status === "canceled") return "Canceled";
 if (attempt?.status === "active" && !submission?.managerFeedback) return "In progress";
 if (!submission) return "Not started";
 if (submission.status === "reviewed") return "Approved";
 if (submission.status === "submitted") return "Submitted";
 if (submission.status === "in_progress" && submission.managerFeedback) return "Redo requested";
 if (submission.status === "in_progress") return "In progress";
 return "Not started";
}

function StatusTag({ status }: { status: LibraryStatus }) {
 if (status === "Canceled") return <StatusPill tone="danger">Canceled</StatusPill>;
 if (status === "Approved") return <StatusPill tone="success">Approved</StatusPill>;
 if (status === "Submitted") return <StatusPill tone="blue">Submitted</StatusPill>;
 if (status === "In progress") return <StatusPill tone="blue">In progress</StatusPill>;
 if (status === "Redo requested") return <StatusPill tone="danger">Redo requested</StatusPill>;
 return <StatusPill tone="neutral">Not started</StatusPill>;
}

function primaryCompetency(challenge: Challenge) {
 const names = competencyNamesForChallenge(challenge);
 return names[0] ?? "General";
}

const LEVEL_OPTIONS: { id: ChallengeFilter; label: string }[] = [
 { id: "all", label: "All levels" },
 { id: "basic", label: "Basic" },
 { id: "senior", label: "Senior" },
 { id: "advisory", label: "Advisory" },
];

const EMPTY_CLS =
 "rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

function SubmissionBadge({ submission }: { submission?: ChallengeSubmission }) {
 const statusInfo = libraryStatusLabel(submission);
 if (!statusInfo.status) return null;
 if (statusInfo.label) return <StatusPill tone="danger">{statusInfo.label}</StatusPill>;
 switch (statusInfo.status) {
 case "reviewed":
 case "completed":
 return <StatusPill tone="success">Reviewed</StatusPill>;
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

export function ChallengesPortal({
 challenges,
 submissions,
 initialChallengeId,
 isFocused,
 tier,
 showGenerator,
 gapRecommendations = [],
}: {
 challenges: Challenge[];
 submissions: ChallengeSubmission[];
 initialChallengeId: string | null;
 isFocused: boolean;
 tier: "se" | "manager" | "admin";
 showGenerator: boolean;
 gapRecommendations?: GapChallengeRecommendation[];
}) {
 const learner = useLearnerTerms();
 const router = useRouter();
 const searchParams = useSearchParams();
 const viewParam = searchParams.get("view");
 const challengeParam = searchParams.get("challenge");

 const view: PortalView =
 viewParam === "generate" && showGenerator
 ? "generate"
 : viewParam === "submissions"
 ? "submissions"
 : "browse";

 const [query, setQuery] = useState("");
 const [filter, setFilter] = useState<ChallengeFilter>("all");
 const [verticalFilter, setVerticalFilter] = useState<(typeof VERTICALS)[number]>("All verticals");
 const [competencyFilter, setCompetencyFilter] =
 useState<(typeof COMPETENCY_FILTERS)[number]>("All competencies");
 const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All statuses");
 const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Recommended");
 const [showGapsOnly, setShowGapsOnly] = useState(false);
 const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
 const [detailChallenge, setDetailChallenge] = useState<Challenge | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);
 // The plan's next step after a turn-in, kept here because the challenge panel reloads on submit.
 const [turnedIn, setTurnedIn] = useState<{ challengeId: string; next: NextUpStep } | null>(null);
 const [attempts, setAttempts] = useState<Record<string, ChallengeAttemptSummary>>({});
 const [hasManager, setHasManager] = useState(true);
 const [managerName, setManagerName] = useState<string | null>(null);
 const [seDraftTextByChallenge, setSeDraftTextByChallenge] = useState<Record<string, string>>({});

 const loadAttempts = useCallback(() => {
 void fetch("/api/challenge-attempts", { cache: "no-store" })
 .then((response) => (response.ok ? response.json() : null))
 .then((body: { attempts: ChallengeAttemptSummary[]; hasManager: boolean; managerName: string | null } | null) => {
 if (!body) return;
 setAttempts(Object.fromEntries(body.attempts.map((attempt) => [attempt.challenge_id, attempt])));
 setHasManager(body.hasManager);
 setManagerName(body.managerName);
 });
 }, []);

 useEffect(() => {
 loadAttempts();
 }, [loadAttempts]);

 const gapCompetencies = useMemo(
 () => gapRecommendations.slice(0, 2).map((rec) => rec.gapCompetency.toLowerCase()),
 [gapRecommendations],
 );

 const selectedId = challengeParam ?? initialChallengeId ?? challenges[0]?.id ?? null;

 const selectedSummary = challenges.find((c) => c.id === selectedId) ?? null;
 const selectedChallenge = detailChallenge?.id === selectedId ? detailChallenge : selectedSummary;
 const selectedSubmission = selectedChallenge
 ? submissionForChallenge(submissions, selectedChallenge.id)
 : undefined;
 const selectedDraftText = selectedChallenge ? (seDraftTextByChallenge[selectedChallenge.id] ?? "") : "";

 const earnedTrophyChallengeIds = useMemo(
 () => new Set(submissions.filter((s) => s.status === "reviewed").map((s) => s.challengeId)),
 [submissions],
 );

 const gapChallengeIds = useMemo(
 () => new Set(gapRecommendations.map((item) => item.challenge.id)),
 [gapRecommendations],
 );

 const filtered = useMemo(() => {
 let rows = sortChallenges(filterChallenges(challenges, submissions, query, filter)).filter(
 (challenge) => {
 if (verticalFilter !== "All verticals" && inferVertical(challenge) !== verticalFilter) return false;
 if (competencyFilter === "Agentic AI") {
 if (!isAgenticChallenge(challenge)) return false;
 } else if (competencyFilter !== "All competencies") {
 const names = competencyNamesForChallenge(challenge).join(" ").toLowerCase();
 if (!names.includes(competencyFilter.toLowerCase().split(" ")[0] ?? "")) return false;
 }
 if (statusFilter !== "All statuses") {
 if (libraryStatus(submissionForChallenge(submissions, challenge.id), attempts[challenge.id]) !== statusFilter) return false;
 }
 if (showGapsOnly) {
 if (gapChallengeIds.size > 0 && !gapChallengeIds.has(challenge.id)) return false;
 if (gapChallengeIds.size === 0 && gapCompetencies.length > 0) {
 const names = competencyNamesForChallenge(challenge).join(" ").toLowerCase();
 if (!gapCompetencies.some((gap) => names.includes(gap.split(" ")[0] ?? gap))) return false;
 }
 }
 return true;
 },
 );

 if (sortBy === "Shortest first") {
 rows = [...rows].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
 } else if (sortBy === "By competency") {
 rows = [...rows].sort((a, b) => primaryCompetency(a).localeCompare(primaryCompetency(b)));
 } else if (sortBy === "Newest") {
 rows = [...rows].sort((a, b) => b.id.localeCompare(a.id));
 } else {
 rows = [...rows].sort((a, b) => {
 const aGap = gapChallengeIds.has(a.id) ? 0 : 1;
 const bGap = gapChallengeIds.has(b.id) ? 0 : 1;
 if (aGap !== bGap) return aGap - bGap;
 return a.title.localeCompare(b.title);
 });
 }

 return rows;
 }, [
 challenges,
 submissions,
 query,
 filter,
 verticalFilter,
 competencyFilter,
 statusFilter,
 attempts,
 showGapsOnly,
 gapChallengeIds,
 gapCompetencies,
 sortBy,
 ]);

 const visibleRows = filtered.slice(0, visibleCount);

 useEffect(() => {
 setVisibleCount(PAGE_SIZE);
 }, [query, verticalFilter, competencyFilter, statusFilter, sortBy, showGapsOnly, filter]);

 useEffect(() => {
 if (tier !== "se" || !selectedChallenge) return;
 const key = `se-challenge-draft:${selectedChallenge.id}`;
 let nextText = selectedSubmission?.reflectionText ?? "";
 if (typeof window !== "undefined") {
 const raw = window.localStorage.getItem(key);
 if (raw) {
 try {
 const parsed = JSON.parse(raw) as { text?: string };
 nextText = parsed.text ?? nextText;
 } catch {
 nextText = selectedSubmission?.reflectionText ?? "";
 }
 }
 }
 setSeDraftTextByChallenge((current) =>
 current[selectedChallenge.id] === nextText ? current : { ...current, [selectedChallenge.id]: nextText },
 );
 }, [selectedChallenge, selectedSubmission?.reflectionText, tier]);

 useEffect(() => {
 if (tier !== "se" || !selectedChallenge) return;
 const trimmed = selectedDraftText.trim();
 if (!trimmed) return;
 const timeout = window.setTimeout(() => {
 if (typeof window !== "undefined") {
 const key = `se-challenge-draft:${selectedChallenge.id}`;
 window.localStorage.setItem(key, JSON.stringify({ text: selectedDraftText }));
 }
 }, 1200);
 return () => window.clearTimeout(timeout);
 }, [selectedChallenge, selectedDraftText, tier]);

 useEffect(() => {
 if (!selectedId) {
 setDetailChallenge(null);
 return;
 }

 const summary = challenges.find((challenge) => challenge.id === selectedId);
 if (!summary) {
 return;
 }

 if (summary.steps.length > 0 && summary.successCriteria.length > 0) {
 setDetailChallenge(summary);
 return;
 }

 let cancelled = false;
 setDetailLoading(true);

 void fetch(`/api/challenges/${selectedId}`)
 .then((response) => (response.ok ? response.json() : null))
 .then((body: { challenge?: Challenge } | null) => {
 if (!cancelled && body?.challenge) {
 setDetailChallenge(body.challenge);
 }
 })
 .finally(() => {
 if (!cancelled) {
 setDetailLoading(false);
 }
 });

 return () => {
 cancelled = true;
 };
 }, [challenges, selectedId]);

 const setView = useCallback(
 (nextView: PortalView) => {
 const params = new URLSearchParams(searchParams.toString());
 if (nextView === "browse") params.delete("view");
 else params.set("view", nextView);
 router.replace(`/practice/challenges?${params.toString()}`, { scroll: false });
 },
 [router, searchParams],
 );

 const selectChallenge = useCallback(
 (challengeId: string) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set("challenge", challengeId);
 if (view !== "browse") params.delete("view");
 router.replace(`/practice/challenges?${params.toString()}`, { scroll: false });
 },
 [router, searchParams, view],
 );

 const stats = useMemo(() => {
 const earned = earnedTrophyChallengeIds.size;
 const inFlight = submissions.filter(
 (s) => s.status === "submitted" || s.status === "in_progress",
 ).length;
 const redo = submissions.filter((s) => s.status === "in_progress" && s.managerFeedback).length;
 return { total: challenges.length, earned, inFlight, redo };
 }, [challenges.length, earnedTrophyChallengeIds.size, submissions]);

 return (
 <div className="flex min-w-0 flex-1 flex-col gap-5">
 {isFocused ? (
 <p className="rounded-[12px] border border-dashed border-line-strong px-5 py-3 text-[15px] text-ink-2">
 <span className="label-caps label-caps--blue mr-2">From your ramp</span>
 Complete it and submit when you are ready.
 </p>
 ) : null}

 {view === "generate" ? (
 <div className={`${LINE_CARD_CLS} p-5`}>
 <ChallengeGenerator showSave />
 </div>
 ) : view === "submissions" ? (
 <div>
 {submissions.length === 0 ? (
 <div className={EMPTY_CLS}>
 <p className="font-bold text-ink">No submissions yet</p>
 <p className="mt-1">Browse the library and submit your first challenge.</p>
 <button className="btn-primary mt-4" onClick={() => setView("browse")} type="button">
 Browse challenges
 </button>
 </div>
 ) : (
 <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
 {submissions.map((submission) => {
 const challenge = challenges.find((c) => c.id === submission.challengeId);
 return (
 <li className="border-b border-divider last:border-b-0" key={submission.id}>
 <button
 className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-blue-soft"
 onClick={() => {
 if (challenge) selectChallenge(challenge.id);
 setView("browse");
 }}
 type="button"
 >
 <span className="min-w-0">
 <span className="block truncate text-[15px] font-bold text-ink">{challenge?.title ?? "Challenge"}</span>
 <span className="text-[13px] text-muted">
 {submission.submittedAt
 ? new Date(submission.submittedAt).toLocaleDateString()
 : "Draft"}
 </span>
 </span>
 <SubmissionBadge submission={submission} />
 </button>
 </li>
 );
 })}
 </ul>
 )}
 </div>
 ) : (
 <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
 <aside aria-label="Challenge library" className={`${LINE_CARD_CLS} flex min-w-0 flex-col overflow-hidden`}>
 <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
<div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-search">
 Search
 </label>
 <div className="relative">
 <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
 <input
 className={`${FIELD_CLS} pl-9`}
 id="challenge-search"
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search challenges..."
 type="search"
 value={query}
 />
 </div>
 </div>
<div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-sort">
 Sort
 </label>
 <select
 className={SELECT_CLS}
 id="challenge-sort"
 onChange={(e) => setSortBy(e.target.value as (typeof SORT_OPTIONS)[number])}
 value={sortBy}
 >
 {SORT_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>
<div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-level">
 Level
 </label>
 <select
 className={SELECT_CLS}
 id="challenge-level"
 onChange={(e) => setFilter(e.target.value as ChallengeFilter)}
 value={filter}
 >
 {LEVEL_OPTIONS.map((option) => (
 <option key={option.id} value={option.id}>
 {option.label}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-vertical">
 Vertical
 </label>
 <select
 className={SELECT_CLS}
 id="challenge-vertical"
 onChange={(e) => setVerticalFilter(e.target.value as (typeof VERTICALS)[number])}
 value={verticalFilter}
 >
 {VERTICALS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-competency">
 Competency
 </label>
 <select
 className={SELECT_CLS}
 id="challenge-competency"
 onChange={(e) => setCompetencyFilter(e.target.value as (typeof COMPETENCY_FILTERS)[number])}
 value={competencyFilter}
 >
 {COMPETENCY_FILTERS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-sm font-bold text-ink" htmlFor="challenge-status">
 Status
 </label>
 <select
 className={SELECT_CLS}
 id="challenge-status"
 onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
 value={statusFilter}
 >
 {STATUS_FILTERS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>
  </div>
 {gapRecommendations.length > 0 ? (
 <label className="flex items-center gap-2 text-sm font-semibold text-ink">
 <input checked={showGapsOnly} className="h-5 w-5" onChange={(e) => setShowGapsOnly(e.target.checked)} type="checkbox" />
 My gaps only
 </label>
 ) : null}
 </div>

 {gapRecommendations.length > 0 ? (
 <div className="border-b border-divider bg-blue-soft px-5 py-3">
 <p className="text-sm leading-[1.5] text-ink-2">
 <strong className="text-ink">Gaps to close:</strong>{" "}
 {gapRecommendations
 .slice(0, 2)
 .map((item) => item.gapCompetency)
 .join(" and ")}
 . Challenges for your biggest gaps are sorted first.
 </p>
 </div>
 ) : null}

 <p className="sr-only" role="status">
 {filtered.length} challenges match
 </p>

 <div className="min-h-0 lg:max-h-[min(70vh,900px)] lg:overflow-y-auto">
 {filtered.length === 0 ? (
 <p className="m-5 rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
 No challenges match these filters.
 </p>
 ) : (
 <ul>
 {visibleRows.map((challenge) => {
 const submission = submissionForChallenge(submissions, challenge.id);
 const status = libraryStatus(submission, attempts[challenge.id]);
 const isSelected = challenge.id === selectedId;
 const competency = primaryCompetency(challenge);

 return (
 <li className="border-b border-divider last:border-b-0" key={challenge.id}>
 <button
 aria-current={isSelected ? "true" : undefined}
 className={`flex w-full flex-col gap-1.5 px-5 py-3.5 text-left ${
 isSelected ? "bg-blue-soft" : "hover:bg-surface-2"
 }`}
 onClick={() => selectChallenge(challenge.id)}
 type="button"
 >
 <span className="text-[15px] font-bold leading-snug text-ink">{challenge.title}</span>
 <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
 <StatusTag status={status} />
 <span className="text-[13px] text-muted">
 {competency}, about {challenge.estimatedMinutes} min
 </span>
 </span>
 </button>
 </li>
 );
 })}
 </ul>
 )}
 {visibleCount < filtered.length ? (
 <div className="border-t border-divider px-5 py-3 text-center text-sm text-muted">
 Showing {visibleRows.length} of {filtered.length}.{" "}
 <button
 className="link"
 onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
 type="button"
 >
 Load more ({filtered.length - visibleCount} remaining)
 </button>
 </div>
 ) : null}
 </div>
 </aside>

 <section aria-label="Challenge detail" className="min-w-0">
 {selectedChallenge ? (
 <article className={`${CARD_CLS} overflow-hidden`}>
 <header className="border-b border-divider px-6 py-5">
 <div className="mb-2 flex flex-wrap items-center gap-1.5">
 {selectedChallenge.targetLevel ? (
 <Tag tone="blue">{selectedChallenge.targetLevel} {learner.one}</Tag>
 ) : null}
 <Tag tone="neutral">{selectedChallenge.difficulty}</Tag>
 <Tag tone="neutral">{selectedChallenge.isAiGenerated ? "AI" : "Curated"}</Tag>
 <StatusTag status={libraryStatus(selectedSubmission, attempts[selectedChallenge.id])} />
 </div>
 <h2 className="text-2xl font-extrabold leading-[1.15] tracking-[-0.015em] text-ink">
 {selectedChallenge.title}
 </h2>
 <p className="mt-1.5 text-[13px] text-muted">
 About {selectedChallenge.estimatedMinutes} min, {selectedChallenge.steps.length} steps
 </p>
 <div className="mt-2.5 flex flex-wrap gap-1.5">
 {competencyNamesForChallenge(selectedChallenge).map((name) => (
 <Tag key={name} tone="neutral">
 {name}
 </Tag>
 ))}
 </div>
 </header>

 <div className="flex flex-col gap-6 px-6 py-5">
 {detailLoading ? (
 <p className={EMPTY_CLS} role="status">
 Loading challenge details...
 </p>
 ) : (
 <>
 <ChallengeFlow
 attempt={attempts[selectedChallenge.id]}
 challenge={selectedChallenge}
 defaultReflection={selectedDraftText}
 hasManager={hasManager}
 key={selectedChallenge.id}
 managerName={managerName}
 nextUp={turnedIn?.challengeId === selectedChallenge.id ? turnedIn.next : null}
 onNextUp={(next) => setTurnedIn(next ? { challengeId: selectedChallenge.id, next } : null)}
 onChanged={() => {
 // Pin the challenge in the URL so the refresh can't jump to a different one.
 selectChallenge(selectedChallenge.id);
 loadAttempts();
 router.refresh();
 }}
 submission={selectedSubmission}
 />
 </>
 )}
 </div>
 </article>
 ) : (
 <div className={EMPTY_CLS}>
 <p className="font-bold text-ink">Select a challenge</p>
 <p className="mt-1">Use the list to browse {stats.total} options.</p>
 </div>
 )}
 </section>
 </div>
 )}
 </div>
 );
}
