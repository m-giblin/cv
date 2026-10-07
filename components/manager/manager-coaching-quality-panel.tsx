"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ManagerCoachingQuality } from "@/lib/coaching/manager-quality";

/** Your own coaching quality over the last 30 days, as one compact strip of stats. */
export function ManagerCoachingQualityPanel({ orgIds }: { orgIds: string[] }) {
  const [row, setRow] = useState<ManagerCoachingQuality | null | undefined>(undefined);

  useEffect(() => {
    const query = new URLSearchParams({ self: "1" });
    if (orgIds.length) query.set("orgIds", orgIds.join(","));
    void fetch(`/api/manager/coaching-quality?${query}`)
      .then((response) => (response.ok ? response.json() : { quality: [] }))
      .then((body: { quality: ManagerCoachingQuality[] }) => setRow(body.quality?.[0] ?? null))
      .catch(() => setRow(null));
  }, [orgIds]);

  // Without any sign-offs the score and rates are defaults, not results, so they stay hidden.
  const hasSignoffs = Boolean(row && row.totalSignoffs > 0);
  const quality =
    row == null || !hasSignoffs
      ? null
      : row.qualityScore >= 75
        ? ({ tone: "success", word: "Strong" } as const)
        : row.qualityScore >= 55
          ? ({ tone: "warning", word: "Fair" } as const)
          : ({ tone: "danger", word: "Weak" } as const);

  const stats: [string, string][] = row
    ? [
        ["Sign-offs", String(row.totalSignoffs)],
        ["Avg review time", hasSignoffs && row.avgReviewDurationMs ? `${Math.round(row.avgReviewDurationMs / 1000)} sec` : "—"],
        ["AI feedback edited", hasSignoffs ? `${Math.round(row.aiEditRate * 100)}%` : "—"],
        ["SEs overdue a touchpoint", String(row.cadenceRiskCount)],
      ]
    : [];

  return (
    <section aria-label="Your coaching, last 30 days" className="rounded-[14px] border border-line bg-white px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="label-caps m-0">Your coaching, last 30 days</h2>
        {quality && row ? (
          <StatusPill tone={quality.tone}>
            {quality.word}, quality {row.qualityScore}
          </StatusPill>
        ) : row ? (
          <StatusPill tone="neutral">No sign-offs yet</StatusPill>
        ) : null}
      </div>
      {row === undefined ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : row === null ? (
        <p className="mt-2 text-sm text-muted">Appears after your first structured sign-offs.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="num m-0 text-[22px] font-extrabold tracking-[-0.03em] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {row.flags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.flags.map((flag) => (
                <StatusPill key={flag} tone="warning">
                  {flag}
                </StatusPill>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
