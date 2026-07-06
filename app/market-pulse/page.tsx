import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MarketPulseQuiz } from "@/components/market-pulse/market-pulse-quiz";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function MarketPulsePage() {
  const { data } = await requireAppAccess("/market-pulse");

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Competitive intelligence"
        eyebrowColor="#0891b2"
        subtitle="Weekly quizzes on SailPoint vs. the field — scores feed your Competitive Positioning competency"
        title="Market Pulse"
      >
        <MarketPulseQuiz />
        <p className="mt-4 text-sm text-[#64748b]">
          Go deeper on{" "}
          <Link className="font-semibold text-[#0071ce] hover:underline" href="/learn">
            Learn → GenAI vs Agentic AI
          </Link>
          .
        </p>
      </SEPageLayout>
    </AppShell>
  );
}
