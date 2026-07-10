"use client";

import { useState } from "react";
import { PracticeWorkspaceBar } from "@/components/practice/practice-workspace-bar";
import { MarketPulseQuiz } from "@/components/market-pulse/market-pulse-quiz";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import type { AccessTier } from "@/lib/auth/rbac";

export function MarketPulseShell({
  tier,
  testMode,
}: {
  tier: AccessTier;
  testMode: boolean;
}) {
  const meta = getPracticePageMeta("/market-pulse")!;
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";
  const [progressHint, setProgressHint] = useState("Loading quiz…");

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <PracticeWorkspaceBar
        backHref={backHref}
        backLabel="My Practice"
        scenarioLabel={meta.title}
        testMode={testMode}
        tier={tier}
        trailing={
          <span className="font-mono text-[9px] text-[#B0ADA8]">{progressHint}</span>
        }
        workspaceTag={meta.workspaceTag}
        workspaceTagBg={meta.workspaceTagBg}
        workspaceTagColor={meta.workspaceTagColor}
      />
      <MarketPulseQuiz onProgressHintChange={setProgressHint} />
    </div>
  );
}
