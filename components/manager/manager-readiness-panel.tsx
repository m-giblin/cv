"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { competencyScoreColor } from "@/components/manager/manager-ui-primitives";

type ScoreRow = {
  userId: string;
  fullName: string;
  score: number;
  label: string;
  planProgress: number;
  simulationAvg: number | null;
  segmentProgress: number;
  certApprovedRatio?: number;
};

type CompetencyCard = {
  name: string;
  avg: number;
  avgColor: string;
  rows: { name: string; score: number; color: string }[];
};

function buildCompetencyCards(scores: ScoreRow[]): CompetencyCard[] {
  const buckets: { name: string; getScore: (row: ScoreRow) => number }[] = [
    { name: "Onboarding ramp", getScore: (row) => row.planProgress },
    { name: "Simulation performance", getScore: (row) => row.simulationAvg ?? 0 },
    { name: "Segment mastery", getScore: (row) => row.segmentProgress },
    {
      name: "Cert readiness",
      getScore: (row) => Math.round((row.certApprovedRatio ?? 0) * 100),
    },
  ];

  return buckets.map((bucket) => {
    const rows = scores.map((row) => {
      const score = bucket.getScore(row);
      return {
        name: row.fullName.split(" ")[0] ?? row.fullName,
        score,
        color: competencyScoreColor(score),
      };
    });
    const avg =
      rows.length > 0 ? Math.round(rows.reduce((total, row) => total + row.score, 0) / rows.length) : 0;

    return {
      name: bucket.name,
      avg,
      avgColor: competencyScoreColor(avg),
      rows: rows.sort((a, b) => a.score - b.score).slice(0, 5),
    };
  });
}

export function ManagerReadinessPanel() {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/manager/readiness-scores");
    if (response.ok) {
      const body = (await response.json()) as { scores: ScoreRow[] };
      setScores((body.scores ?? []).sort((a, b) => a.score - b.score));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const competencies = useMemo(() => buildCompetencyCards(scores), [scores]);

  const coachingFocus = useMemo(() => {
    if (competencies.length === 0) return null;
    const sorted = [...competencies].sort((a, b) => a.avg - b.avg);
    const weakest = sorted[0]!;
    const strongest = sorted[sorted.length - 1]!;
    const weakNames = weakest.rows
      .filter((row) => row.score < 70)
      .map((row) => row.name)
      .slice(0, 2)
      .join(" and ");

    return { weakest, strongest, weakNames };
  }, [competencies]);

  return (
    <div className="space-y-[14px]">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
        </div>
      ) : (
        <>
          <div className="mb-[14px] grid grid-cols-2 gap-[13px]">
            {competencies.map((comp) => (
              <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]" key={comp.name}>
                <div className="mb-[10px] flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-[#0a1628]">{comp.name}</p>
                  <span className="text-[11px] font-bold" style={{ color: comp.avgColor }}>
                    Team avg: {comp.avg}
                  </span>
                </div>
                <div className="space-y-[7px]">
                  {comp.rows.map((row) => (
                    <div key={row.name}>
                      <div className="mb-[3px] flex justify-between">
                        <span className="text-[11px] text-[#475569]">{row.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: row.color }}>
                          {row.score}
                        </span>
                      </div>
                      <div className="h-[5px] overflow-hidden rounded-full bg-[#f1f5f9]">
                        <div
                          className="prog-fill h-full rounded-full"
                          style={{ width: `${Math.min(100, row.score)}%`, background: row.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {coachingFocus ? (
            <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
              <p className="mb-[4px] text-[12.5px] font-bold text-[#0a1628]">
                Recommended coaching focus this week
              </p>
              <p className="mb-[12px] text-[11.5px] text-[#64748b]">Based on lowest team competency scores</p>
              <div className="flex flex-wrap gap-[10px]">
                <div
                  className="min-w-[180px] flex-1 rounded-[9px] p-[10px_14px]"
                  style={{ background: "#fef3c7", border: "1px solid #fde68a" }}
                >
                  <p className="mb-[2px] text-[11px] font-bold text-[#92400e]">{coachingFocus.weakest.name}</p>
                  <p className="text-[10px] text-[#b45309]">
                    Team avg: {coachingFocus.weakest.avg}
                    {coachingFocus.weakNames ? ` · ${coachingFocus.weakNames} struggling` : ""}
                  </p>
                </div>
                <div
                  className="min-w-[180px] flex-1 rounded-[9px] p-[10px_14px]"
                  style={{ background: "#dcfce7", border: "1px solid #bbf7d0" }}
                >
                  <p className="mb-[2px] text-[11px] font-bold text-[#15803d]">
                    {coachingFocus.strongest.name} — strong
                  </p>
                  <p className="text-[10px] text-[#16a34a]">
                    Team avg: {coachingFocus.strongest.avg} · No immediate focus needed
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
