import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { PitchStudioShell } from "@/components/pitch/pitch-studio-shell";
import { requirePitchPageAccess } from "@/lib/auth/require-access";

const loadingBlock = () => (
  <div className="h-24 animate-pulse rounded-[14px] border border-line bg-white motion-reduce:animate-none" />
);

const PitchPlaybackViewer = dynamic(
  () => import("@/components/pitch/pitch-playback-viewer").then((mod) => mod.PitchPlaybackViewer),
  { loading: loadingBlock },
);

const PitchPeerReviewForm = dynamic(
  () => import("@/components/pitch/pitch-peer-review-form").then((mod) => mod.PitchPeerReviewForm),
  { loading: loadingBlock },
);

type PitchPageProps = {
  searchParams: Promise<{ review?: string; scenario?: string; test?: string }>;
};

export const metadata = { title: "Pitch · Practice" };

export default async function PitchPage({ searchParams }: PitchPageProps) {
  const { data, tier } = await requirePitchPageAccess();
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      {params.review ? (
        <section
          aria-label="Peer pitch review"
          className="mx-[var(--gutter)] mt-6 flex flex-col gap-4 rounded-[14px] border-[1.5px] border-ink bg-white p-6"
        >
          <PitchPlaybackViewer submissionId={params.review} />
          <PitchPeerReviewForm pitchId={params.review} />
        </section>
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
