"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ManagerCoachingQuality } from "@/lib/coaching/manager-quality";

export function ManagerCoachingQualityPanel({ orgIds }: { orgIds: string[] }) {
  const [rows, setRows] = useState<ManagerCoachingQuality[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = orgIds.length ? `?orgIds=${orgIds.join(",")}` : "";
    void fetch(`/api/manager/coaching-quality${query}`)
      .then((response) => (response.ok ? response.json() : { quality: [] }))
      .then((body: { quality: ManagerCoachingQuality[] }) => setRows(body.quality ?? []))
      .finally(() => setLoading(false));
  }, [orgIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-6" role="status">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue" />
        <span className="sr-only">Loading coaching quality…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">Coaching quality metrics appear after structured sign-offs.</p>;
  }

  return (
    <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
      {rows.map((row) => {
        const quality =
          row.qualityScore >= 75
            ? ({ tone: "success", word: "Strong" } as const)
            : row.qualityScore >= 55
              ? ({ tone: "warning", word: "Fair" } as const)
              : ({ tone: "danger", word: "Weak" } as const);

        return (
          <li className="border-b border-divider p-4 last:border-b-0" key={row.managerId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-bold text-ink">{row.managerName}</p>
              <StatusPill tone={quality.tone}>
                {quality.word}, quality {row.qualityScore}
              </StatusPill>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-[13px] text-muted">Sign-offs, last 30 days</dt>
                <dd className="num text-lg font-extrabold tracking-[-0.03em] text-ink">{row.totalSignoffs}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Avg review time</dt>
                <dd className="num text-lg font-extrabold tracking-[-0.03em] text-ink">
                  {row.avgReviewDurationMs ? `${Math.round(row.avgReviewDurationMs / 1000)} sec` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">AI edited</dt>
                <dd className="num text-lg font-extrabold tracking-[-0.03em] text-ink">
                  {Math.round(row.aiEditRate * 100)}%
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Cadence risk</dt>
                <dd className="num text-lg font-extrabold tracking-[-0.03em] text-ink">{row.cadenceRiskCount} {row.cadenceRiskCount === 1 ? "SE" : "SEs"}</dd>
              </div>
            </dl>
            {row.flags.length > 0 ? (
              <ul aria-label="Flags" className="mt-3 space-y-1 text-sm text-ink-2">
                {row.flags.map((flag) => (
                  <li key={flag}>
                    <StatusPill tone="warning">{flag}</StatusPill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3">
                <StatusPill tone="success">Coaching patterns look healthy</StatusPill>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
