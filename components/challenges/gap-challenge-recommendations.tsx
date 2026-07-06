"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";

export function GapChallengeRecommendations({
  recommendations,
}: {
  recommendations: GapChallengeRecommendation[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <Card className="border-sp-blue/15">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-sp-blue" />
          AI gap recommendations
        </CardTitle>
        <CardDescription>
          Challenges matched to your competency focus areas from coaching cards and plan steps.
        </CardDescription>
      </CardHeader>
      <div className="space-y-2">
        {recommendations.map((rec) => (
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
        ))}
      </div>
    </Card>
  );
}
