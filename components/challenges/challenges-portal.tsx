"use client";

import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileUp,
  HelpCircle,
  LayoutList,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ChallengeSubmissionForm } from "@/components/challenges/submission-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ChallengeFilter,
  difficultyTone,
  filterChallenges,
  libraryStatusLabel,
  sortChallenges,
  submissionForChallenge,
} from "@/lib/challenges/challenge-library-utils";
import {
  certificationHrefForCompetency,
  competencyNamesForChallenge,
} from "@/lib/challenges/lookup-competencies";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";
import type { Challenge, ChallengeSubmission } from "@/lib/types";

const ChallengeGenerator = dynamic(
  () => import("@/components/challenge-generator").then((mod) => mod.ChallengeGenerator),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-stone-100" /> },
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
  return "bg-[#cbd5e1]";
}

function statusPillStyle(status: LibraryStatus): { background: string; color: string } {
  if (status === "Approved") return { background: "#dcfce7", color: "#166534" };
  if (status === "Submitted") return { background: "#ede9fe", color: "#5b21b6" };
  if (status === "In progress") return { background: "#dbeafe", color: "#1d4ed8" };
  if (status === "Redo requested") return { background: "#fee2e2", color: "#b91c1c" };
  return { background: "#f1f5f9", color: "#64748b" };
}

function formatAutoSaved(savedAt: string | null): string {
  if (!savedAt) return "just now";
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function primaryCompetency(challenge: Challenge) {
  const names = competencyNamesForChallenge(challenge);
  return names[0] ?? "General";
}

function competencyBadgeTone(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("discovery")) return "bg-[#e8f2fc] text-[#0057a8]";
  if (lower.includes("objection")) return "bg-amber-50 text-amber-800";
  if (lower.includes("demo") || lower.includes("executive")) return "bg-violet-50 text-violet-800";
  return "bg-[#f4f8fd] text-[#475569]";
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

function CompetencyTags({ challenge }: { challenge: Pick<Challenge, "id" | "competencyNames"> }) {
  const competencies = competencyNamesForChallenge(challenge);
  if (competencies.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {competencies.map((name) => (
        <Link
          className="inline-flex items-center rounded-full border border-[#0033a1]/20 bg-[#e8f2fc]/60 px-2 py-0.5 text-[10px] font-semibold text-[#0033a1] hover:bg-[#e8f2fc]"
          href={certificationHrefForCompetency(name)}
          key={name}
          onClick={(event) => event.stopPropagation()}
        >
          {name}
        </Link>
      ))}
    </div>
  );
}

function SubmissionBadge({ submission }: { submission?: ChallengeSubmission }) {
  const statusInfo = libraryStatusLabel(submission);
  if (!statusInfo.status) return null;
  if (statusInfo.label) return <Badge tone="amber">{statusInfo.label}</Badge>;
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
  suppressHeaderStats = false,
}: {
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
  initialChallengeId: string | null;
  isFocused: boolean;
  tier: "se" | "manager" | "admin";
  showGenerator: boolean;
  gapRecommendations?: GapChallengeRecommendation[];
  /** When page header shows stats via SEPageLayout headerRight */
  suppressHeaderStats?: boolean;
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
  const [showHelp, setShowHelp] = useState(false);
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailChallenge, setDetailChallenge] = useState<Challenge | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [seDraftTextByChallenge, setSeDraftTextByChallenge] = useState<Record<string, string>>({});
  const [seDraftSavedAtByChallenge, setSeDraftSavedAtByChallenge] = useState<Record<string, string>>({});

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
  const selectedDraftSavedAt = selectedChallenge
    ? (seDraftSavedAtByChallenge[selectedChallenge.id] ?? null)
    : null;

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
    let nextSavedAt: string | null = null;
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { text?: string; savedAt?: string };
          nextText = parsed.text ?? nextText;
          nextSavedAt = parsed.savedAt ?? null;
        } catch {
          nextText = selectedSubmission?.reflectionText ?? "";
        }
      }
    }
    setSeDraftTextByChallenge((current) =>
      current[selectedChallenge.id] === nextText ? current : { ...current, [selectedChallenge.id]: nextText },
    );
    if (nextSavedAt) {
      setSeDraftSavedAtByChallenge((current) => ({ ...current, [selectedChallenge.id]: nextSavedAt }));
    }
  }, [selectedChallenge, selectedSubmission?.reflectionText, tier]);

  useEffect(() => {
    if (tier !== "se" || !selectedChallenge) return;
    const trimmed = selectedDraftText.trim();
    if (!trimmed) return;
    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      if (typeof window !== "undefined") {
        const key = `se-challenge-draft:${selectedChallenge.id}`;
        window.localStorage.setItem(
          key,
          JSON.stringify({
            text: selectedDraftText,
            savedAt,
          }),
        );
      }
      setSeDraftSavedAtByChallenge((current) => ({ ...current, [selectedChallenge.id]: savedAt }));
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

  const saveSeDraft = useCallback(() => {
    if (!selectedChallenge) return;
    const savedAt = new Date().toISOString();
    if (typeof window !== "undefined") {
      const key = `se-challenge-draft:${selectedChallenge.id}`;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          text: selectedDraftText,
          savedAt,
        }),
      );
    }
    setSeDraftSavedAtByChallenge((current) => ({ ...current, [selectedChallenge.id]: savedAt }));
    toast.success("Draft saved.");
  }, [selectedChallenge, selectedDraftText]);

  const stats = useMemo(() => {
    const earned = earnedTrophyChallengeIds.size;
    const inFlight = submissions.filter(
      (s) => s.status === "submitted" || s.status === "in_progress",
    ).length;
    const redo = submissions.filter((s) => s.status === "in_progress" && s.managerFeedback).length;
    return { total: challenges.length, earned, inFlight, redo };
  }, [challenges.length, earnedTrophyChallengeIds.size, submissions]);

  return (
    <div
      className={
        tier === "se"
          ? "animate-[fadeUp_0.2s_ease-out] flex min-h-0 flex-1 flex-col overflow-hidden"
          : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]"
      }
    >
      <div
        className={
          tier === "se"
            ? "shrink-0 pb-3"
            : "border-b border-[#e2eaf5] bg-[#f8fafd] px-4 py-3"
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          {tier === "se" ? (
            !suppressHeaderStats ? (
            <div className="ml-auto flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="text-[#64748b]">{stats.total} challenges</span>
              <span className="text-[#d0dae8]">·</span>
              {stats.inFlight > 0 ? (
                <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 font-semibold text-[#1d4ed8]">
                  {stats.inFlight} in progress
                </span>
              ) : null}
              {stats.redo > 0 ? (
                <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-semibold text-[#b45309]">
                  {stats.redo} redo requested
                </span>
              ) : null}
            </div>
            ) : null
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-200 bg-white p-1">
                <button
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    view === "browse" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:bg-stone-50"
                  }`}
                  onClick={() => setView("browse")}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutList className="h-3.5 w-3.5" />
                    Browse
                  </span>
                </button>
                <button
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    view === "submissions" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:bg-stone-50"
                  }`}
                  onClick={() => setView("submissions")}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FileUp className="h-3.5 w-3.5" />
                    My submissions
                    {stats.inFlight > 0 ? ` (${stats.inFlight})` : ""}
                  </span>
                </button>
                {showGenerator ? (
                  <button
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      view === "generate" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:bg-stone-50"
                    }`}
                    onClick={() => setView("generate")}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI generate
                    </span>
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-stone-500">
                <span>{stats.total} challenges</span>
                <span className="text-stone-300">·</span>
                <span>{stats.earned} earned</span>
                {stats.inFlight > 0 ? (
                  <span className="rounded-full bg-[#e8f2fc] px-2 py-0.5 text-[10px] font-bold text-[#0057a8]">
                    {stats.inFlight} in progress
                  </span>
                ) : null}
                {stats.redo > 0 ? (
                  <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                    {stats.redo} redo requested
                  </span>
                ) : null}
                <button
                  className="inline-flex items-center gap-1 text-[#0033a1] hover:underline"
                  onClick={() => setShowHelp((open) => !open)}
                  type="button"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {showHelp ? "Hide tips" : "How it works"}
                </button>
              </div>
            </>
          )}
        </div>

        {gapRecommendations.length > 0 ? (
          <div
            className={
              tier === "se"
                ? "mt-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-[rgba(124,58,237,0.12)] bg-gradient-to-r from-[#faf5ff] to-[#f0f7ff] px-3.5 py-2.5"
                : "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"
            }
          >
            <p className="flex-1 text-[11.5px] text-[#475569]">
              <span className="font-bold text-[#0a1628]">Gaps to close:</span>{" "}
              {gapRecommendations
                .slice(0, 2)
                .map((item) => item.gapCompetency)
                .join(" and ")}{" "}
              — challenges below are sorted by your biggest gaps first
            </p>
            <button
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                showGapsOnly
                  ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                  : "border-[#e2eaf5] bg-white text-[#334155]"
              }`}
              onClick={() => setShowGapsOnly((value) => !value)}
              type="button"
            >
              {showGapsOnly ? "Show all" : "Show only gaps"}
            </button>
          </div>
        ) : null}

        {tier !== "se" && showHelp ? (
          <div className="mt-3 rounded-xl border border-[#0033a1]/15 bg-[#e8f2fc]/40 px-4 py-3 text-sm leading-6 text-stone-600">
            <p>
              Browse the curated library, generate new AI challenges, or assign challenges from ramp
              plans. SEs submit evidence from the same portal.
            </p>
          </div>
        ) : null}

        {isFocused ? (
          <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">
            Linked from your ramp plan — complete and submit when ready.
          </p>
        ) : null}
      </div>

      {view === "generate" ? (
        <div className="max-h-[min(72vh,900px)] overflow-y-auto p-4 lg:p-6">
          <ChallengeGenerator showSave />
        </div>
      ) : view === "submissions" ? (
        <div className="max-h-[min(72vh,900px)] overflow-y-auto p-4 lg:p-6">
          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
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
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3 text-left transition hover:border-[#0033a1]/30 hover:bg-[#e8f2fc]/30"
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
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-[#e2eaf5] lg:w-[min(100%,38vw)] lg:min-w-[360px] lg:max-w-[520px] lg:border-b-0 lg:border-r xl:w-[40%]">
            <div
              className={
                tier === "se"
                  ? "shrink-0 space-y-2.5 border-b border-[#f1f5f9] p-4"
                  : "shrink-0 space-y-3 border-b border-[#f1f5f9] p-4"
              }
            >
              {tier === "se" ? (
                <>
                  <div className="flex items-center gap-2 rounded-[9px] border-[1.5px] border-[#e2eaf5] bg-white px-3 py-2">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" strokeWidth={1.3} />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1e293b] placeholder-[#94a3b8] outline-none"
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by title, persona, or keyword…"
                      value={query}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="min-w-[7.5rem] flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#e2eaf5] bg-white px-2.5 py-1.5 text-[12px] text-[#374151] outline-none"
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
                      className="min-w-[7.5rem] flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#e2eaf5] bg-white px-2.5 py-1.5 text-[12px] text-[#374151] outline-none"
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
                      className="min-w-[7.5rem] flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#e2eaf5] bg-white px-2.5 py-1.5 text-[12px] text-[#374151] outline-none"
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
                      className="min-w-[7.5rem] flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#e2eaf5] bg-white px-2.5 py-1.5 text-[12px] text-[#374151] outline-none"
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
                </>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      className="h-10 w-full rounded-lg border border-[#e2eaf5] bg-[#f8fafd] pl-9 pr-3 text-sm outline-none focus:border-[#0033a1]/30 focus:bg-white"
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search challenges…"
                      value={query}
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {FILTER_OPTIONS.map((option) => (
                      <button
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          filter === option.id
                            ? "bg-[#7c3aed] text-white"
                            : "bg-[#f4f8fd] text-[#64748b] hover:bg-[#e2eaf5]"
                        }`}
                        key={option.id}
                        onClick={() => setFilter(option.id)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <select
                      className="h-9 rounded-lg border border-[#e2eaf5] bg-white px-2 text-[11px] font-semibold text-[#475569]"
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
                      className="h-9 rounded-lg border border-[#e2eaf5] bg-white px-2 text-[11px] font-semibold text-[#475569]"
                      onChange={(e) =>
                        setCompetencyFilter(e.target.value as (typeof COMPETENCY_FILTERS)[number])
                      }
                      value={competencyFilter}
                    >
                      {COMPETENCY_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 rounded-lg border border-[#e2eaf5] bg-white px-2 text-[11px] font-semibold text-[#475569]"
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
                      className="h-9 rounded-lg border border-[#e2eaf5] bg-white px-2 text-[11px] font-semibold text-[#475569]"
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
                </>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#94a3b8]">No matches.</p>
              ) : (
                <div className={tier === "se" ? "divide-y divide-[#f1f5f9] border-t border-[#e2eaf5] bg-white" : "divide-y divide-[#f1f5f9]"}>
                  {visibleRows.map((challenge) => {
                    const submission = submissionForChallenge(submissions, challenge.id);
                    const status = libraryStatus(submission);
                    const isSelected = challenge.id === selectedId;
                    const competency = primaryCompetency(challenge);

                    return (
                      <button
                        className={`w-full px-4 py-3 text-left transition ${
                          tier === "se"
                            ? isSelected
                              ? "bg-[#f0f7ff]"
                              : "hover:bg-[#f7fafd]"
                            : isSelected
                              ? "bg-[#ede9fe]/60 ring-1 ring-inset ring-[#7c3aed]/20"
                              : "hover:bg-[#f8fafd]"
                        }`}
                        key={challenge.id}
                        onClick={() => selectChallenge(challenge.id)}
                        type="button"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor(status)}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#0a1628]">
                              {challenge.title}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${competencyBadgeTone(competency)}`}
                              >
                                {competency}
                              </span>
                              <span className="text-[11px] text-[#64748b]">{challenge.estimatedMinutes} min</span>
                              {tier === "se" ? (
                                <span className="rounded-full bg-[#e8f2fc] px-2 py-0.5 text-[10px] font-semibold text-[#0057a8]">
                                  {inferVertical(challenge)}
                                </span>
                              ) : null}
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
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
                          ? "border-t border-[#f1f5f9] px-[14px] py-[12px] text-center"
                          : "p-3"
                      }
                    >
                      {tier === "se" ? (
                        <>
                          <span className="text-[11.5px] text-[#94a3b8]">
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

          <main className="min-h-[20rem] min-w-0 flex-1 overflow-y-auto lg:min-h-0">
            {selectedChallenge ? (
              <div
                className={
                  tier === "se"
                    ? "flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(124,58,237,0.07)]"
                    : "flex h-full flex-col"
                }
                style={tier === "se" ? { border: "2px solid rgba(124,58,237,0.18)" } : undefined}
              >
                <div className="h-[4px] bg-gradient-to-r from-[#5b21b6] to-[#7c3aed]" />
                <div className="border-b border-[#e2eaf5] px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {tier === "se" ? (
                      <>
                        <span className="rounded-full bg-[#ede9fe] px-[8px] py-[2px] text-[9.5px] font-bold text-[#5b21b6]">
                          Challenge
                        </span>
                        <span
                          className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                          style={statusPillStyle(libraryStatus(selectedSubmission))}
                        >
                          {libraryStatus(selectedSubmission)}
                        </span>
                      </>
                    ) : (
                      <>
                        {selectedChallenge.targetLevel ? (
                          <Badge tone="blue">{selectedChallenge.targetLevel} SE</Badge>
                        ) : null}
                        <Badge tone={difficultyTone(selectedChallenge.difficulty)}>
                          {selectedChallenge.difficulty}
                        </Badge>
                        <Badge tone={selectedChallenge.isAiGenerated ? "magenta" : "green"}>
                          {selectedChallenge.isAiGenerated ? "AI" : "Curated"}
                        </Badge>
                        <SubmissionBadge submission={selectedSubmission} />
                      </>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-stone-900">{selectedChallenge.title}</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {selectedChallenge.estimatedMinutes} min · {selectedChallenge.steps.length} steps
                  </p>
                  <div className="mt-2">
                    <CompetencyTags challenge={selectedChallenge} />
                  </div>
                </div>

                <div className="flex-1 space-y-5 px-5 py-4">
                  {detailLoading ? (
                    <div className="space-y-3">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
                      <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
                      <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
                    </div>
                  ) : (
                    <>
                  <section className="rounded-xl bg-[#faf8ff] p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#5b21b6]">Scenario</h3>
                    <p className="mt-2 text-sm leading-6 text-[#475569]">{selectedChallenge.description}</p>
                  </section>

                  <section className="rounded-xl border border-[#e2eaf5] bg-[#f9fafc]">
                    <details className="group">
                      <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#5b21b6] marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          Coach tips
                          <span className="text-[10px] font-semibold normal-case text-[#94a3b8] group-open:hidden">
                            (3)
                          </span>
                        </span>
                      </summary>
                      <div className="flex flex-col gap-2 border-t border-[#e2eaf5] p-3 sm:flex-row">
                        {CHALLENGE_TIPS.map((tip) => (
                          <div
                            className="flex-1 rounded-lg border border-[#e2eaf5] bg-white p-2.5"
                            key={tip.label}
                          >
                            <p className="text-[9.5px] font-bold" style={{ color: tip.color }}>
                              {tip.label}
                            </p>
                            <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#475569]">{tip.text}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </section>

                  {selectedChallenge.steps.length > 0 ? (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[#0033a1]">Steps</h3>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-stone-600">
                        {selectedChallenge.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </section>
                  ) : null}

                  {selectedChallenge.successCriteria.length > 0 ? (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[#0033a1]">
                        Success criteria
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {selectedChallenge.successCriteria.map((criterion) => (
                          <li className="flex gap-2 text-sm leading-6 text-stone-600" key={criterion}>
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {selectedChallenge.linkedResources.length > 0 ? (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[#0033a1]">Resources</h3>
                      <ul className="mt-2 space-y-1">
                        {selectedChallenge.linkedResources.map((resource) => (
                          <li key={resource}>
                            <a
                              className="inline-flex items-center gap-1 text-sm text-[#0033a1] hover:underline"
                              href={resource}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              {resource.replace(/^https?:\/\//, "").slice(0, 64)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {selectedSubmission?.managerFeedback ? (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="text-xs font-bold uppercase text-amber-900">Manager feedback</h3>
                      <p className="mt-2 text-sm leading-6 text-amber-950">
                        {selectedSubmission.managerFeedback}
                      </p>
                    </section>
                  ) : null}

                  {tier === "se" ? (
                    <section className="rounded-xl border border-[#e2eaf5] bg-[#f8fafd] p-4" id="challenge-submit">
                      <h3 className="text-[11.5px] font-bold text-[#0a1628]">Your response</h3>
                      <textarea
                        className="mt-2 w-full resize-none rounded-lg border-[1.5px] border-[#e2eaf5] bg-white p-[8px_12px] text-[12.5px] text-[#1e293b] leading-[1.55] outline-none transition focus:border-[#0071ce] focus:shadow-[0_0_0_3px_rgba(0,113,206,0.1)]"
                        onChange={(event) => {
                          if (!selectedChallenge) return;
                          const nextText = event.target.value;
                          setSeDraftTextByChallenge((current) => ({
                            ...current,
                            [selectedChallenge.id]: nextText,
                          }));
                        }}
                        placeholder="Q1: How many AI agents currently have access to production systems..."
                        rows={7}
                        value={selectedDraftText}
                      />
                      <div className="mt-[10px] flex flex-wrap items-center gap-[9px]">
                        <button
                          className="inline-flex items-center gap-[5px] rounded-lg bg-[#0071ce] px-[18px] py-[9px] text-[12.5px] font-semibold text-white transition disabled:opacity-40"
                          onClick={() =>
                            document.getElementById("se-submission-form")?.scrollIntoView({ behavior: "smooth" })
                          }
                          disabled={!selectedDraftText.trim()}
                          type="button"
                        >
                          Submit for review →
                        </button>
                        <button
                          className="inline-flex items-center gap-[5px] rounded-lg border border-[#e2eaf5] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#334155]"
                          onClick={saveSeDraft}
                          type="button"
                        >
                          Save draft
                        </button>
                        <span className="text-[11px] text-[#94a3b8]">
                          Auto-saved {formatAutoSaved(selectedDraftSavedAt)}
                        </span>
                      </div>
                      <div className="mt-3 rounded-lg border border-[#e2eaf5] bg-white p-3" id="se-submission-form">
                        <p className="text-[11px] text-[#64748b]">
                          Add evidence and submit using the existing workflow:
                        </p>
                        <div className="mt-2">
                          <ChallengeSubmissionForm
                            challengeId={selectedChallenge.id}
                            defaultReflection={selectedDraftText}
                          />
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="rounded-xl border border-[#0033a1]/15 bg-[#e8f2fc]/25 p-4" id="challenge-submit">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                        <FileUp className="h-4 w-4 text-[#0033a1]" />
                        Submit for review
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        Upload evidence and a short reflection — your manager is notified.
                      </p>
                      <div className="mt-4">
                        <ChallengeSubmissionForm challengeId={selectedChallenge.id} />
                      </div>
                    </section>
                  )}

                  {submissions.filter((item) => item.challengeId === selectedChallenge.id).length > 0 ? (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Past submissions</h3>
                      <div className="mt-2 space-y-2">
                        {submissions
                          .filter((item) => item.challengeId === selectedChallenge.id)
                          .map((item) => (
                            <div
                              className="flex items-center justify-between rounded-lg border border-[#e2eaf5] bg-[#f8fafd] px-3 py-2"
                              key={item.id}
                            >
                              <div>
                                <p className="text-xs font-semibold text-[#0a1628]">{selectedChallenge.title}</p>
                                <p className="text-[10px] text-[#94a3b8]">
                                  {item.submittedAt
                                    ? new Date(item.submittedAt).toLocaleDateString()
                                    : "Draft"}
                                </p>
                              </div>
                              <SubmissionBadge submission={item} />
                            </div>
                          ))}
                      </div>
                    </section>
                  ) : null}
                    </>
                  )}
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
