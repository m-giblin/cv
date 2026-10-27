"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { GateRecommendation } from "@/lib/mentoring/mentor-records-model";

/** The mentor's view on a gate, shown to the manager next to the approval. */
export function MentorGateRecommendationNote({ assignmentStepId }: { assignmentStepId: string }) {
  const [state, setState] = useState<{ loaded: boolean; value: GateRecommendation | null }>({ loaded: false, value: null });

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/mentor/gate-recommendations?assignmentStepId=${encodeURIComponent(assignmentStepId)}`)
      .then((response) => (response.ok ? response.json() : { recommendation: null }))
      .then((body: { recommendation?: GateRecommendation | null }) => {
        if (!cancelled) setState({ loaded: true, value: body.recommendation ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentStepId]);

  if (!state.loaded) return null;
  const item = state.value;
  return (
    <div className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white px-4 py-3">
      <p className="label-caps">Mentor recommendation</p>
      {item ? (
        <>
          <StatusPill tone={item.recommendation === "ready" ? "success" : "warning"}>
            {item.authorName}: {item.recommendation === "ready" ? "ready for sign-off" : "not ready yet"}
          </StatusPill>
          <p className="whitespace-pre-wrap text-ink">{item.rationale}</p>
        </>
      ) : (
        <p className="text-muted">The mentor has not sent a recommendation for this gate.</p>
      )}
    </div>
  );
}
