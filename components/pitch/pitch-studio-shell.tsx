"use client";

import { useRef } from "react";
import { PeerPitchLibrary } from "@/components/pitch/peer-pitch-library";
import { VideoPitchCapture } from "@/components/pitch/video-pitch-capture";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import type { AccessTier } from "@/lib/auth/rbac";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";
import type { AssignedChapter } from "@/lib/playbooks/assignment-context";
import type { PitchStepContext } from "@/lib/pitch/pitch-step";

export function PitchStudioShell({
  testMode,
  initialScenarioId,
  peerPitches,
  rampStep = null,
  mentorName = null,
  assignedChapter = null,
}: {
  tier: AccessTier;
  testMode: boolean;
  initialScenarioId?: string;
  peerPitches: PeerPitch[];
  rampStep?: PitchStepContext | null;
  mentorName?: string | null;
  assignedChapter?: AssignedChapter | null;
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
      subtitle={
        rampStep
          ? "Record or type the pitch, score it, then submit it to your ramp step."
          : "Record a timed pitch, then review it yourself before anyone else sees it."
      }
      testMode={testMode}
      title="Pitch Studio"
    >
      <VideoPitchCapture
        initialScenarioId={initialScenarioId}
        assignedChapter={assignedChapter}
        mentorName={mentorName}
        rampStep={rampStep}
        peerLibrary={
          <div ref={peerRef}>
            <PeerPitchLibrary initialPitches={peerPitches} variant="compact" />
          </div>
        }
      />
    </PracticeToolPage>
  );
}
