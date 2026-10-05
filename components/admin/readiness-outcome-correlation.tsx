"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Bucket = { outcome: "won" | "lost" | "pending"; avgComposite: number | null; sampleSize: number };

const OUTCOME_LABEL: Record<Bucket["outcome"], string> = {
  won: "Won deals",
  lost: "Lost deals",
  pending: "Pending / untagged",
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
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        Readiness vs. deal outcomes
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Directional only — {totalTagged} won/lost outcomes tagged so far in Deal Prep. This strengthens as more
        outcomes get tagged; treat it as a hypothesis to watch, not a proven correlation yet.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {buckets.map((bucket) => (
          <div className="border border-border p-3 text-center" key={bucket.outcome}>
            <p className="font-mono text-[9px] uppercase tracking-[0.07em] text-muted-foreground">
              {OUTCOME_LABEL[bucket.outcome]}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {bucket.avgComposite != null ? bucket.avgComposite : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              avg composite · n={bucket.sampleSize}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
