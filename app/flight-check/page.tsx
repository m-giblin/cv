import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FlightCheckShell } from "@/components/assessments/flight-check-shell";
import { requireAppAccess } from "@/lib/auth/require-access";

type FlightCheckPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export default async function FlightCheckPage({ searchParams }: FlightCheckPageProps) {
  const { data, tier } = await requireAppAccess("/flight-check");
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
      <FlightCheckShell testMode={testMode} tier={tier} />
    </AppShell>
  );
}
