"use client";

import Link from "next/link";
import { TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatedProgressFill } from "@/components/se/northstar-animated";
import { SP_CARD } from "@/components/se/se-page-layout";
import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import {
  CAREER_STAGES,
  CERT_LABELS,
  computeCareerProgress,
  practiceCadenceMessage,
} from "@/lib/growth/career-readiness";
import { ALL_CERT_ORDER } from "@/lib/certifications/gate-metadata";
import { profileLevelLabel } from "@/lib/utils/level-label";
import type { DashboardData, SeLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function simScoreDelta(cards: DashboardData["coachingCards"]) {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const thisWeek = cards.filter((card) => now - new Date(card.sentToManagerAt).getTime() <= weekMs);
  const lastWeek = cards.filter((card) => {
    const age = now - new Date(card.sentToManagerAt).getTime();
    return age > weekMs && age <= weekMs * 2;
  });
  if (thisWeek.length === 0 || lastWeek.length === 0) return null;
  const thisAvg = Math.round(thisWeek.reduce((sum, card) => sum + card.score, 0) / thisWeek.length);
  const lastAvg = Math.round(lastWeek.reduce((sum, card) => sum + card.score, 0) / lastWeek.length);
  const delta = thisAvg - lastAvg;
  return delta === 0 ? null : delta;
}

function stageBadge(level: SeLevel, current: SeLevel) {
  const currentIndex = CAREER_STAGES.findIndex((stage) => stage.level === current);
  const stageIndex = CAREER_STAGES.findIndex((stage) => stage.level === level);
  if (stageIndex === currentIndex) return { label: "Current", className: "bg-[#0071ce] text-white" };
  if (stageIndex === currentIndex + 1) return { label: "Next", className: "bg-[#f1f5f9] text-[#64748b]" };
  if (stageIndex < currentIndex) return { label: "Achieved", className: "bg-[#dcfce7] text-[#15803d]" };
  return { label: "Future", className: "bg-[#f1f5f9] text-[#94a3b8]" };
}

function gapHref(competency: string) {
  const lower = competency.toLowerCase();
  if (lower.includes("competitive") || lower.includes("market")) return "/market-pulse";
  if (lower.includes("demo") || lower.includes("sim")) return "/simulations";
  return "/challenges";
}

function gapAction(competency: string) {
  const lower = competency.toLowerCase();
  if (lower.includes("competitive")) return "Market pulse quiz";
  if (lower.includes("objection")) return "Practice with a challenge";
  return "Practice with a challenge";
}

export function GrowthDashboardNorthstar({ data }: { data: DashboardData }) {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const myCards = data.coachingCards.filter((card) => card.userId === userId && !card.isPractice);
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
      ? Math.round(myCards.reduce((total, card) => total + card.score, 0) / myCards.length)
      : null;
  const simDelta = simScoreDelta(myCards);
  const myActivity = data.activity.filter((item) => item.userId === userId);
  const lastSim = myActivity.find((item) => item.eventType === "simulation_completed");

  const level = profileLevelLabel(data.currentUser);
  const career = computeCareerProgress({
    currentLevel: level,
    approvedCerts,
    planProgress: plan?.progress ?? 0,
    avgSimScore,
  });

  const competencyGaps = useMemo(
    () => analyzeCompetencyGaps(data, userId).slice(0, 2),
    [data, userId],
  );

  const nextCertLabel =
    career.nextStage?.certifications.find((cert) => !approvedCerts.includes(cert)) ??
    career.currentStage.certifications.find((cert) => !approvedCerts.includes(cert));

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cn(SP_CARD, "border-l-[3px] p-[14px_16px]")} style={{ borderLeftColor: "#0071ce" }}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Plan progress</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {plan?.progress ?? 0}%
          </p>
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">{plan?.name ?? "No active plan"}</p>
        </div>
        <div className={cn(SP_CARD, "border-l-[3px] p-[14px_16px]")} style={{ borderLeftColor: "#10b981" }}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Avg sim score</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {avgSimScore ?? "—"}
          </p>
          <p className="mt-2 text-[10px] font-semibold text-[#10b981]">
            {simDelta !== null
              ? `${simDelta > 0 ? "↑" : "↓"} ${Math.abs(simDelta)} pts this week`
              : `${myCards.length} coaching cards`}
          </p>
        </div>
        <div className={cn(SP_CARD, "border-l-[3px] p-[14px_16px]")} style={{ borderLeftColor: "#cc27b0" }}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Certifications</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {approvedCerts.length}
            <span className="text-base font-medium text-[#94a3b8]"> / {ALL_CERT_ORDER.length}</span>
          </p>
          {nextCertLabel ? (
            <Link className="mt-2 block text-[10px] font-semibold text-[#0071ce]" href="/certifications">
              {(CERT_LABELS[nextCertLabel] ?? nextCertLabel).replace(/ call$/, "")} next →
            </Link>
          ) : (
            <p className="mt-2 text-[10px] text-[#94a3b8]">All gates complete</p>
          )}
        </div>
        <div className={cn(SP_CARD, "border-l-[3px] p-[14px_16px]")} style={{ borderLeftColor: "#f59e0b" }}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Practice cadence</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#10b981]">
            {lastSim ? "Active" : "Start"}
          </p>
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">
            {lastSim
              ? `Last sim ${formatDistanceToNow(new Date(lastSim.createdAt), { addSuffix: true })}`
              : practiceCadenceMessage(null)}
          </p>
        </div>
      </div>

      <div className={cn(SP_CARD, "p-[18px_22px]")}>
        <div className="mb-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[13.5px] font-bold text-[#0a1628]">Career readiness map</p>
            <p className="text-[11px] text-[#64748b]">
              {career.nextStage
                ? `Progress toward ${career.nextStage.title} · currently at ${career.readinessPercent}% readiness`
                : "You are at the top of the current career ladder."}
            </p>
          </div>
          <div className="w-full max-w-[200px]">
            <div className="mb-1 flex justify-between text-[10.5px]">
              <span className="text-[#64748b]">Readiness</span>
              <span className="font-bold text-[#0071ce]">{career.readinessPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e8f2fc]">
              <AnimatedProgressFill percent={career.readinessPercent} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {CAREER_STAGES.map((stage) => {
            const badge = stageBadge(stage.level, level);
            const isCurrent = stage.level === level;
            const isPast =
              CAREER_STAGES.findIndex((item) => item.level === level) > CAREER_STAGES.indexOf(stage);

            return (
              <div
                className={cn(
                  "rounded-[10px] p-3.5",
                  isCurrent
                    ? "border-2 border-[rgba(0,113,206,0.28)] bg-gradient-to-br from-[#f0f7ff] to-[#e8f2fc]"
                    : "border border-[#e2eaf5] bg-white",
                )}
                key={stage.level}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[9.5px] font-bold uppercase tracking-[0.06em]",
                      isCurrent ? "text-[#0071ce]" : isPast ? "text-[#64748b]" : "text-[#94a3b8]",
                    )}
                  >
                    {stage.title}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "mb-2 text-[13px] font-bold",
                    isCurrent ? "text-[#0a1628]" : "text-[#475569]",
                  )}
                >
                  {stage.title}
                </p>
                <ul className="mb-2.5 space-y-1.5">
                  {stage.requirements.map((req) => (
                    <li className="flex items-center gap-1.5" key={req}>
                      <span
                        className={cn(
                          "h-[5px] w-[5px] shrink-0 rounded-full",
                          isCurrent ? "bg-[#0071ce]" : isPast ? "bg-[#10b981]" : "bg-[#cbd5e1]",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px]",
                          isCurrent ? "text-[#374151]" : "text-[#94a3b8]",
                        )}
                      >
                        {req}
                      </span>
                    </li>
                  ))}
                </ul>
                <p
                  className={cn(
                    "mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.05em]",
                    isCurrent ? "text-[#0071ce]" : "text-[#94a3b8]",
                  )}
                >
                  {stage.certifications.length > 1 ? "Gate certifications" : "Gate certification"}
                </p>
                <div className="space-y-1">
                  {stage.certifications.map((cert) => {
                    const approved = approvedCerts.includes(cert);
                    return (
                      <div className="flex items-center gap-1.5" key={cert}>
                        <span
                          className={cn(
                            "h-3 w-3 shrink-0 rounded-full border-[1.5px]",
                            approved
                              ? "border-[#10b981] bg-[#dcfce7]"
                              : "border-dashed border-[#94a3b8]",
                          )}
                        />
                        <span className={cn("text-[11px]", isCurrent ? "text-[#64748b]" : "text-[#94a3b8]")}>
                          {CERT_LABELS[cert] ?? cert}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <div className={cn(SP_CARD, "p-[16px_18px]")}>
          <p className="text-[12.5px] font-bold text-[#0a1628]">Recommended next practice</p>
          <p className="mb-3 text-[11px] text-[#64748b]">
            {practiceCadenceMessage(lastSim?.createdAt ?? null)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="sp-btn-blue px-3.5 py-1.5 text-[11.5px]" href="/simulations">
              Run a simulation
            </Link>
            <Link className="sp-btn-outline px-3 py-1.5 text-[11.5px]" href="/prep">
              Deal prep brief
            </Link>
            <Link className="sp-btn-outline px-3 py-1.5 text-[11.5px]" href="/development">
              Development goals
            </Link>
          </div>
        </div>

        <div className={cn(SP_CARD, "p-[16px_18px]")}>
          <p className="text-[12.5px] font-bold text-[#0a1628]">Competency gaps to close</p>
          <p className="mb-2.5 text-[11px] text-[#64748b]">Based on your last coaching cards</p>
          <div className="flex flex-col gap-2">
            {competencyGaps.length === 0 ? (
              <p className="text-[11px] text-[#94a3b8]">No major gaps detected — keep practicing.</p>
            ) : (
              competencyGaps.map((gap) => (
                <div
                  className="flex items-center gap-2.5 rounded-[9px] border border-[rgba(245,158,11,0.2)] bg-[#fef9ec] p-[9px_11px]"
                  key={gap.competencyId}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#fef3c7]">
                    {gap.competencyName.toLowerCase().includes("competitive") ? (
                      <TrendingUp className="h-3.5 w-3.5 text-[#d97706]" strokeWidth={1.5} />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-[#d97706]" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-semibold text-[#92400e]">{gap.competencyName}</p>
                    <p className="text-[10px] text-[#b45309]">
                      {gap.gapCount} gap{gap.gapCount === 1 ? "" : "s"} flagged · {gapAction(gap.competencyName)}
                    </p>
                  </div>
                  <Link
                    className="sp-btn-outline shrink-0 px-2.5 py-1 text-[11px]"
                    href={gapHref(gap.competencyName)}
                  >
                    Go →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
