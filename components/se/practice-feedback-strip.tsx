import Link from "next/link";
import type { CoachingCard } from "@/lib/types";

export function PracticeFeedbackStrip({
  card,
  needsRevision,
}: {
  card: CoachingCard | undefined;
  needsRevision: boolean;
}) {
  if (!card) {
    return (
      <div className="ns-card ns-card-lavender p-4">
        <p className="text-sm font-bold text-stone-900">Practice feedback</p>
        <p className="mt-2 text-xs text-stone-600">Complete a simulation to see skill breakdown and coaching notes here.</p>
        <Link className="mt-2 inline-block text-xs font-semibold text-[#0033a1] hover:underline" href="/simulations">
          Open flight simulator →
        </Link>
      </div>
    );
  }

  const topStrength = card.strengths[0];
  const topGap = card.gaps[0];

  return (
    <div className="ns-card ns-card-lavender p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">Last practice</h2>
        {needsRevision ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Revision requested</span>
        ) : card.managerReviewStatus === "pending" ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-900">With manager</span>
        ) : null}
      </div>
      <p className="mt-1 text-2xl font-bold text-stone-900">{card.score}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-stone-600">Strength</dt>
          <dd className="text-right font-semibold text-emerald-700">{topStrength ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-stone-600">Focus next</dt>
          <dd className="text-right font-semibold text-amber-800">{topGap ?? "—"}</dd>
        </div>
      </dl>
      <Link className="mt-2 inline-block text-[11px] font-semibold text-[#0033a1] hover:underline" href="/feedback">
        Full coaching card →
      </Link>
    </div>
  );
}
