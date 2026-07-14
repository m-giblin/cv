"use client";

import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { SE_AVATAR_GRADIENTS } from "@/lib/se/avatar-gradients";
import { initials } from "@/lib/utils";

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
 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 <div className="border-b border-[#ECEAE6] p-[13px_16px_11px]">
 <p className="text-[12.5px] font-bold text-[#0D0E12]">Team leaderboard</p>
 <p className="mt-[1px] text-[10.5px] text-[#A09D98]">Points from trophies, sim scores, and weekly practice streaks</p>
 </div>
 <p className="px-5 py-10 text-center text-[12.5px] text-[#A09D98]">
 No leaderboard data yet — points appear after sims, challenges, and trophies.
 </p>
 </div>
 );
 }

 const rows = visible.map((entry, index) => (
 <div className="flex items-center gap-[12px] border-b border-[#F2F0EC] px-4 py-[9px] last:border-b-0" key={entry.profileId}>
 <span
 className="w-[22px] shrink-0 text-center font-display text-[16px] font-extrabold"
 style={{
 color: index === 0 ? "#d97706" : index === 1 ? "#6B6860" : index === 2 ? "#b45309" : "#A09D98",
 }}
 >
 {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
 </span>
 <div
 className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
 style={{ background: SE_AVATAR_GRADIENTS[index % 6] }}
 >
 {initials(entry.fullName)}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-[11.5px] font-semibold text-[#3D3C38]">{entry.fullName}</p>
 <p className="text-[9.5px] text-[#A09D98]">
 {entry.trophies} trophy{entry.trophies === 1 ? "" : "ies"}
 {entry.avgSimScore !== null ? ` · sim ${entry.avgSimScore}` : ""}
 {entry.streakWeeks > 0 ? ` · ${entry.streakWeeks}w streak` : ""}
 </p>
 </div>
 <span className="font-display text-[14px] font-extrabold text-[#0D0E12]">{entry.points}</span>
 </div>
 ));

 if (embedded) {
 return <div>{rows}</div>;
 }

 return (
 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 {!fullPage ? (
 <div className="border-b border-[#ECEAE6] p-[13px_16px_11px]">
 <p className="text-[12.5px] font-bold text-[#0D0E12]">Team leaderboard</p>
 <p className="mt-[1px] text-[10.5px] text-[#A09D98]">Points from trophies, sim scores, and weekly practice streaks</p>
 </div>
 ) : null}
 <div>{rows}</div>
 </div>
 );
}
