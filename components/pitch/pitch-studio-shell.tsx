"use client";

import { useRef } from "react";
import { PracticeWorkspaceBar } from "@/components/practice/practice-workspace-bar";
import { VideoPitchCapture } from "@/components/pitch/video-pitch-capture";
import { PeerPitchLibrary } from "@/components/pitch/peer-pitch-library";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import type { AccessTier } from "@/lib/auth/rbac";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";

export function PitchStudioShell({
  tier,
  testMode,
  initialScenarioId,
  peerPitches,
}: {
  tier: AccessTier;
  testMode: boolean;
  initialScenarioId?: string;
  peerPitches: PeerPitch[];
}) {
  const meta = getPracticePageMeta("/pitch")!;
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";
  const peerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <PracticeWorkspaceBar
        backHref={backHref}
        backLabel="My Practice"
        scenarioLabel={meta.title}
        testMode={testMode}
        tier={tier}
        trailing={
          <button
            className={SP_OUTLINE_BTN}
            onClick={() => peerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            type="button"
          >
            View peer pitches
          </button>
        }
        workspaceTag={meta.workspaceTag}
        workspaceTagBg={meta.workspaceTagBg}
        workspaceTagColor={meta.workspaceTagColor}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <VideoPitchCapture
          initialScenarioId={initialScenarioId}
          peerLibrary={
            <div ref={peerRef}>
              <PeerPitchLibrary initialPitches={peerPitches} variant="compact" />
            </div>
          }
        />
      </div>
    </div>
  );
}
