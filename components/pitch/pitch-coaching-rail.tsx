"use client";

export type PitchScoreRow = {
  label: string;
  score: number;
};

function scoreColor(score: number) {
  if (score >= 85) return "#0A6E45";
  if (score >= 75) return "#0071CE";
  if (score >= 65) return "#D4810A";
  return "#B83128";
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
    <div className="border-b border-[#E2DFD9] bg-white">
      <div className="px-4 py-3.5">
        <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">
          AI coaching · Last submission
        </p>
        {showScores ? (
          scores.map((row) => (
            <div className="mb-2.5" key={row.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#3D3C38]">{row.label}</span>
                <span
                  className="font-mono text-xs font-medium"
                  style={{ color: scoreColor(row.score) }}
                >
                  {row.score}
                </span>
              </div>
              <div className="h-1 overflow-hidden bg-[#ECEAE6]">
                <div
                  className="h-full transition-all"
                  style={{ background: scoreColor(row.score), width: `${row.score}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] leading-relaxed text-[#A09D98]">
            Record a pitch and run AI coaching to see rubric scores here.
          </p>
        )}
        {topNote ? (
          <div className="mt-2.5 border-l-[3px] border-[#0071CE] bg-[#F0F7FF] px-2.5 py-2">
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#0071CE]">
              Top coaching note
            </p>
            <p className="text-[11px] leading-relaxed text-[#1A3A5C]">{topNote}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
