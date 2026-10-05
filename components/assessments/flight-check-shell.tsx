"use client";

import { useState } from "react";
import { CompetencyFlightCheck } from "@/components/assessments/competency-flight-check";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import type { AccessTier } from "@/lib/auth/rbac";

export function FlightCheckShell({
  testMode,
}: {
  tier: AccessTier;
  testMode: boolean;
}) {
  const [progressHint, setProgressHint] = useState("Adaptive assessment");

  return (
    <PracticeToolPage
      actions={
        <span aria-live="polite" className="label-mono">
          {progressHint}
        </span>
      }
      eyebrow="Adaptive readiness check"
      testMode={testMode}
      title="Flight check"
    >
      <CompetencyFlightCheck onProgressHintChange={setProgressHint} />
    </PracticeToolPage>
  );
}
