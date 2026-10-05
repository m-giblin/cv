"use client";

import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { AVATAR_CLASSNAME } from "@/lib/se/avatar-gradients";
import { cn, initials } from "@/lib/utils";

export function TeamLeaderboard({
 entries,
 embedded = false,
 fullPage = false,
}: {
 entries: LeaderboardEntry[];
 embedded?: boolean;
 fullPage?: boolean;
}) {
 const visible = fullPage ? entries : entries.slice(0, 8);

 if (visible.length === 0) {
 if (embedded) return null;
 return (
 <div className="overflow-hidden rounded-[14px] border border-line bg-white">
 <div className="border-b border-divider px-5 py-3.5">
 <p className="text-[15px] font-bold text-ink">Team leaderboard</p>
 <p className="mt-0.5 text-xs text-muted">Points from trophies, sim scores, and weekly practice streaks</p>
 </div>
 <p className="px-5 py-10 text-center text-sm text-muted">
 No leaderboard data yet — points appear after sims, challenges, and trophies.
 </p>
 </div>
 );
 }

 const rows = visible.map((entry, index) => (
 <div className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={entry.profileId}>
 <span
 className={cn(
 "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium",
 index === 0 ? "border-[1.5px] border-ink bg-signal text-ink" : index < 3 ? "text-ink" : "text-faint",
 )}
 >
 {index + 1}
 </span>
 <div
 className={cn("flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-xs font-bold", AVATAR_CLASSNAME)}
 >
 {initials(entry.fullName)}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-ink">{entry.fullName}</p>
 <p className="text-xs text-muted">
 {entry.trophies} trophy{entry.trophies === 1 ? "" : "ies"}
 {entry.avgSimScore !== null ? ` · sim ${entry.avgSimScore}` : ""}
 {entry.streakWeeks > 0 ? ` · ${entry.streakWeeks}w streak` : ""}
 </p>
 </div>
 <span className="font-mono text-[15px] font-medium text-ink">{entry.points}</span>
 </div>
 ));

 if (embedded) {
 return <div>{rows}</div>;
 }

 return (
 <div className="overflow-hidden rounded-[14px] border border-line bg-white">
 {!fullPage ? (
 <div className="border-b border-divider px-5 py-3.5">
 <p className="text-[15px] font-bold text-ink">Team leaderboard</p>
 <p className="mt-0.5 text-xs text-muted">Points from trophies, sim scores, and weekly practice streaks</p>
 </div>
 ) : null}
 <div>{rows}</div>
 </div>
 );
}
