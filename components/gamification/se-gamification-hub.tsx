"use client";

import { Flame, Medal, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import type { SeScorecard } from "@/lib/gamification/se-scorecard";

export function SeGamificationHub({ scorecard }: { scorecard: SeScorecard }) {
  const levelColors: Record<SeScorecard["level"], string> = {
    Rookie: "bg-stone-100 text-stone-700",
    Contributor: "bg-blue-100 text-blue-800",
    Operator: "bg-indigo-100 text-indigo-800",
    Ace: "bg-amber-100 text-amber-900",
    Elite: "bg-gradient-to-r from-amber-200 to-yellow-100 text-amber-950",
  };

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-white to-[#e8f2fc]/40 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Your momentum</p>
          <p className="font-display text-2xl font-bold text-[#00143a]">{scorecard.points} pts</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelColors[scorecard.level]}`}>
          {scorecard.level}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-amber-100/50">
        <div className="bg-white/90 px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#00143a]">#{scorecard.rank}</p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Team rank</p>
        </div>
        <div className="bg-white/90 px-4 py-3 text-center">
          <p className="flex items-center justify-center gap-1 text-lg font-bold text-[#00143a]">
            <Flame className="h-4 w-4 text-orange-500" />
            {scorecard.streakWeeks}
          </p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Week streak</p>
        </div>
        <div className="bg-white/90 px-4 py-3 text-center">
          <p className="flex items-center justify-center gap-1 text-lg font-bold text-[#00143a]">
            <Trophy className="h-4 w-4 text-amber-600" />
            {scorecard.trophies}
          </p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Trophies</p>
        </div>
      </div>

      <div className="space-y-2 px-5 py-4">
        {scorecard.pointsToNext > 0 ? (
          <p className="text-xs text-slate-600">
            <Zap className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
            {scorecard.pointsToNext} pts to <strong>{scorecard.nextMilestone}</strong>
          </p>
        ) : (
          <p className="text-xs font-semibold text-amber-800">
            <Medal className="mr-1 inline h-3.5 w-3.5" />
            Top tier — keep your streak alive
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {scorecard.breakdown.map((row) => (
            <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm" key={row.label}>
              {row.label}: +{row.points}
            </span>
          ))}
        </div>
        <Link className="text-xs font-semibold text-[#0071ce] hover:underline" href="/flight-check">
          Run Competency Flight Check for bonus points →
        </Link>
      </div>
    </div>
  );
}
