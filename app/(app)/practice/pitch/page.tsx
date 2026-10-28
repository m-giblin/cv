import dynamic from "next/dynamic";
import Link from "next/link";
import { PitchStudioShell } from "@/components/pitch/pitch-studio-shell";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePitchPageAccess } from "@/lib/auth/require-access";
import { loadPitchStudioContext } from "@/lib/pitch/pitch-step-context";
import { loadAssignedChapter, playbookForPitchScenario } from "@/lib/playbooks/assignment-context";
import { createClient } from "@/lib/supabase/server";

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
  searchParams: Promise<{ review?: string; scenario?: string; step?: string; test?: string }>;
};

export const metadata = { title: "Pitch · Practice" };

export default async function PitchPage({ searchParams }: PitchPageProps) {
  const { data, tier } = await requirePitchPageAccess();
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";
  // Opened from a ramp step (?step=<assignment step id>): the saved pitch attaches to that step.
  const studio = params.review
    ? { step: null, mentorName: null }
    : await loadPitchStudioContext(await createClient(), data.currentUser.id, params.step);
  // A drill opened from a chapter someone assigned counts toward that assignment.
  const assignedChapter =
    params.review || studio.step || !params.scenario
      ? null
      : await loadAssignedChapter(data.currentUser.id, await playbookForPitchScenario(params.scenario));

  return (
    <>
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
          assignedChapter={assignedChapter}
          initialScenarioId={params.scenario}
          mentorName={studio.mentorName}
          peerPitches={data.peerPitches}
          rampStep={studio.step}
          testMode={testMode}
          tier={tier}
        />
      )}
    </>
  );
}
