import { AppShell } from "@/components/app-shell";
import { MarketPulseShell } from "@/components/market-pulse/market-pulse-shell";
import { requireAppAccess } from "@/lib/auth/require-access";

type QuizzesPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export const metadata = { title: "Quizzes · Practice" };

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const { data, tier } = await requireAppAccess("/market-pulse");
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <MarketPulseShell testMode={testMode} tier={tier} />
    </AppShell>
  );
}
