"use client";

import { PersonCell, TableCard, tdCls, thCls } from "@/components/ui/table";
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { cn, initials } from "@/lib/utils";

function scoreTone(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-ink";
}

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
    <TableCard minWidth={640}>
      <caption className="sr-only">Team leaderboard, highest points first</caption>
      <thead>
        <tr>
          <th className={cn(thCls, "w-20")} scope="col">Rank</th>
          <th className={thCls} scope="col">SE</th>
          <th className={cn(thCls, "text-right")} scope="col">Trophies</th>
          <th className={cn(thCls, "text-right")} scope="col">Sim avg</th>
          <th className={cn(thCls, "text-right")} scope="col">Streak</th>
          <th className={cn(thCls, "text-right")} scope="col">Points</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={entry.profileId}>
            <td className={cn(tdCls, "num font-bold text-ink-2")}>{entry.rank || index + 1}</td>
            <td className={tdCls}>
              <PersonCell
                initials={initials(entry.fullName)}
                name={
                  <button
                    className="text-left font-bold text-ink hover:underline"
                    onClick={() => onOpenProfile(entry.profileId)}
                    type="button"
                  >
                    {entry.fullName}
                  </button>
                }
              />
            </td>
            <td className={cn(tdCls, "num text-right text-ink-2")}>{entry.trophies}</td>
            <td
              className={cn(
                tdCls,
                "num text-right font-semibold",
                entry.avgSimScore === null ? "text-muted" : scoreTone(entry.avgSimScore),
              )}
            >
              {entry.avgSimScore ?? <span className="text-[13px] font-normal">No sims</span>}
            </td>
            <td className={cn(tdCls, "num text-right text-ink-2")}>
              {entry.streakWeeks > 0 ? (
                `${entry.streakWeeks} week${entry.streakWeeks === 1 ? "" : "s"}`
              ) : (
                <span className="text-[13px] text-muted">None</span>
              )}
            </td>
            <td className={cn(tdCls, "num text-right text-[22px] font-extrabold tracking-[-0.03em] text-blue")}>
              {entry.points}
            </td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}
