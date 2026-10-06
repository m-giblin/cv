"use client";

import { useState } from "react";
import { MarketPulseQuiz } from "@/components/market-pulse/market-pulse-quiz";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import type { AccessTier } from "@/lib/auth/rbac";

export function MarketPulseShell({
  testMode,
}: {
  tier: AccessTier;
  testMode: boolean;
}) {
  const [progressHint, setProgressHint] = useState("Loading quiz…");

  return (
    <PracticeToolPage
      actions={
        <span aria-live="polite" className="text-sm text-muted">
          {progressHint}
        </span>
      }
      subtitle="A short weekly quiz on competitive intel."
      testMode={testMode}
      title="Market Pulse quiz"
    >
      <MarketPulseQuiz onProgressHintChange={setProgressHint} />
    </PracticeToolPage>
  );
}
