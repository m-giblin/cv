import dynamic from "next/dynamic";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PitchStudioShell } from "@/components/pitch/pitch-studio-shell";
import { PageBody, PageHeader } from "@/components/ui/page-header";
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
        <div className="flex flex-col pb-7">
          <PageHeader
            eyebrow={
              <>
                <Link className="link" href="/practice/pitch">
                  Pitch Studio
                </Link>
                &nbsp;/&nbsp;Peer review
              </>
            }
            subtitle="Watch the pitch, then score it against the rubric."
            title="Peer review."
          />
          <PageBody>
            <section aria-label="Peer pitch review" className="flex max-w-[860px] flex-col gap-4 rounded-[14px] border border-line bg-white p-6">
              <PitchPlaybackViewer submissionId={params.review} />
              <PitchPeerReviewForm pitchId={params.review} />
            </section>
          </PageBody>
        </div>
      ) : (
        <PitchStudioShell
          initialScenarioId={params.scenario}
          peerPitches={data.peerPitches}
          testMode={testMode}
          tier={tier}
        />
      )}
    </AppShell>
  );
}
