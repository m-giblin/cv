"use client";

import Link from "next/link";
import { Flag, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  ReadinessConfidence,
  ReadinessDimName,
  ReadinessMapSeRow,
  ReadinessStatusLevel,
} from "@/lib/manager/readiness-map-data";

const CONFIDENCE_LABEL: Record<ReadinessConfidence, string> = {
  high: "",
  medium: "Thin sample",
  low: "Low-confidence score",
};

const LEVEL_STYLES: Record<ReadinessStatusLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(184,49,40,.06)", text: "#B83128", border: "rgba(184,49,40,.2)" },
  risk: { bg: "rgba(212,129,10,.06)", text: "#D4810A", border: "rgba(212,129,10,.2)" },
  good: { bg: "rgba(10,110,69,.06)", text: "#0A6E45", border: "rgba(10,110,69,.2)" },
  unknown: { bg: "rgba(122,119,114,.06)", text: "#7A7772", border: "rgba(122,119,114,.2)" },
};

const DIM_LABELS: Record<ReadinessDimName, string> = {
  Ramp: "Ramp",
  Sims: "Simulations",
  Segments: "Segments",
  Certs: "Certifications",
  Lab: "ISC Lab",
  Pitch: "Pitch Studio",
  Challenges: "Challenges",
  FlightCheck: "Flight Check",
  MarketPulse: "Market Pulse",
};

const DIM_ORDER: ReadinessDimName[] = [
  "Sims",
  "Challenges",
  "FlightCheck",
  "MarketPulse",
  "Pitch",
  "Ramp",
  "Segments",
  "Certs",
  "Lab",
];

/**
 * SE self-view of the cross-feature readiness/competency picture — the same
 * data model the manager Readiness Map uses (lib/manager/readiness-map-data),
 * scoped to the current user via /api/growth/readiness.
 */
export function MyReadinessCard() {
  const [row, setRow] = useState<ReadinessMapSeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [flaggingDim, setFlaggingDim] = useState<ReadinessDimName | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flaggedDims, setFlaggedDims] = useState<Set<ReadinessDimName>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/growth/readiness");
    if (response.ok) {
      const body = (await response.json()) as { row: ReadinessMapSeRow | null };
      setRow(body.row);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitFlag = useCallback(async (dim: ReadinessDimName) => {
    if (!flagReason.trim()) return;
    setFlagSubmitting(true);
    const response = await fetch("/api/growth/readiness/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dimName: dim, reason: flagReason.trim() }),
    });
    if (response.ok) {
      setFlaggedDims((prev) => new Set(prev).add(dim));
      setFlaggingDim(null);
      setFlagReason("");
    }
    setFlagSubmitting(false);
  }, [flagReason]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="border border-border bg-white p-6 text-center">
        <p className="text-sm font-semibold">Readiness data not available yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your cross-feature picture appears once you have practice activity across Simulations, Challenges,
          Flight Check, or the other practice tools.
        </p>
      </div>
    );
  }

  const competencyEntries = Object.entries(row.competencySummary).sort((a, b) => a[1] - b[1]);
  const hasDrivers = row.compositeDrivers.positive.length > 0 || row.compositeDrivers.negative.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Composite readiness
            </p>
            <p className="text-3xl font-bold" style={{ color: row.compositeColor }}>
              {row.composite}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/100</span>
              {row.percentileRank != null ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {row.percentileRank}th percentile of peers at your level
                </span>
              ) : null}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{row.tenure}</p>
        </div>
        {hasDrivers ? (
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {row.compositeDrivers.positive.length > 0
              ? `Ahead on ${row.compositeDrivers.positive.join(", ")}.`
              : ""}
            {row.compositeDrivers.negative.length > 0
              ? ` Behind on ${row.compositeDrivers.negative.join(", ")}.`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {DIM_ORDER.map((dim) => {
          const cell = row.dims[dim];
          const style = LEVEL_STYLES[cell.level];
          const alreadyFlagged = flaggedDims.has(dim);
          return (
            <div className="border p-3" key={dim} style={{ background: style.bg, borderColor: style.border }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                  {DIM_LABELS[dim]}
                </p>
                {CONFIDENCE_LABEL[cell.confidence] ? (
                  <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-[#B0803A]">
                    {CONFIDENCE_LABEL[cell.confidence]}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-lg font-semibold" style={{ color: style.text }}>
                {cell.score}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{cell.insight}</p>

              {alreadyFlagged ? (
                <p className="mt-2 text-[10px] text-muted-foreground">Flagged for your manager</p>
              ) : flaggingDim === dim ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <textarea
                    className="w-full border border-border bg-white p-1.5 text-[10.5px]"
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Why does this score look wrong?"
                    rows={2}
                    value={flagReason}
                  />
                  <div className="flex gap-2">
                    <button
                      className="border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
                      disabled={flagSubmitting || !flagReason.trim()}
                      onClick={() => void submitFlag(dim)}
                      type="button"
                    >
                      Submit
                    </button>
                    <button
                      className="text-[10px] text-muted-foreground"
                      onClick={() => {
                        setFlaggingDim(null);
                        setFlagReason("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#0071CE]"
                  onClick={() => setFlaggingDim(dim)}
                  type="button"
                >
                  <Flag className="h-2.5 w-2.5" /> Flag this score
                </button>
              )}
            </div>
          );
        })}
      </div>

      {competencyEntries.length > 0 ? (
        <div className="border border-border bg-white p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Competency picture (all practice features)
          </p>
          <div className="flex flex-col gap-2">
            {competencyEntries.map(([competency, score]) => (
              <div className="flex items-center gap-3" key={competency}>
                <span className="w-44 shrink-0 truncate text-xs">{competency}</span>
                <div className="h-1.5 flex-1 overflow-hidden bg-[#ECEAE6]">
                  <div
                    className="h-full"
                    style={{
                      width: `${score}%`,
                      background: LEVEL_STYLES[score >= 70 ? "good" : score >= 40 ? "risk" : "critical"].text,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-xs">{score}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border bg-white p-4 text-xs text-muted-foreground">
          Competency breakdown will fill in as you complete sims, challenges, and Flight Check probes.
        </div>
      )}

      {row.dealPrepActivity.briefsThisWeek > 0 ? (
        <p className="text-xs text-muted-foreground">
          {row.dealPrepActivity.briefsThisWeek} deal prep brief{row.dealPrepActivity.briefsThisWeek === 1 ? "" : "s"} this
          week
          {row.dealPrepActivity.sharedWithManager > 0
            ? `, ${row.dealPrepActivity.sharedWithManager} shared with your manager`
            : ""}
          .
        </p>
      ) : null}

      <Link className="self-start text-xs font-semibold text-[#0071CE] hover:underline" href="/growth">
        ← Back to Growth
      </Link>
    </div>
  );
}
