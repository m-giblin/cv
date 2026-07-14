"use client";

import { useState } from "react";
import { PracticeWorkspaceBar } from "@/components/practice/practice-workspace-bar";
import { CompetencyFlightCheck } from "@/components/assessments/competency-flight-check";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import type { AccessTier } from "@/lib/auth/rbac";

export function FlightCheckShell({
  tier,
  testMode,
}: {
  tier: AccessTier;
  testMode: boolean;
}) {
  const meta = getPracticePageMeta("/flight-check")!;
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";
  const [progressHint, setProgressHint] = useState("Adaptive assessment");

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <PracticeWorkspaceBar
        backHref={backHref}
        backLabel="My Practice"
        scenarioLabel="Competency Flight Check"
        testMode={testMode}
        tier={tier}
        trailing={
          <span className="font-mono text-[9px] text-[#B0ADA8]">{progressHint}</span>
        }
        workspaceTag={meta.workspaceTag}
        workspaceTagBg={meta.workspaceTagBg}
        workspaceTagColor={meta.workspaceTagColor}
      />
      <CompetencyFlightCheck onProgressHintChange={setProgressHint} />
    </div>
  );
}
