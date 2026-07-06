import { AppShell } from "@/components/app-shell";
import { DealPrepPanel } from "@/components/deal-prep/deal-prep-panel";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";

type PrepPageProps = {
  searchParams: Promise<{ step?: string; session?: string }>;
};

export default async function PrepPage({ searchParams }: PrepPageProps) {
  const { data } = await requireAppAccess("/prep");
  const params = await searchParams;

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Practice · Pre-call prep"
        eyebrowColor="#d97706"
        subtitle="AI-powered pre-call brief — account context, discovery questions, objection prep, and competitive positioning"
        title="Deal Prep"
      >
        <DealPrepPanel
          assignmentStepId={params.step}
          initialSessionId={params.session}
          userId={data.currentUser.id}
          userLevel={profileLevelLabel(data.currentUser)}
        />
      </SEPageLayout>
    </AppShell>
  );
}
