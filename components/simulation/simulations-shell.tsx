"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import { SimulationStepStrip } from "@/components/simulation/simulation-step-strip";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import type { AccessTier } from "@/lib/auth/rbac";
import type { SimulationAssignment } from "@/lib/types";
import type { AssignedChapter } from "@/lib/playbooks/assignment-context";

function scenarioLabel(assignment: SimulationAssignment) {
  const persona = assignment.persona.replace(/\s*\(.*\)\s*$/, "").trim();
  return [persona, assignment.vertical].filter(Boolean).join(", ");
}

export function SimulationsShell({
  assignment,
  mentorName,
  assignedChapter = null,
  testMode,
  userLevel,
}: {
  assignment: SimulationAssignment;
  /** Set for free practice by an SE with a mentor: the card is shared with them instead of the manager. */
  mentorName?: string | null;
  assignedChapter?: AssignedChapter | null;
  tier: AccessTier;
  testMode: boolean;
  userLevel: "Basic" | "Senior" | "Advisory";
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const label = useMemo(() => scenarioLabel(assignment), [assignment]);

  return (
    <PracticeToolPage
      actions={<SimulationStepStrip className="min-w-[320px]" step={step} />}
      eyebrow={
        <Link className="link inline-flex items-center gap-1.5" href={testMode ? "/practice/simulations?test=1" : "/practice/simulations"}>
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          All simulations
        </Link>
      }
      subtitle={`AI role-play with ${label}.`}
      testMode={testMode}
      title="Simulations"
    >
      <SimulationWorkspace assignedChapter={assignedChapter} assignment={assignment} mentorName={mentorName} onStepChange={setStep} userLevel={userLevel} />
    </PracticeToolPage>
  );
}
