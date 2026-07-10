"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { healthBadgeTone } from "@/lib/manager/se-coaching-summary";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { Profile, UserPlan } from "@/lib/types";
import { formatPercent, initials } from "@/lib/utils";

export function ManagerTeamTable({
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
 const [expanded, setExpanded] = useState(false);

 const sorted = useMemo(
 () =>
 [...org].sort((a, b) => {
 const order = { coach_now: 0, at_risk: 1, stalled: 2, waiting_on_se: 3, on_track: 4 };
 const ha = coachingByUser[a.id]?.health ?? "on_track";
 const hb = coachingByUser[b.id]?.health ?? "on_track";
 return order[ha] - order[hb];
 }),
 [org, coachingByUser],
 );

 const attentionCount = sorted.filter(
 (p) => (coachingByUser[p.id]?.health ?? "on_track") !== "on_track",
 ).length;

 if (org.length < 8) {
 return null;
 }

 return (
 <Card>
 <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
 <div>
 <CardTitle>Full team view</CardTitle>
 <CardDescription>
 Dense table for {org.length} direct reports — {attentionCount} need attention.
 </CardDescription>
 </div>
 <button
 className="shrink-0 border border-sp-blue/20 px-3 py-1.5 text-xs font-semibold text-sp-blue hover:bg-sp-blue-soft/40"
 onClick={() => setExpanded((value) => !value)}
 type="button"
 >
 {expanded ? "Hide table" : "Expand table"}
 </button>
 </CardHeader>

 {expanded ? (
 <div className="overflow-x-auto border-t border-sp-blue/10">
 <table className="min-w-full text-left text-sm">
 <thead className="bg-sp-blue-soft/30 text-[10px] uppercase tracking-wide text-sp-navy-muted">
 <tr>
 <th className="px-4 py-2 font-semibold">SE</th>
 <th className="px-4 py-2 font-semibold">Status</th>
 <th className="px-4 py-2 font-semibold">Onboarding</th>
 <th className="px-4 py-2 font-semibold">Development</th>
 <th className="px-4 py-2 font-semibold">Practice</th>
 <th className="px-4 py-2 font-semibold">Flags</th>
 <th className="px-4 py-2" />
 </tr>
 </thead>
 <tbody>
 {sorted.map((profile) => {
 const plan = plans.find((item) => item.userId === profile.id);
 const coaching = coachingByUser[profile.id];
 const isSelected = selectedProfileId === profile.id;

 return (
 <tr
 className={`cursor-pointer border-b border-sp-blue/5 transition hover:bg-sp-blue-soft/20 ${
 isSelected ? "bg-sp-blue-soft/40" : ""
 }`}
 key={profile.id}
 onClick={() => onSelectProfile(profile.id)}
 >
 <td className="px-4 py-2.5">
 <div className="flex items-center gap-2">
 <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta text-[10px] font-bold text-white">
 {initials(profile.fullName)}
 </span>
 <div>
 <p className="font-bold text-sp-navy">{profile.fullName}</p>
 <p className="text-xs capitalize text-sp-navy-muted">{profile.level}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-2.5">
 {coaching ? (
 <Badge tone={healthBadgeTone(coaching.health)}>{coaching.healthLabel}</Badge>
 ) : null}
 </td>
 <td className="px-4 py-2.5 font-semibold text-sp-navy">
 {formatPercent(plan?.progress ?? 0)}
 </td>
 <td className="px-4 py-2.5 font-semibold text-sp-navy">
 {coaching?.devGoalsTotal
 ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}`
 : "—"}
 </td>
 <td className="px-4 py-2.5 font-semibold text-sp-navy">
 {coaching?.latestSimScore ?? coaching?.avgSimScore ?? "—"}
 </td>
 <td className="px-4 py-2.5 text-xs text-sp-navy-muted">
 {[
 coaching?.openReviewCount ? `${coaching.openReviewCount} inbox` : null,
 coaching?.redoCount ? `${coaching.redoCount} redo` : null,
 coaching?.quarterlyChip,
 ]
 .filter(Boolean)
 .join(" · ") || "—"}
 </td>
 <td className="px-4 py-2.5">
 <ChevronRight className="h-4 w-4 text-sp-navy-muted" />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 ) : null}
 </Card>
 );
}
