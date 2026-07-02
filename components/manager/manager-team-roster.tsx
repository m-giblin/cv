"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CoachingHealth } from "@/lib/manager/se-coaching-summary";
import { healthBadgeTone } from "@/lib/manager/se-coaching-summary";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { Profile, UserPlan } from "@/lib/types";
import { formatPercent, initials } from "@/lib/utils";

type RosterFilter = "attention" | "all" | CoachingHealth;

const FILTER_OPTIONS: { id: RosterFilter; label: string }[] = [
  { id: "attention", label: "Needs attention" },
  { id: "coach_now", label: "Coach now" },
  { id: "waiting_on_se", label: "Waiting" },
  { id: "on_track", label: "On track" },
  { id: "all", label: "All" },
];

const HEALTH_ORDER: Record<CoachingHealth, number> = {
  coach_now: 0,
  at_risk: 1,
  stalled: 2,
  waiting_on_se: 3,
  on_track: 4,
};

function quarterLabel(date: string) {
  const month = new Date(date).getMonth();
  const year = new Date(date).getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

function isAttentionHealth(health: CoachingHealth) {
  return health !== "on_track";
}

function RosterFlags({ coaching }: { coaching?: SeCoachingSummary }) {
  if (!coaching) return null;
  const flags: string[] = [];
  if (coaching.openReviewCount > 0) flags.push(`${coaching.openReviewCount} inbox`);
  if (coaching.redoCount > 0) flags.push(`${coaching.redoCount} redo`);
  if (coaching.quarterlyChip) flags.push(coaching.quarterlyChip);

  if (flags.length === 0) return null;

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            flag.includes("overdue") || flag.includes("inbox")
              ? "bg-amber-100 text-amber-900"
              : flag.includes("redo")
                ? "bg-violet-100 text-violet-900"
                : "bg-amber-50 text-amber-800"
          }`}
          key={flag}
        >
          {flag}
        </span>
      ))}
    </div>
  );
}

function CompactRosterRow({
  profile,
  plan,
  coaching,
  isSelected,
  onSelect,
}: {
  profile: Profile;
  plan?: UserPlan;
  coaching?: SeCoachingSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sim =
    coaching?.latestSimScore ?? coaching?.avgSimScore ?? null;
  const simTrend =
    coaching?.simTrendLabel.includes("Improving")
      ? "↑"
      : coaching?.simTrendLabel.includes("Slipping")
        ? "↓"
        : "";

  return (
    <button
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-sp-blue/5 px-3 py-2 text-left transition last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_3rem_3rem_3rem_auto] sm:gap-3 sm:px-4 ${
        isSelected ? "bg-sp-blue-soft/50 ring-1 ring-inset ring-sp-blue/25" : "hover:bg-sp-blue-soft/25"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta text-[10px] font-bold text-white">
          {initials(profile.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-sp-navy">{profile.fullName}</p>
          <p className="truncate text-[10px] capitalize text-sp-navy-muted">{profile.level}</p>
          <div className="sm:hidden">
            <RosterFlags coaching={coaching} />
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        {coaching ? (
          <Badge tone={healthBadgeTone(coaching.health)}>{coaching.healthLabel}</Badge>
        ) : null}
      </div>
      <span className="hidden text-right text-xs font-semibold text-sp-navy sm:block">
        {formatPercent(plan?.progress ?? 0)}
      </span>
      <span className="hidden text-right text-xs font-semibold text-sp-navy sm:block">
        {coaching?.devGoalsTotal ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}` : "—"}
      </span>
      <span className="hidden text-right text-xs font-semibold text-sp-navy sm:block">
        {sim !== null ? `${sim}${simTrend}` : "—"}
      </span>
      <div className="hidden sm:flex sm:justify-end">
        <ChevronRight className="h-4 w-4 text-sp-navy-muted" />
      </div>

      <div className="flex flex-col items-end gap-1 sm:hidden">
        {coaching ? (
          <Badge tone={healthBadgeTone(coaching.health)}>{coaching.healthLabel}</Badge>
        ) : null}
        <span className="text-[10px] font-semibold text-sp-navy-muted">
          {formatPercent(plan?.progress ?? 0)} · {sim ?? "—"}
        </span>
      </div>
    </button>
  );
}

export function ManagerTeamRoster({
  org,
  plans,
  coachingByUser,
  selectedProfileId,
  onSelectProfile,
}: {
  org: Profile[];
  plans: UserPlan[];
  coachingByUser: Record<string, SeCoachingSummary>;
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
}) {
  const largeTeam = org.length >= 6;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>(largeTeam ? "attention" : "all");
  const [onTrackExpanded, setOnTrackExpanded] = useState(!largeTeam);

  const cohortSummary = useMemo(() => {
    const cohorts = new Map<string, number>();
    for (const profile of org) {
      const plan = plans.find((item) => item.userId === profile.id);
      const key = plan?.startDate ? quarterLabel(plan.startDate) : "Unassigned";
      cohorts.set(key, (cohorts.get(key) ?? 0) + 1);
    }
    return [...cohorts.entries()].map(([label, count]) => `${label} (${count})`).join(", ");
  }, [org, plans]);

  const sorted = useMemo(
    () =>
      [...org].sort((a, b) => {
        const healthA = coachingByUser[a.id]?.health ?? "on_track";
        const healthB = coachingByUser[b.id]?.health ?? "on_track";
        if (HEALTH_ORDER[healthA] !== HEALTH_ORDER[healthB]) {
          return HEALTH_ORDER[healthA] - HEALTH_ORDER[healthB];
        }
        return (
          (coachingByUser[a.id]?.onboardingProgress ?? 0) -
          (coachingByUser[b.id]?.onboardingProgress ?? 0)
        );
      }),
    [org, coachingByUser],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<RosterFilter, number> = {
      attention: 0,
      all: org.length,
      coach_now: 0,
      waiting_on_se: 0,
      stalled: 0,
      at_risk: 0,
      on_track: 0,
    };
    for (const profile of org) {
      const health = coachingByUser[profile.id]?.health ?? "on_track";
      counts[health] += 1;
      if (isAttentionHealth(health)) counts.attention += 1;
    }
    return counts;
  }, [org, coachingByUser]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sorted.filter((profile) => {
      const coaching = coachingByUser[profile.id];
      const health = coaching?.health ?? "on_track";

      if (query && !profile.fullName.toLowerCase().includes(query)) {
        return false;
      }

      if (filter === "all") return true;
      if (filter === "attention") return isAttentionHealth(health);
      return health === filter;
    });
  }, [sorted, coachingByUser, search, filter]);

  const attentionList = filtered.filter((p) =>
    isAttentionHealth(coachingByUser[p.id]?.health ?? "on_track"),
  );
  const onTrackList = filtered.filter(
    (p) => (coachingByUser[p.id]?.health ?? "on_track") === "on_track",
  );

  const showSplitView =
    filter === "all" && !search.trim() && largeTeam && !onTrackExpanded && onTrackList.length > 0;

  const visibleRows = showSplitView ? attentionList : filtered;

  return (
    <Card className="flex flex-col">
      <CardHeader className="shrink-0 space-y-3 pb-2">
        <div>
          <CardTitle>Team roster</CardTitle>
          <CardDescription>
            {org.length} SE{org.length === 1 ? "" : "s"}
            {cohortSummary ? ` · ${cohortSummary}` : ""}
            {largeTeam ? " · Compact view" : ""}
          </CardDescription>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-navy-muted" />
          <Input
            className="h-9 pl-9 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            value={search}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => {
            const count = filterCounts[option.id];
            if (option.id !== "all" && count === 0) return null;

            return (
              <button
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  filter === option.id
                    ? "bg-sp-blue text-white"
                    : "bg-sp-blue-soft/50 text-sp-navy-muted hover:bg-sp-blue-soft"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}
                {count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* Column headers — desktop compact table */}
      <div className="hidden border-y border-sp-blue/10 bg-sp-blue-soft/25 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-sp-navy-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_5.5rem_3rem_3rem_3rem_auto] sm:gap-3">
        <span>SE</span>
        <span>Status</span>
        <span className="text-right">Onb</span>
        <span className="text-right">Dev</span>
        <span className="text-right">Sim</span>
        <span />
      </div>

      <div className="max-h-[min(22rem,42vh)] overflow-y-auto">
        {visibleRows.length === 0 && !showSplitView ? (
          <p className="px-4 py-8 text-center text-sm text-sp-navy-muted">
            {search ? "No matches." : "No one in this filter."}
          </p>
        ) : (
          visibleRows.map((profile) => (
            <CompactRosterRow
              coaching={coachingByUser[profile.id]}
              isSelected={selectedProfileId === profile.id}
              key={profile.id}
              onSelect={() => onSelectProfile(profile.id)}
              plan={plans.find((item) => item.userId === profile.id)}
              profile={profile}
            />
          ))
        )}

        {showSplitView && onTrackList.length > 0 ? (
          <button
            className="flex w-full items-center justify-between gap-2 border-t border-sp-blue/10 bg-sp-blue-soft/15 px-4 py-3 text-left text-sm font-semibold text-sp-navy transition hover:bg-sp-blue-soft/30"
            onClick={() => setOnTrackExpanded(true)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Show {onTrackList.length} on track
            </span>
            <span className="text-xs font-normal text-sp-navy-muted">Click to expand full roster</span>
          </button>
        ) : null}

        {filter === "all" && !search.trim() && largeTeam && onTrackExpanded && onTrackList.length > 0 ? (
          <button
            className="w-full border-t border-sp-blue/10 px-4 py-2 text-xs font-semibold text-sp-blue hover:bg-sp-blue-soft/20"
            onClick={() => setOnTrackExpanded(false)}
            type="button"
          >
            Collapse on-track SEs
          </button>
        ) : null}
      </div>

      <p className="shrink-0 border-t border-sp-blue/10 px-4 py-2 text-[11px] text-sp-navy-muted">
        Click any row for the full growth story — detail opens in the side panel.
      </p>
    </Card>
  );
}
