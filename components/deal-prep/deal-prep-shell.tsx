"use client";

import { useState } from "react";
import { DealPrepPanel } from "@/components/deal-prep/deal-prep-panel";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import type { AccessTier } from "@/lib/auth/rbac";
import type { SeLevel } from "@/lib/types";

export function DealPrepShell({
  testMode,
  userId,
  userLevel,
  assignmentStepId,
  initialSessionId,
}: {
  tier: AccessTier;
  testMode: boolean;
  userId: string;
  userLevel: SeLevel | string;
  assignmentStepId?: string;
  initialSessionId?: string;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <PracticeToolPage
      actions={
        <button
          aria-expanded={historyOpen}
          className="btn-secondary"
          onClick={() => setHistoryOpen((open) => !open)}
          type="button"
        >
          {historyOpen ? "Hide past briefs" : "View past briefs"}
        </button>
      }
      subtitle="A brief for your next customer call: discovery questions and likely objections."
      testMode={testMode}
      title="Deal prep"
    >
      <DealPrepPanel
        assignmentStepId={assignmentStepId}
        historyOpen={historyOpen}
        initialSessionId={initialSessionId}
        onCloseHistory={() => setHistoryOpen(false)}
        userId={userId}
        userLevel={userLevel}
      />
    </PracticeToolPage>
  );
}
