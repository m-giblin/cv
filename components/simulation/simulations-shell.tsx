"use client";

import { useMemo, useState } from "react";
import { PracticeWorkspaceBar } from "@/components/practice/practice-workspace-bar";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import type { AccessTier } from "@/lib/auth/rbac";
import type { SimulationAssignment } from "@/lib/types";

function scenarioLabel(assignment: SimulationAssignment) {
  const persona = assignment.persona.replace(/\s*\(.*\)\s*$/, "").trim();
  return `${assignment.vertical} vertical — ${persona.toLowerCase()}`;
}

export function SimulationsShell({
  assignment,
  tier,
  testMode,
  userLevel,
}: {
  assignment: SimulationAssignment;
  tier: AccessTier;
  testMode: boolean;
  userLevel: "Basic" | "Senior" | "Advisory";
}) {
  const meta = getPracticePageMeta("/simulations")!;
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const label = useMemo(() => scenarioLabel(assignment), [assignment]);

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <PracticeWorkspaceBar
        backHref={backHref}
        scenarioLabel={label}
        step={step}
        testMode={testMode}
        tier={tier}
        workspaceTag={meta.workspaceTag}
        workspaceTagBg={meta.workspaceTagBg}
        workspaceTagColor={meta.workspaceTagColor}
      />
      <div className="flex min-h-0 flex-1 flex-col px-0">
        <SimulationWorkspace
          assignment={assignment}
          onStepChange={setStep}
          userLevel={userLevel}
        />
      </div>
    </div>
  );
}
