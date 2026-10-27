import type { ReadinessBreakdown } from "@/lib/readiness/compute-score";

/**
 * The same readiness number the manager and mentor see, with what feeds it, so the SE isn't told
 * "no evidence yet" while their manager looks at a score.
 */
export function ReadinessScoreCard({ breakdown, onRamp }: { breakdown: ReadinessBreakdown; onRamp: boolean }) {
  const parts = [
    { label: "Ramp steps validated", value: `${breakdown.planProgress}%` },
    {
      label: "Scored simulations",
      value: breakdown.simulationAvg === null ? "None yet (counts as half)" : `Average ${breakdown.simulationAvg}`,
    },
    { label: "Stages unlocked", value: `${Math.round(breakdown.segmentProgress / 25)} of 4` },
    { label: "Certifications approved", value: `${Math.round(breakdown.certApprovedRatio * 100)}%` },
    { label: "ISC Lab sessions, last 30 days", value: String(breakdown.labSessions30d) },
  ];
  return (
    <section
      aria-label="Readiness score"
      className="flex flex-wrap items-start gap-x-10 gap-y-4 rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col">
        <span className="label-caps">Readiness score</span>
        <span className="num text-[44px] leading-none font-extrabold text-ink">
          {breakdown.score}
          <span className="text-lg font-bold text-muted"> / 100</span>
        </span>
        <span className="mt-1 max-w-[260px] text-sm text-muted">
          {onRamp
            ? "Everyone starts low. It rises as you validate ramp steps, score simulations and clear stage gates."
            : "Your manager sees the same number."}
        </span>
      </div>
      <dl className="grid min-w-[260px] flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 text-sm">
        {parts.map((part) => (
          <div className="contents" key={part.label}>
            <dt className="text-ink-2">{part.label}</dt>
            <dd className="text-right font-bold text-ink">{part.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
