"use client";

import { useRef } from "react";
import { PeerPitchLibrary } from "@/components/pitch/peer-pitch-library";
import { VideoPitchCapture } from "@/components/pitch/video-pitch-capture";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import type { AccessTier } from "@/lib/auth/rbac";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";

export function PitchStudioShell({
  testMode,
  initialScenarioId,
  peerPitches,
}: {
  tier: AccessTier;
  testMode: boolean;
  initialScenarioId?: string;
  peerPitches: PeerPitch[];
}) {
  const peerRef = useRef<HTMLDivElement>(null);

  return (
    <PracticeToolPage
      actions={
        <button
          className="btn-secondary"
          onClick={() => peerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          type="button"
        >
          View peer pitches
        </button>
      }
      eyebrow="Video · self review"
      testMode={testMode}
      title="Pitch Studio"
    >
      <VideoPitchCapture
        initialScenarioId={initialScenarioId}
        peerLibrary={
          <div ref={peerRef}>
            <PeerPitchLibrary initialPitches={peerPitches} variant="compact" />
          </div>
        }
      />
    </PracticeToolPage>
  );
}
