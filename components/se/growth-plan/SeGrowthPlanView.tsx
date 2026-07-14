"use client";

import { useEffect, useState } from "react";
import { GrowthPlanPage } from "./GrowthPlanPage";
import { DEMO_GROWTH_PLAN } from "./data";
import type { SeGrowthPlanData } from "./types";
import type { SeGrowthPlanPayload } from "@/lib/se/fetch-se-growth-plan";

const STORAGE_KEY = "dp_approved";

function applyDemoApprovalBridge(payload: SeGrowthPlanPayload): SeGrowthPlanData {
  if (payload.source !== "demo" || payload.hasPlan) {
    return payload;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return payload;
    }
    const approved = JSON.parse(raw) as Record<string, boolean>;
    if (Object.values(approved).some(Boolean)) {
      return DEMO_GROWTH_PLAN;
    }
  } catch {
    /* ignore corrupt storage */
  }

  return payload;
}

export function SeGrowthPlanView({
  seUserId,
  initial,
}: {
  seUserId: string;
  initial?: SeGrowthPlanPayload;
}) {
  const [plan, setPlan] = useState<SeGrowthPlanData | null>(
    initial ? applyDemoApprovalBridge(initial) : null,
  );

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/dev-plans/se/${encodeURIComponent(seUserId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SeGrowthPlanPayload | null) => {
        if (!cancelled && payload) {
          setPlan(applyDemoApprovalBridge(payload));
        }
      })
      .catch(() => {
        /* keep initial payload */
      });

    return () => {
      cancelled = true;
    };
  }, [seUserId]);

  if (!plan) {
    return null;
  }

  return (
    <GrowthPlanPage
      goals={plan.goals}
      hasPlan={plan.hasPlan}
      quarters={plan.quarters}
      signals={plan.signals}
    />
  );
}
