"use client";

import { InitialsAvatar } from "@/components/manager/team-member-bits";
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";

/** Team › Leaderboard: points table (trophies, sim scores, weekly practice streaks). */
export function ManagerLeaderboard({
  entries,
  onOpenProfile,
}: {
  entries: LeaderboardEntry[];
  onOpenProfile: (profileId: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
        No points yet. They appear after simulations, challenges and trophies.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <caption className="sr-only">Team leaderboard, highest points first</caption>
        <thead className="bg-blue font-mono text-xs text-white uppercase">
          <tr>
            <th className="w-16 px-5 py-[11px] font-medium" scope="col">
              Rank
            </th>
            <th className="px-5 py-[11px] font-medium" scope="col">
              SE
            </th>
            <th className="px-5 py-[11px] font-medium" scope="col">
              Trophies
            </th>
            <th className="px-5 py-[11px] font-medium" scope="col">
              Sim avg
            </th>
            <th className="px-5 py-[11px] font-medium" scope="col">
              Streak
            </th>
            <th className="px-5 py-[11px] text-right font-medium" scope="col">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr className={`border-b border-divider last:border-b-0 ${index === 0 ? "bg-signal-soft" : ""}`} key={entry.profileId}>
              <td className="px-5 py-3 text-[22px] font-extrabold tracking-[-0.03em] text-faint">
                {String(entry.rank || index + 1).padStart(2, "0")}
              </td>
              <td className="px-5 py-3">
                <button
                  className="flex items-center gap-3 text-left font-bold text-ink hover:underline"
                  onClick={() => onOpenProfile(entry.profileId)}
                  type="button"
                >
                  <InitialsAvatar name={entry.fullName} size={28} />
                  {entry.fullName}
                </button>
              </td>
              <td className="px-5 py-3 font-mono text-xs text-ink-2">{entry.trophies}</td>
              <td className="px-5 py-3 font-mono text-xs text-ink-2">{entry.avgSimScore ?? "—"}</td>
              <td className="px-5 py-3 font-mono text-xs text-ink-2">
                {entry.streakWeeks > 0 ? `${entry.streakWeeks} wk` : "—"}
              </td>
              <td className="px-5 py-3 text-right text-[22px] font-extrabold tracking-[-0.03em] text-blue">
                {entry.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
