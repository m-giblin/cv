import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeToday } from "@/components/se/se-today";
import { getHomeRoute } from "@/lib/auth/rbac";
import { requireDashboardPageAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { buildGateRows, toGateRecords } from "@/lib/se/gate-matrix";

export default async function DashboardPage() {
  const { data, source, tier } = await requireDashboardPageAccess();

  if (tier === "manager") {
    redirect("/manager");
  }

  if (tier === "admin") {
    redirect("/admin");
  }

  if (tier === "se") {
    const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
    const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);
    const gateRows = buildGateRows({
      records: toGateRecords(userCerts),
      coachingCards: data.coachingCards,
      submissions: data.submissions,
      challenges: data.challenges,
      userId: data.currentUser.id,
      reviewerFirstName: manager?.fullName.split(" ")[0] ?? null,
    });

    return (
      <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
        <DataSourceBanner source={source} />
        <SeToday data={data} gateRows={gateRows} />
      </AppShell>
    );
  }

  redirect(getHomeRoute(tier));
}
