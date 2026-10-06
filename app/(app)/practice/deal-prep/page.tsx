import { DealPrepShell } from "@/components/deal-prep/deal-prep-shell";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";

type DealPrepPageProps = {
  searchParams: Promise<{ step?: string; session?: string; test?: string }>;
};

export const metadata = { title: "Deal prep · Practice" };

export default async function DealPrepPage({ searchParams }: DealPrepPageProps) {
  const { data, tier } = await requireAppAccess("/prep");
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <>
      <DealPrepShell
        assignmentStepId={params.step}
        initialSessionId={params.session}
        testMode={testMode}
        tier={tier}
        userId={data.currentUser.id}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </>
  );
}
