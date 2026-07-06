"use client";

import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { SE_AVATAR_GRADIENTS } from "@/lib/se/avatar-gradients";
import { initials } from "@/lib/utils";

export function TeamLeaderboard({
  entries,
  embedded = false,
}: {
  entries: LeaderboardEntry[];
  embedded?: boolean;
}) {
  if (entries.length === 0) return null;

  const rows = entries.slice(0, 8).map((entry, index) => (
    <div className="flex items-center gap-[12px] px-[16px] py-[10px]" key={entry.profileId}>
      <span
        className="w-[22px] shrink-0 text-center font-display text-[16px] font-extrabold"
        style={{
          color: index === 0 ? "#d97706" : index === 1 ? "#64748b" : index === 2 ? "#b45309" : "#94a3b8",
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
        <p className="text-[11.5px] font-semibold text-[#1e293b]">{entry.fullName}</p>
        <p className="text-[9.5px] text-[#94a3b8]">
          {entry.trophies} trophy{entry.trophies === 1 ? "" : "ies"}
          {entry.avgSimScore !== null ? ` · sim ${entry.avgSimScore}` : ""}
          {entry.streakWeeks > 0 ? ` · ${entry.streakWeeks}w streak` : ""}
        </p>
      </div>
      <span className="font-display text-[14px] font-extrabold text-[#0a1628]">{entry.points}</span>
    </div>
  ));

  if (embedded) {
    return <div>{rows}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="border-b border-[#f1f5f9] p-[13px_16px_11px]">
        <p className="text-[12.5px] font-bold text-[#0a1628]">Team leaderboard</p>
        <p className="mt-[1px] text-[10.5px] text-[#94a3b8]">Points from trophies, sim scores, and weekly practice streaks</p>
      </div>
      <div>{rows}</div>
    </div>
  );
}
