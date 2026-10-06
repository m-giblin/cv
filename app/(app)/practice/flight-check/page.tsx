import { FlightCheckShell } from "@/components/assessments/flight-check-shell";
import { requirePathAccess } from "@/lib/auth/require-access";

type FlightCheckPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export const metadata = { title: "Flight check · Practice" };

export default async function FlightCheckPage({ searchParams }: FlightCheckPageProps) {
  const { tier } = await requirePathAccess("/flight-check");
  const params = await searchParams;
  const testMode = tier === "admin" && params.test === "1";

  return (
    <>
      <FlightCheckShell testMode={testMode} tier={tier} />
    </>
  );
}
