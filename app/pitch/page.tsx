import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requirePitchPageAccess } from "@/lib/auth/require-access";

const VideoPitchCapture = dynamic(
  () => import("@/components/pitch/video-pitch-capture").then((mod) => mod.VideoPitchCapture),
  { loading: () => <div className="h-48 animate-pulse rounded-xl border border-[#e2eaf5] bg-white" /> },
);

const PeerPitchLibrary = dynamic(
  () => import("@/components/pitch/peer-pitch-library").then((mod) => mod.PeerPitchLibrary),
  { loading: () => <div className="h-32 animate-pulse rounded-xl border border-[#e2eaf5] bg-white" /> },
);

const PitchPlaybackViewer = dynamic(
  () => import("@/components/pitch/pitch-playback-viewer").then((mod) => mod.PitchPlaybackViewer),
  { loading: () => <div className="h-24 animate-pulse rounded-xl border border-[#e2eaf5] bg-white" /> },
);

const PitchPeerReviewForm = dynamic(
  () => import("@/components/pitch/pitch-peer-review-form").then((mod) => mod.PitchPeerReviewForm),
  { loading: () => <div className="h-24 animate-pulse rounded-xl border border-[#e2eaf5] bg-white" /> },
);

type PitchPageProps = {
  searchParams: Promise<{ review?: string; scenario?: string }>;
};

export default async function PitchPage({ searchParams }: PitchPageProps) {
  const { data } = await requirePitchPageAccess();
  const params = await searchParams;

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Practice · Self-review"
        eyebrowColor="#be185d"
        subtitle="Record your pitch, get AI scoring on clarity, structure, and impact — then submit for manager review"
        title="Pitch Studio"
      >
        {params.review ? (
          <>
            <PitchPlaybackViewer submissionId={params.review} />
            <PitchPeerReviewForm pitchId={params.review} />
          </>
        ) : null}
        <VideoPitchCapture initialScenarioId={params.scenario} />
        <PeerPitchLibrary initialPitches={data.peerPitches} />
      </SEPageLayout>
    </AppShell>
  );
}
