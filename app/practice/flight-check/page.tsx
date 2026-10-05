import { AppShell } from "@/components/app-shell";
import { FlightCheckShell } from "@/components/assessments/flight-check-shell";
import { requireAppAccess } from "@/lib/auth/require-access";

type FlightCheckPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export const metadata = { title: "Flight check · Practice" };

export default async function FlightCheckPage({ searchParams }: FlightCheckPageProps) {
  const { data, tier } = await requireAppAccess("/flight-check");
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <FlightCheckShell testMode={testMode} tier={tier} />
    </AppShell>
  );
}
