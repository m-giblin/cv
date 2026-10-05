"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Tag } from "@/components/ui/tag";
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
            ? { tone: "success" as const, symbol: "✓", text: "text-blue" }
            : row.qualityScore >= 55
              ? { tone: "warning" as const, symbol: "▲", text: "text-warning" }
              : { tone: "danger" as const, symbol: "▲", text: "text-danger" };

        return (
          <li className="border-b border-divider p-4 last:border-b-0" key={row.managerId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-bold text-ink">{row.managerName}</p>
              <Tag tone={quality.tone}>
                {quality.symbol} Quality {row.qualityScore}
              </Tag>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="label-mono">Sign-offs (30d)</dt>
                <dd className="text-lg font-extrabold tracking-[-0.03em] text-ink">{row.totalSignoffs}</dd>
              </div>
              <div>
                <dt className="label-mono">Avg review time</dt>
                <dd className="text-lg font-extrabold tracking-[-0.03em] text-ink">
                  {row.avgReviewDurationMs ? `${Math.round(row.avgReviewDurationMs / 1000)}s` : "—"}
                </dd>
              </div>
              <div>
                <dt className="label-mono">AI edited</dt>
                <dd className="text-lg font-extrabold tracking-[-0.03em] text-ink">
                  {Math.round(row.aiEditRate * 100)}%
                </dd>
              </div>
              <div>
                <dt className="label-mono">Cadence risk</dt>
                <dd className="text-lg font-extrabold tracking-[-0.03em] text-ink">{row.cadenceRiskCount} SEs</dd>
              </div>
            </dl>
            {row.flags.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-ink-2">
                {row.flags.map((flag) => (
                  <li className="flex gap-1.5" key={flag}>
                    <span aria-hidden className="text-warning">▲</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-success">✓ Coaching patterns look healthy.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
