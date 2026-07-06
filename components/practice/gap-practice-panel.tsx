"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";

export function GapPracticePanel({
  recommendations,
  variant = "challenges",
}: {
  recommendations: GapChallengeRecommendation[];
  variant?: "challenges" | "simulations";
}) {
  if (recommendations.length === 0 && variant === "challenges") return null;

  return (
    <div className="rounded-xl border border-[#e2eaf5] bg-white">
      <div className="border-b border-[#f1f5f9] p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#0a1628]">
          <Sparkles className="h-5 w-5 text-sp-blue" />
          Recommended for your gaps
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          From coaching cards and plan steps — practice what needs reinforcement.
        </p>
      </div>
      <div className="space-y-2 px-6 pb-6 pt-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sp-blue/10 bg-sp-blue-soft/15 px-3 py-2"
              key={rec.challenge.id}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sp-navy">{rec.challenge.title}</p>
                <p className="text-xs text-sp-navy-muted">{rec.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                {rec.challenge.targetLevel ? <Badge tone="blue">{rec.challenge.targetLevel}</Badge> : null}
                <Link
                  className="text-sm font-semibold text-sp-blue hover:text-sp-blue-deep"
                  href={`/challenges?challenge=${rec.challenge.id}`}
                >
                  Start →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/10 px-3 py-3 text-sm text-sp-navy-muted">
            <p className="font-semibold text-sp-navy">Run a gap-focused simulation</p>
            <p className="mt-1">Your coaching history suggests practice on objection handling and discovery.</p>
            <Link className="mt-2 inline-block font-semibold text-sp-blue" href="/simulations?focus=simulation">
              Open simulations →
            </Link>
          </div>
        )}
        {variant === "simulations" ? (
          <Link className="text-sm font-semibold text-sp-magenta hover:underline" href="/challenges?view=browse">
            Browse gap-matched challenges →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
