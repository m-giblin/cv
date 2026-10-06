"use client";

import { ScoreBar } from "@/components/ui/bars";

export type PitchScoreRow = {
  label: string;
  score: number;
};

function scoreTextClass(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-blue";
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
        <h2 className="label-caps mb-3">AI coaching on your last take</h2>
        {showScores ? (
          <ul className="space-y-3">
            {scores.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-2">{row.label}</span>
                  <span className={`num text-[13px] font-bold ${scoreTextClass(row.score)}`}>
                    {row.score}
                    {row.score < 60 ? <span className="sr-only"> (below 60)</span> : null}
                  </span>
                </div>
                <ScoreBar value={row.score} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-center text-sm text-muted">
            Record a pitch and run AI coaching to see rubric scores here.
          </p>
        )}
        {topNote ? (
          <div className="mt-3 rounded-[10px] bg-signal-soft px-3.5 py-3">
            <p className="mb-1 text-[13px] font-semibold text-ink">Top coaching note</p>
            <p className="text-sm leading-[1.5] text-ink">{topNote}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
