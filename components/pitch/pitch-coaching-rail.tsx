"use client";

export type PitchScoreRow = {
  label: string;
  score: number;
};

/** v2 score rule: danger <60, warning 60–69, blue ≥70. Always paired with the number. */
function scoreFillClass(score: number) {
  if (score < 60) return "bg-danger";
  if (score < 70) return "bg-warning";
  return "bg-blue";
}

function scoreTextClass(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-ink";
}

export function PitchCoachingRail({
  scores,
  topNote,
  hasSubmission,
}: {
  scores: PitchScoreRow[];
  topNote: string | null;
  hasSubmission?: boolean;
}) {
  const showScores = hasSubmission && scores.length > 0;

  return (
    <div className="border-b border-divider bg-white">
      <div className="px-5 py-4">
        <p className="label-mono mb-3">AI coaching · Last submission</p>
        {showScores ? (
          <ul className="space-y-3">
            {scores.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-2">{row.label}</span>
                  <span className={`font-mono text-xs font-medium ${scoreTextClass(row.score)}`}>
                    {row.score < 60 ? "▲ " : ""}
                    {row.score}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-[4px] bg-divider">
                  <div
                    className={`h-full rounded-[4px] ${scoreFillClass(row.score)}`}
                    style={{ width: `${Math.max(0, Math.min(100, row.score))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-4 text-center text-sm text-muted">
            Record a pitch and run AI coaching to see rubric scores here.
          </p>
        )}
        {topNote ? (
          <div className="mt-3 rounded-[10px] bg-signal-soft px-3.5 py-3">
            <p className="mb-1 font-mono text-xs font-medium uppercase tracking-[0.03em] text-ink">→ Top coaching note</p>
            <p className="text-sm leading-[1.5] text-ink">{topNote}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
