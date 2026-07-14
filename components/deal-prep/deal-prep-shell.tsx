"use client";

import { useState } from "react";
import { PracticeWorkspaceBar } from "@/components/practice/practice-workspace-bar";
import { DealPrepPanel } from "@/components/deal-prep/deal-prep-panel";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import type { AccessTier } from "@/lib/auth/rbac";
import type { SeLevel } from "@/lib/types";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";

export function DealPrepShell({
  tier,
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
  const meta = getPracticePageMeta("/prep")!;
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="relative flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <PracticeWorkspaceBar
        backHref={backHref}
        backLabel="My Practice"
        scenarioLabel={meta.title}
        testMode={testMode}
        tier={tier}
        trailing={
          <button
            className={SP_OUTLINE_BTN}
            onClick={() => setHistoryOpen((open) => !open)}
            type="button"
          >
            {historyOpen ? "Hide past briefs" : "View past briefs"}
          </button>
        }
        workspaceTag={meta.workspaceTag}
        workspaceTagBg={meta.workspaceTagBg}
        workspaceTagColor={meta.workspaceTagColor}
      />
      <DealPrepPanel
        assignmentStepId={assignmentStepId}
        historyOpen={historyOpen}
        initialSessionId={initialSessionId}
        onCloseHistory={() => setHistoryOpen(false)}
        userId={userId}
        userLevel={userLevel}
      />
    </div>
  );
}
