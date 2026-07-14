import { AppShell } from "@/components/app-shell";
import { DealPrepShell } from "@/components/deal-prep/deal-prep-shell";
import Link from "next/link";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";

type PrepPageProps = {
  searchParams: Promise<{ step?: string; session?: string; test?: string }>;
};

export default async function PrepPage({ searchParams }: PrepPageProps) {
  const { data, tier } = await requireAppAccess("/prep");
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
      <DealPrepShell
        assignmentStepId={params.step}
        initialSessionId={params.session}
        testMode={testMode}
        tier={tier}
        userId={data.currentUser.id}
        userLevel={profileLevelLabel(data.currentUser)}
      />
    </AppShell>
  );
}
