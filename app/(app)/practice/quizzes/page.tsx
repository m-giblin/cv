import { MarketPulseShell } from "@/components/market-pulse/market-pulse-shell";
import { requirePathAccess } from "@/lib/auth/require-access";

type QuizzesPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export const metadata = { title: "Quizzes · Practice" };

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const { tier } = await requirePathAccess("/market-pulse");
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <>
      <MarketPulseShell testMode={testMode} tier={tier} />
    </>
  );
}
