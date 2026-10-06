"use client";

import { useMemo, useState } from "react";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import { SimulationStepStrip } from "@/components/simulation/simulation-step-strip";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import type { AccessTier } from "@/lib/auth/rbac";
import type { SimulationAssignment } from "@/lib/types";

function scenarioLabel(assignment: SimulationAssignment) {
  const persona = assignment.persona.replace(/\s*\(.*\)\s*$/, "").trim();
  return [persona, assignment.vertical].filter(Boolean).join(", ");
}

export function SimulationsShell({
  assignment,
  testMode,
  userLevel,
}: {
  assignment: SimulationAssignment;
  tier: AccessTier;
  testMode: boolean;
  userLevel: "Basic" | "Senior" | "Advisory";
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const label = useMemo(() => scenarioLabel(assignment), [assignment]);

  return (
    <PracticeToolPage
      actions={<SimulationStepStrip className="min-w-[320px]" step={step} />}
      subtitle={`AI role-play with ${label}.`}
      testMode={testMode}
      title="Simulations"
    >
      <SimulationWorkspace assignment={assignment} onStepChange={setStep} userLevel={userLevel} />
    </PracticeToolPage>
  );
}
