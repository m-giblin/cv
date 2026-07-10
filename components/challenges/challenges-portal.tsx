"use client";

import {
 BookOpen,
 CheckCircle2,
 ExternalLink,
 FileUp,
 LayoutList,
 Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChallengeSubmissionForm } from "@/components/challenges/submission-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
 type ChallengeFilter,
 filterChallenges,
 libraryStatusLabel,
 sortChallenges,
 submissionForChallenge,
} from "@/lib/challenges/challenge-library-utils";
import { competencyNamesForChallenge } from "@/lib/challenges/lookup-competencies";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";
import type { Challenge, ChallengeSubmission } from "@/lib/types";

const ChallengeGenerator = dynamic(
 () => import("@/components/challenge-generator").then((mod) => mod.ChallengeGenerator),
 { loading: () => <div className="h-40 animate-pulse bg-stone-100" /> },
);

type PortalView = "browse" | "submissions" | "generate";

const PAGE_SIZE = 12;

const CHALLENGE_TIPS = [
 { label: "Discovery tip", color: "#0071ce", text: "Start with scope — how many identities, then how many of those are non-human?" },
 { label: "Agentic AI hook", color: "#7c3aed", text: '"Who is the human accountable when an agent provisions access?" — lands every time.' },
 { label: "Close with risk", color: "#ef4444", text: "Tie to their last audit. Evidence gap is the pain that creates urgency." },
] as const;

const VERTICALS = ["All verticals", "Enterprise", "SLED", "Healthcare", "Financial", "Federal"] as const;
const COMPETENCY_FILTERS = [
 "All competencies",
 "Discovery",
 "Objection handling",
 "Competitive positioning",
 "Demo execution",
 "Value articulation",
] as const;
const STATUS_FILTERS = [
 "All statuses",
 "Not started",
 "In progress",
 "Submitted",
 "Approved",
 "Redo requested",
] as const;
const SORT_OPTIONS = ["Recommended", "Newest", "Shortest first", "By competency"] as const;

type LibraryStatus =
 | "Not started"
 | "In progress"
 | "Submitted"
 | "Approved"
 | "Redo requested";

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

function libraryStatus(submission?: ChallengeSubmission): LibraryStatus {
 if (!submission) return "Not started";
 if (submission.status === "reviewed") return "Approved";
 if (submission.status === "submitted") return "Submitted";
 if (submission.status === "in_progress" && submission.managerFeedback) return "Redo requested";
 if (submission.status === "in_progress") return "In progress";
 return "Not started";
}

function statusDotColor(status: LibraryStatus) {
 if (status === "Approved") return "bg-emerald-500";
 if (status === "Submitted") return "bg-[#0071ce]";
 if (status === "In progress") return "bg-amber-400";
 if (status === "Redo requested") return "bg-red-500";
 return "bg-[#B0ADA8]";
}

function statusPillStyle(status: LibraryStatus): { background: string; color: string } {
 if (status === "Approved") return { background: "#dcfce7", color: "#166534" };
 if (status === "Submitted") return { background: "#ede9fe", color: "#5b21b6" };
 if (status === "In progress") return { background: "#dbeafe", color: "#1d4ed8" };
 if (status === "Redo requested") return { background: "#fee2e2", color: "#b91c1c" };
 return { background: "#ECEAE6", color: "#6B6860" };
}

function primaryCompetency(challenge: Challenge) {
 const names = competencyNamesForChallenge(challenge);
 return names[0] ?? "General";
}

function difficultyPillStyle(difficulty: Challenge["difficulty"]) {
 if (difficulty === "advanced") return { background: "#ede9fe", color: "#5b21b6" };
 if (difficulty === "intermediate") return { background: "#fef3c7", color: "#b45309" };
 return { background: "#F5F4F0", color: "#6B6860" };
}

function levelPillStyle(level?: Challenge["targetLevel"]) {
 if (level === "Senior") return { background: "#e8f2fc", color: "#0057a8" };
 if (level === "Advisory") return { background: "#FFFBF0", color: "#D4810A" };
 return { background: "#ede9fe", color: "#5b21b6" };
}

function competencyBadgeTone(name: string) {
 const lower = name.toLowerCase();
 if (lower.includes("discovery")) return "bg-[#e8f2fc] text-[#0057a8]";
 if (lower.includes("objection")) return "bg-amber-50 text-amber-800";
 if (lower.includes("demo") || lower.includes("executive")) return "bg-violet-50 text-violet-800";
 return "bg-[#F5F4F0] text-[#3D3C38]";
}

function competencyPillClass(name: string) {
 const lower = name.toLowerCase();
 if (lower.includes("discovery") || lower.includes("governance")) return "bg-[#e8f2fc] text-[#0057a8]";
 if (lower.includes("workflow")) return "bg-[#F5F4F0] text-[#475569]";
 if (lower.includes("agent") || lower.includes("ai")) return "bg-[#EDE9FE] text-[#5b21b6]";
 return "bg-[#e8f2fc] text-[#0057a8]";
}

const FILTER_OPTIONS: { id: ChallengeFilter; label: string }[] = [
 { id: "all", label: "All" },
 { id: "basic", label: "Basic" },
 { id: "senior", label: "Senior" },
 { id: "advisory", label: "Advisory" },
 { id: "agentic", label: "Agentic AI" },
 { id: "active", label: "To do" },
 { id: "done", label: "Earned" },
];

function SubmissionBadge({ submission }: { submission?: ChallengeSubmission }) {
 const statusInfo = libraryStatusLabel(submission);
 if (!statusInfo.status) return null;
 if (statusInfo.label) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{statusInfo.label}</span>;
 return <StatusBadge status={statusInfo.status} />;
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
 const [seDraftTextByChallenge, setSeDraftTextByChallenge] = useState<Record<string, string>>({});

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
 if (competencyFilter !== "All competencies") {
 const names = competencyNamesForChallenge(challenge).join(" ").toLowerCase();
 if (!names.includes(competencyFilter.toLowerCase().split(" ")[0] ?? "")) return false;
 }
 if (statusFilter !== "All statuses") {
 if (libraryStatus(submissionForChallenge(submissions, challenge.id)) !== statusFilter) return false;
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
 router.replace(`/challenges?${params.toString()}`, { scroll: false });
 },
 [router, searchParams],
 );

 const selectChallenge = useCallback(
 (challengeId: string) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set("challenge", challengeId);
 if (view !== "browse") params.delete("view");
 router.replace(`/challenges?${params.toString()}`, { scroll: false });
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
 <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
 {isFocused ? (
 <p className="shrink-0 border-b border-violet-200 bg-violet-50 px-5 py-2 text-xs font-semibold text-violet-900">
 Linked from your ramp plan — complete and submit when ready.
 </p>
 ) : null}

 {view === "generate" ? (
 <div className="max-h-[min(72vh,900px)] overflow-y-auto p-4 lg:p-6">
 <ChallengeGenerator showSave />
 </div>
 ) : view === "submissions" ? (
 <div className="max-h-[min(72vh,900px)] overflow-y-auto p-4 lg:p-6">
 {submissions.length === 0 ? (
 <div className="border border-dashed border-stone-300 px-6 py-12 text-center">
 <FileUp className="mx-auto h-8 w-8 text-stone-400" />
 <p className="mt-3 font-semibold text-stone-800">No submissions yet</p>
 <p className="mt-1 text-sm text-stone-500">Browse the library and submit your first challenge.</p>
 <Button className="mt-4" onClick={() => setView("browse")} type="button">
 Browse challenges
 </Button>
 </div>
 ) : (
 <div className="space-y-2">
 {submissions.map((submission) => {
 const challenge = challenges.find((c) => c.id === submission.challengeId);
 return (
 <button
 className="flex w-full items-center justify-between gap-4 border border-stone-200 px-4 py-3 text-left transition hover:border-[#0033a1]/30 hover:bg-[#e8f2fc]/30"
 key={submission.id}
 onClick={() => {
 if (challenge) selectChallenge(challenge.id);
 setView("browse");
 }}
 type="button"
 >
 <div className="min-w-0">
 <p className="truncate font-semibold text-stone-900">{challenge?.title ?? "Challenge"}</p>
 <p className="text-xs text-stone-500">
 {submission.submittedAt
 ? new Date(submission.submittedAt).toLocaleDateString()
 : "Draft"}
 </p>
 </div>
 <SubmissionBadge submission={submission} />
 </button>
 );
 })}
 </div>
 )}
 </div>
 ) : (
 <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
 <aside className="flex min-h-0 flex-col overflow-hidden border-b border-[#E2DFD9] bg-white lg:border-b-0 lg:border-r">
 <div className="shrink-0 border-b border-[#ECEAE6] px-3.5 py-2.5">
 <div className="mb-2 flex items-center gap-1.5 border border-[#E2DFD9] bg-[#F9F8F6] px-2.5 py-1.5">
 <Search className="h-2.5 w-2.5 shrink-0 text-[#B0ADA8]" strokeWidth={1.3} />
 <input
 className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-[#3D3C38] placeholder-[#B0ADA8] outline-none"
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search challenges..."
 value={query}
 />
 </div>
 <div className="mb-2 flex flex-wrap gap-1">
 {FILTER_OPTIONS.map((option) => (
 <button
 className={`px-2.5 py-0.5 text-[10px] font-semibold ${
 filter === option.id
 ? "border border-[#7c3aed] bg-[#7c3aed] text-white"
 : "border border-[#E2DFD9] bg-white text-[#6B6860]"
 }`}
 key={option.id}
 onClick={() => setFilter(option.id)}
 type="button"
 >
 {option.label}
 </button>
 ))}
 </div>
 <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
 <select
 className="cursor-pointer border border-[#E2DFD9] bg-white px-1.5 py-1 text-[9.5px] text-[#6B6860] outline-none"
 onChange={(e) => setVerticalFilter(e.target.value as (typeof VERTICALS)[number])}
 value={verticalFilter}
 >
 {VERTICALS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 <select
 className="cursor-pointer border border-[#E2DFD9] bg-white px-1.5 py-1 text-[9.5px] text-[#6B6860] outline-none"
 onChange={(e) => setCompetencyFilter(e.target.value as (typeof COMPETENCY_FILTERS)[number])}
 value={competencyFilter}
 >
 {COMPETENCY_FILTERS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 <select
 className="cursor-pointer border border-[#E2DFD9] bg-white px-1.5 py-1 text-[9.5px] text-[#6B6860] outline-none"
 onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
 value={statusFilter}
 >
 {STATUS_FILTERS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 <select
 className="cursor-pointer border border-[#E2DFD9] bg-white px-1.5 py-1 text-[9.5px] text-[#6B6860] outline-none"
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
 </div>

 {gapRecommendations.length > 0 ? (
 <div className="shrink-0 border-b border-[#ECEAE6] bg-[#F5F0FF] px-3.5 py-2">
 <p className="text-[11px] leading-relaxed text-[#3D3C38]">
 <strong className="text-[#0D0E12]">Gaps to close:</strong>{" "}
 {gapRecommendations
 .slice(0, 2)
 .map((item) => item.gapCompetency)
 .join(" and ")}{" "}
 — challenges sorted by your biggest gaps first
 </p>
 </div>
 ) : null}

 <div className="min-h-0 flex-1 overflow-y-auto">
 {filtered.length === 0 ? (
 <p className="px-4 py-8 text-center text-sm text-[#A09D98]">No matches.</p>
 ) : (
 <div className="divide-y divide-[#F2F0EC]">
 {visibleRows.map((challenge) => {
 const submission = submissionForChallenge(submissions, challenge.id);
 const status = libraryStatus(submission);
 const isSelected = challenge.id === selectedId;
 const competency = primaryCompetency(challenge);

 return (
 <button
 className={`w-full px-3.5 py-2.5 text-left transition ${
 isSelected ? "bg-[#F5F0FF]" : "hover:bg-[#F9F8F6]"
 }`}
 key={challenge.id}
 onClick={() => selectChallenge(challenge.id)}
 type="button"
 >
 <div className="flex items-start gap-2">
 <span
 className={`mt-1 h-[7px] w-[7px] shrink-0 rounded-full ${statusDotColor(status)}`}
 />
 <div className="min-w-0 flex-1">
 <p className="mb-1 text-[11.5px] font-semibold leading-snug text-[#0D0E12]">
 {challenge.title}
 </p>
 <div className="flex flex-wrap items-center gap-1.5">
 <span className={`px-1.5 py-0.5 text-[10px] font-semibold ${competencyPillClass(competency)}`}>
 {competency}
 </span>
 <span className="font-mono text-[8.5px] text-[#A09D98]">{challenge.estimatedMinutes} min</span>
 <span
 className="px-1.5 py-0.5 font-mono text-[8.5px] font-semibold"
 style={statusPillStyle(status)}
 >
 {status}
 </span>
 </div>
 </div>
 </div>
 </button>
 );
 })}
 {visibleCount < filtered.length ? (
 <div
 className={
 tier === "se"
 ? "border-t border-[#ECEAE6] px-[14px] py-[12px] text-center"
 : "p-3"
 }
 >
 {tier === "se" ? (
 <>
 <span className="text-[11.5px] text-[#A09D98]">
 Showing {visibleRows.length} of {filtered.length} challenges ·{" "}
 </span>
 <button
 className="text-[11.5px] font-semibold text-[#7c3aed]"
 onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
 type="button"
 >
 Load more →
 </button>
 </>
 ) : (
 <Button
 className="w-full"
 onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
 type="button"
 variant="outline"
 >
 Load more ({filtered.length - visibleCount} remaining)
 </Button>
 )}
 </div>
 ) : null}
 </div>
 )}
 </div>
 </aside>

 <main className="min-h-[20rem] min-w-0 flex-1 overflow-y-auto bg-white lg:min-h-0">
 {selectedChallenge ? (
 <div className="flex h-full flex-col overflow-hidden bg-white">
 <div className="h-[3px] shrink-0 bg-gradient-to-r from-[#5b21b6] to-[#7c3aed]" />
 <div className="flex-1 overflow-y-auto">
 <div className="border-b border-[#ECEAE6] px-5 py-4">
 <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
 {selectedChallenge.targetLevel ? (
 <span
 className="px-2 py-0.5 text-[10px] font-bold"
 style={levelPillStyle(selectedChallenge.targetLevel)}
 >
 {selectedChallenge.targetLevel} SE
 </span>
 ) : null}
 <span
 className="px-2 py-0.5 text-[10px] font-bold capitalize"
 style={difficultyPillStyle(selectedChallenge.difficulty)}
 >
 {selectedChallenge.difficulty}
 </span>
 <span
 className="px-2 py-0.5 text-[10px] font-bold"
 style={
 selectedChallenge.isAiGenerated
 ? { background: "#ede9fe", color: "#5b21b6" }
 : { background: "#dcfce7", color: "#166534" }
 }
 >
 {selectedChallenge.isAiGenerated ? "AI" : "Curated"}
 </span>
 <span
 className="px-2 py-0.5 text-[10px] font-bold"
 style={statusPillStyle(libraryStatus(selectedSubmission))}
 >
 {libraryStatus(selectedSubmission)}
 </span>
 </div>
 <h2 className="font-display text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-[#0D0E12]">
 {selectedChallenge.title}
 </h2>
 <p className="mt-1 font-mono text-[9.5px] text-[#A09D98]">
 {selectedChallenge.estimatedMinutes} min · {selectedChallenge.steps.length} steps
 </p>
 <div className="mt-2 flex flex-wrap gap-1">
 {competencyNamesForChallenge(selectedChallenge).map((name) => (
 <span className={`px-2 py-0.5 text-[10px] font-semibold ${competencyPillClass(name)}`} key={name}>
 {name}
 </span>
 ))}
 </div>
 </div>

 <div className="flex flex-col gap-3.5 px-5 py-4">
 {detailLoading ? (
 <div className="space-y-3">
 <div className="h-4 w-2/3 animate-pulse bg-[#ECEAE6]" />
 <div className="h-20 animate-pulse bg-[#F9F8F6]" />
 </div>
 ) : (
 <>
 <section className="bg-[#faf8ff] px-4 py-3">
 <h3 className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#5b21b6]">Scenario</h3>
 <p className="text-xs leading-relaxed text-[#3D3C38]">{selectedChallenge.description}</p>
 </section>

 <section className="overflow-hidden border border-[#E2DFD9]">
 <div className="flex items-center justify-between bg-[#F9F8F6] px-3.5 py-2">
 <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#5b21b6]">
 Coach tips (3)
 </span>
 </div>
 <div className="grid gap-2 p-2.5 sm:grid-cols-3">
 {CHALLENGE_TIPS.map((tip) => (
 <div className="border border-[#E2DFD9] bg-white px-2.5 py-2" key={tip.label}>
 <p className="mb-0.5 font-mono text-[8px] font-semibold tracking-[0.04em]" style={{ color: tip.color }}>
 {tip.label}
 </p>
 <p className="text-[10.5px] leading-relaxed text-[#6B6860]">{tip.text}</p>
 </div>
 ))}
 </div>
 </section>

 {selectedChallenge.steps.length > 0 ? (
 <section>
 <h3 className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#0033A1]">Steps</h3>
 {selectedChallenge.steps.map((step, index) => (
 <div className="mb-2 flex items-start gap-2.5" key={index}>
 <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#EEF4FF] font-mono text-[9px] font-semibold text-[#0033A1]">
 {index + 1}
 </div>
 <p className="pt-0.5 text-xs leading-relaxed text-[#3D3C38]">{step}</p>
 </div>
 ))}
 </section>
 ) : null}

 {selectedChallenge.successCriteria.length > 0 ? (
 <section>
 <h3 className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#0033A1]">
 Success criteria
 </h3>
 {selectedChallenge.successCriteria.map((criterion) => (
 <div className="mb-1.5 flex items-start gap-2" key={criterion}>
 <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A6E45]" strokeWidth={1.5} />
 <span className="text-xs leading-relaxed text-[#3D3C38]">{criterion}</span>
 </div>
 ))}
 </section>
 ) : null}

 {selectedChallenge.linkedResources.length > 0 ? (
 <section>
 <h3 className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#0033A1]">Resources</h3>
 {selectedChallenge.linkedResources.map((resource) => (
 <a
 className="flex items-center gap-1.5 border border-[#E2DFD9] bg-[#F9F8F6] px-2.5 py-1.5 text-[11.5px] text-[#0033A1] hover:bg-[#EEF4FF]"
 href={resource}
 key={resource}
 rel="noreferrer"
 target="_blank"
 >
 <BookOpen className="h-2.5 w-2.5" />
 {resource.replace(/^https?:\/\//, "").slice(0, 64)}
 <ExternalLink className="ml-auto h-2.5 w-2.5" />
 </a>
 ))}
 </section>
 ) : null}

 {selectedSubmission?.managerFeedback ? (
 <section className="border border-amber-200 bg-amber-50 px-4 py-3">
 <h3 className="text-[10px] font-bold uppercase text-amber-900">Manager feedback</h3>
 <p className="mt-1.5 text-xs leading-relaxed text-amber-950">{selectedSubmission.managerFeedback}</p>
 </section>
 ) : null}

 <div className="mx-0 mb-5" id="challenge-submit">
 <ChallengeSubmissionForm
 challengeId={selectedChallenge.id}
 defaultReflection={selectedDraftText}
 variant="handoff"
 />
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 ) : (
 <div className="flex h-full items-center justify-center p-8 text-center">
 <div>
 <LayoutList className="mx-auto h-10 w-10 text-stone-300" />
 <p className="mt-3 font-semibold text-stone-700">Select a challenge</p>
 <p className="mt-1 text-sm text-stone-500">
 Use the list on the left to browse {stats.total} options.
 </p>
 </div>
 </div>
 )}
 </main>
 </div>
 )}
 </div>
 );
}
