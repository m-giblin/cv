"use client";

import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CAREER_STAGES,
  CERT_LABELS,
  computeCareerProgress,
  practiceCadenceMessage,
} from "@/lib/growth/career-readiness";
import { profileLevelLabel } from "@/lib/utils/level-label";
import { DashboardData } from "@/lib/types";

export function GrowthDashboard({ data }: { data: DashboardData }) {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const myCards = data.coachingCards.filter((card) => card.userId === userId);
  const [approvedCerts, setApprovedCerts] = useState<string[]>([]);

  const loadCerts = useCallback(async () => {
    const response = await fetch(`/api/certifications?userId=${userId}`);
    if (response.ok) {
      const body = (await response.json()) as {
        certifications: Array<{ certification_type: string; status: string }>;
      };
      setApprovedCerts(
        body.certifications.filter((cert) => cert.status === "approved").map((cert) => cert.certification_type),
      );
    }
  }, [userId]);

  useEffect(() => {
    void loadCerts();
  }, [loadCerts]);

  const avgSimScore =
    myCards.length > 0
      ? myCards.reduce((total, card) => total + card.score, 0) / myCards.length
      : null;
  const myActivity = data.activity.filter((item) => item.userId === userId);
  const lastSim = myActivity.find((item) => item.eventType === "simulation_completed");

  const level = profileLevelLabel(data.currentUser);
  const career = computeCareerProgress({
    currentLevel: level,
    approvedCerts,
    planProgress: plan?.progress ?? 0,
    avgSimScore,
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label="Plan progress" value={`${plan?.progress ?? 0}%`} helper={plan?.name ?? "No active plan"} />
        <MetricCard icon={Bot} label="Avg. sim score" value={avgSimScore !== null ? avgSimScore.toFixed(1) : "—"} helper={`${myCards.length} coaching cards`} accent="magenta" />
        <MetricCard icon={Trophy} label="Certifications" value={`${approvedCerts.length} / 5`} helper="Approved gates" />
        <MetricCard icon={CalendarClock} label="Practice cadence" value={lastSim ? "Active" : "Start"} helper={practiceCadenceMessage(lastSim?.createdAt ?? null)} accent="magenta" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Career readiness map</CardTitle>
          <CardDescription>
            {career.nextStage
              ? `Progress toward ${career.nextStage.title} — ${career.readinessPercent}% ready`
              : "You are at the top of the current career ladder."}
          </CardDescription>
        </CardHeader>
        <Progress className="mb-6" value={career.readinessPercent} />
        <div className="grid gap-4 lg:grid-cols-3">
          {CAREER_STAGES.map((stage) => {
            const isCurrent = stage.level === level;
            const isPast = CAREER_STAGES.findIndex((s) => s.level === level) > CAREER_STAGES.indexOf(stage);

            return (
              <div
                className={`rounded-2xl border p-4 ${isCurrent ? "border-sp-magenta/30 bg-sp-magenta-soft/20" : "border-sp-blue/10"}`}
                key={stage.level}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sp-navy">{stage.title}</p>
                  {isCurrent ? <Badge tone="magenta">Current</Badge> : isPast ? <Badge tone="green">Achieved</Badge> : null}
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-sp-navy-muted">
                  {stage.requirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-semibold uppercase text-sp-blue">Certifications</p>
                <ul className="mt-1 space-y-1 text-xs text-sp-navy-muted">
                  {stage.certifications.map((cert) => (
                    <li key={cert}>{CERT_LABELS[cert] ?? cert}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sp-blue hover:text-sp-blue-deep" href="/certifications">
          View certification gates <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended next practice</CardTitle>
            <CardDescription>{practiceCadenceMessage(lastSim?.createdAt ?? null)}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-xl bg-sp-blue px-4 py-2 text-sm font-semibold text-white hover:bg-sp-blue-deep" href="/simulations?focus=simulation">
              Run a simulation
            </Link>
            <Link className="rounded-xl border border-sp-blue/20 px-4 py-2 text-sm font-semibold text-sp-blue hover:bg-sp-blue-soft/30" href="/prep">
              Deal prep brief
            </Link>
            <Link className="rounded-xl border border-sp-blue/20 px-4 py-2 text-sm font-semibold text-sp-blue hover:bg-sp-blue-soft/30" href="/development">
              Development goals
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your activity timeline</CardTitle>
            <CardDescription>Recent learning events across plans, practice, and reviews.</CardDescription>
          </CardHeader>
          <ActivityFeed activity={myActivity.slice(0, 8)} profiles={data.profiles} />
        </Card>
      </section>
    </div>
  );
}
