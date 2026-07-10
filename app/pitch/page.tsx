import dynamic from "next/dynamic";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PitchStudioShell } from "@/components/pitch/pitch-studio-shell";
import { requirePitchPageAccess } from "@/lib/auth/require-access";

const PitchPlaybackViewer = dynamic(
  () => import("@/components/pitch/pitch-playback-viewer").then((mod) => mod.PitchPlaybackViewer),
  { loading: () => <div className="h-24 animate-pulse border border-[#E2DFD9] bg-white" /> },
);

const PitchPeerReviewForm = dynamic(
  () => import("@/components/pitch/pitch-peer-review-form").then((mod) => mod.PitchPeerReviewForm),
  { loading: () => <div className="h-24 animate-pulse border border-[#E2DFD9] bg-white" /> },
);

type PitchPageProps = {
  searchParams: Promise<{ review?: string; scenario?: string; test?: string }>;
};

export default async function PitchPage({ searchParams }: PitchPageProps) {
  const { data, tier } = await requirePitchPageAccess();
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      {testMode ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#D4810A]/30 bg-[#FFFBF0] px-5 py-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#D4810A]">
            Test as SE — validating scoring, personas, and coaching flow
          </p>
          <Link className="font-mono text-[10px] font-semibold text-[#D4810A] hover:underline" href="/admin">
            Exit test mode
          </Link>
        </div>
      ) : null}
      {params.review ? (
        <div className="border-b border-[#E2DFD9] bg-white px-5 py-4">
          <PitchPlaybackViewer submissionId={params.review} />
          <PitchPeerReviewForm pitchId={params.review} />
        </div>
      ) : null}
      <PitchStudioShell
        initialScenarioId={params.scenario}
        peerPitches={data.peerPitches}
        testMode={testMode}
        tier={tier}
      />
    </AppShell>
  );
}
