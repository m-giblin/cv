"use client";

import { useEffect, useState } from "react";
import { LineCard, LoadingState } from "@/components/admin/admin-ui";

type Bucket = { outcome: "won" | "lost" | "pending"; avgComposite: number | null; sampleSize: number };

const OUTCOME_LABEL: Record<Bucket["outcome"], string> = {
  won: "Won deals",
  lost: "Lost deals",
  pending: "Pending or untagged",
};

/**
 * Directional-only: readiness composite vs. self-reported Deal Prep outcome.
 * Not a rigorous correlation study — sample sizes are small until more
 * outcomes get tagged, and the UI says so rather than implying precision.
 */
export function ReadinessOutcomeCorrelation() {
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [totalTagged, setTotalTagged] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/readiness-outcome-correlation")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { buckets: Bucket[]; totalTagged: number } | null) => {
        if (body) {
          setBuckets(body.buckets);
          setTotalTagged(body.totalTagged);
        }
      });
  }, []);

  if (!buckets) {
    return <LoadingState label="Loading readiness outcomes…" />;
  }

  return (
    <LineCard meta="Directional" title="Readiness vs. deal outcomes">
      <p className="text-sm leading-[1.5] text-ink-2">
        This is directional only. {totalTagged} won or lost outcomes are tagged in Deal Prep so far. It gets stronger
        as more outcomes are tagged, so treat it as a hypothesis to watch, not a proven correlation.
      </p>
      <dl className="mt-4 grid grid-cols-1 overflow-hidden rounded-[10px] border border-line sm:grid-cols-3">
        {buckets.map((bucket) => (
          <div
            className="flex flex-col gap-1 border-b border-divider px-[18px] py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            key={bucket.outcome}
          >
            <dt className="label-caps whitespace-nowrap">{OUTCOME_LABEL[bucket.outcome]}</dt>
            <dd className="num text-4xl leading-none font-extrabold tracking-[-0.03em] text-blue">
              {bucket.avgComposite != null ? bucket.avgComposite : "—"}
            </dd>
            <dd className="text-[13px] text-muted">
              Average composite from {bucket.sampleSize} {bucket.sampleSize === 1 ? "deal" : "deals"}
            </dd>
          </div>
        ))}
      </dl>
    </LineCard>
  );
}
