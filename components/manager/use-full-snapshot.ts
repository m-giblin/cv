"use client";

import { useEffect, useState } from "react";
import type { SeManagerSnapshot } from "@/components/manager/manager-se-detail-panel";
import { buildQuarterlyAlert } from "@/lib/manager/growth-insights";
import { buildSeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { Competency, DevelopmentPlan } from "@/lib/types";

type Extras = {
  developmentPlan: DevelopmentPlan | null;
  managerNotes: string;
  mentorNotes: SeManagerSnapshot["mentorNotes"];
};

/**
 * Manager pages preload a light snapshot per SE. When one is opened, fetch the rest (development
 * plan, coaching notes) and rebuild the coaching summary with it. Returns null until loaded.
 */
export function useFullSnapshot(base: SeManagerSnapshot | null, competencies: Competency[]): SeManagerSnapshot | null {
  const profileId = base?.profile.id ?? null;
  const [extras, setExtras] = useState<{ id: string; value: Extras } | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void fetch(`/api/manager/se-snapshot?profile=${encodeURIComponent(profileId)}`)
      .then((response) => (response.ok ? (response.json() as Promise<Extras>) : null))
      .catch(() => null)
      .then((value) => {
        if (cancelled) return;
        // On failure, fall back to what the page already had so the workbench still opens.
        setExtras({
          id: profileId,
          value: value ?? {
            developmentPlan: base?.developmentPlan ?? null,
            managerNotes: base?.managerNotes ?? "",
            mentorNotes: base?.mentorNotes ?? null,
          },
        });
      });
    return () => {
      cancelled = true;
    };
    // base is read only as a fallback for this profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  if (!base || extras?.id !== base.profile.id) return null;

  const { developmentPlan, managerNotes, mentorNotes } = extras.value;
  const quarterlyAlert = buildQuarterlyAlert(developmentPlan);
  const coaching = buildSeCoachingSummary({
    profile: base.profile,
    plan: base.plan,
    developmentPlan,
    coachingCards: base.coachingCards,
    submissions: base.submissions,
    activity: base.activity,
    openReviewCount: base.openReviewCount,
    competencies,
    approvedCerts: base.approvedCerts,
    simTrend: base.simTrend,
    cohortBenchmark: base.cohortBenchmark,
    quarterlyAlert,
    certSummary: base.certSummary,
  });

  return { ...base, developmentPlan, managerNotes, mentorNotes, quarterlyAlert, coaching };
}
