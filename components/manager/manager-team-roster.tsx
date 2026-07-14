"use client";

import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  ManagerStatStrip,
  ROSTER_GRID_COLS,
  SeAvatar,
  healthBadgeStyle,
  rampBarColor,
  simScoreColor,
} from "@/components/manager/manager-ui-primitives";
import type { CoachingHealth } from "@/lib/manager/se-coaching-summary";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

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

function inboxColor(count: number) {
 return count > 0 ? "#f59e0b" : "#A09D98";
}

function RosterRow({
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
 const progress = plan?.progress ?? coaching?.onboardingProgress ?? 0;
 const rampLabel = `${progress}%`;
 const rampColor = rampBarColor(progress);
 const sim = coaching?.latestSimScore ?? coaching?.avgSimScore ?? null;
 const health = coaching ? healthBadgeStyle(coaching.health) : healthBadgeStyle("on_track");
 const inboxCount = coaching?.openReviewCount ?? 0;
 const devGoals =
 coaching && coaching.devGoalsTotal > 0
 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}`
 : "—";

 return (
 <button
 className={`grid w-full items-center border-b border-[#f9fafb] px-[16px] py-[11px] text-left transition hover:bg-[#f7fafd] ${
 isSelected ? "bg-[#f0f7ff]" : ""
 }`}
 onClick={onSelect}
 style={{ gridTemplateColumns: ROSTER_GRID_COLS }}
 type="button"
 >
 <div className="flex items-center gap-[9px]">
 <SeAvatar id={profile.id} initials={initials(profile.fullName)} size="md" />
 <div className="text-left">
 <p className="text-[12px] font-semibold text-[#3D3C38]">{profile.fullName}</p>
 <p className="text-[10px] capitalize text-[#A09D98]">{profile.level}</p>
 </div>
 </div>
 <span
 className="font-mono text-[8px] uppercase tracking-[0.08em] px-[9px] py-[2.5px] text-[9.5px] font-bold"
 style={{ background: health.bg, color: health.color }}
 >
 {health.label}
 </span>
 <div className="flex items-center gap-[7px]">
 <div className="h-[5px] w-[60px] overflow-hidden rounded-full bg-[#ECEAE6]">
 <div
 className="prog-fill h-full rounded-full"
 style={{ width: `${progress}%`, background: rampColor }}
 />
 </div>
 <span className="text-[11.5px] font-bold text-[#3D3C38]">{rampLabel}</span>
 </div>
 <span className="text-[12px] font-bold" style={{ color: simScoreColor(sim) }}>
 {sim ?? "—"}
 </span>
 <span className="text-[12px] text-[#3D3C38]">{devGoals}</span>
 <span className="text-[11px] font-semibold" style={{ color: inboxColor(inboxCount) }}>
 {inboxCount > 0 ? inboxCount : "—"}
 </span>
 <ChevronRight className="h-[13px] w-[13px] text-[#A09D98]" strokeWidth={1.5} />
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
 const [search, setSearch] = useState("");
 const [filter, setFilter] = useState<RosterFilter>("all");

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

 const rosterStats = useMemo(() => {
  const progresses = org.map((profile) => {
   const plan = plans.find((item) => item.userId === profile.id);
   return plan?.progress ?? coachingByUser[profile.id]?.onboardingProgress ?? 0;
  });
  const avgRamp = progresses.length
   ? Math.round(progresses.reduce((sum, value) => sum + value, 0) / progresses.length)
   : 0;
  const simScores = org
   .map((profile) => coachingByUser[profile.id]?.avgSimScore ?? coachingByUser[profile.id]?.latestSimScore)
   .filter((score): score is number => score != null);
  const avgSim = simScores.length
   ? Math.round(simScores.reduce((sum, value) => sum + value, 0) / simScores.length)
   : null;
  const atRisk = org.filter((profile) => {
   const health = coachingByUser[profile.id]?.health ?? "on_track";
   return health === "coach_now" || health === "at_risk" || health === "stalled";
  });
  const inboxTotal = org.reduce((sum, profile) => sum + (coachingByUser[profile.id]?.openReviewCount ?? 0), 0);
  const atRiskProfile = atRisk[0];

  return { avgRamp, avgSim, atRiskCount: atRisk.length, atRiskProfile, inboxTotal };
 }, [org, plans, coachingByUser]);

 return (
 <>
 <ManagerStatStrip
  items={[
   { label: "Avg ramp", value: `${rosterStats.avgRamp}%` },
   {
    label: "Avg sim",
    value: rosterStats.avgSim ?? "—",
    sub: rosterStats.avgSim != null ? "Team average" : undefined,
    subColor: "#0A6E45",
   },
   {
    label: "At risk",
    value: rosterStats.atRiskCount,
    valueColor: "#B83128",
    sub: rosterStats.atRiskProfile ? `${rosterStats.atRiskProfile.fullName.split(" ")[0]} →` : "None",
    subColor: "#B83128",
    highlight: rosterStats.atRiskCount > 0,
    href: rosterStats.atRiskProfile ? `/manager?profile=${rosterStats.atRiskProfile.id}` : undefined,
   },
   {
    label: "Inbox",
    value: rosterStats.inboxTotal,
    valueColor: rosterStats.inboxTotal > 0 ? "#D4810A" : "#0D0E12",
    href: rosterStats.inboxTotal > 0 ? "/manager?section=inbox" : undefined,
   },
  ]}
 />
 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 <div className="space-y-3 border-b border-[#ECEAE6] p-[14px_18px]">
 <div>
 <h2 className="text-[12.5px] font-bold text-[#0D0E12]">Team roster</h2>
 <p className="mt-[1px] text-[10.5px] text-[#A09D98]">
 {org.length} SE{org.length === 1 ? "" : "s"}
 {cohortSummary ? ` · ${cohortSummary}` : ""}
 </p>
 </div>

 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09D98]" />
 <Input
 className="h-9 border-[#E2DFD9] pl-9 text-[12px]"
 onChange={(event) => setSearch(event.target.value)}
 placeholder="Search by name…"
 value={search}
 />
 </div>

 <div className="flex flex-wrap gap-[8px]">
 {FILTER_OPTIONS.map((option) => {
 const count = filterCounts[option.id];
 if (option.id !== "all" && count === 0) return null;

 return (
 <button
 className="font-mono text-[8px] uppercase tracking-[0.08em] px-[16px] py-[7px] text-[12px] font-semibold transition"
 key={option.id}
 onClick={() => setFilter(option.id)}
 style={
 filter === option.id
 ? { background: "#00143a", color: "white", border: "1.5px solid #00143a" }
 : { background: "white", color: "#6B6860", border: "1.5px solid #E2DFD9" }
 }
 type="button"
 >
 {option.label}
 {count > 0 ? ` (${count})` : ""}
 </button>
 );
 })}
 </div>
 </div>

 <div
 className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-[16px] py-[9px]"
 style={{ gridTemplateColumns: ROSTER_GRID_COLS }}
 >
 {["SE", "Status", "Onboarding", "Sim avg", "Dev goals", "Inbox", ""].map((h) => (
 <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]" key={h || "chevron"}>
 {h}
 </span>
 ))}
 </div>

 <div className="max-h-[min(28rem,50vh)] overflow-y-auto">
 {filtered.length === 0 ? (
 <p className="px-4 py-8 text-center text-[12.5px] text-[#A09D98]">
 {search ? "No matches." : "No one in this filter."}
 </p>
 ) : (
 filtered.map((profile) => (
 <RosterRow
 coaching={coachingByUser[profile.id]}
 isSelected={selectedProfileId === profile.id}
 key={profile.id}
 onSelect={() => onSelectProfile(profile.id)}
 plan={plans.find((item) => item.userId === profile.id)}
 profile={profile}
 />
 ))
 )}
 </div>

 <p className="border-t border-[#ECEAE6] px-[16px] py-[10px] text-[10.5px] text-[#A09D98]">
 Click any row for the full growth story — detail opens in the side panel.
 </p>
 </div>
 </>
 );
}
