import { redirect } from "next/navigation";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeToday } from "@/components/se/se-today";
import { getHomeRoute } from "@/lib/auth/rbac";
import { requireDashboardPageAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
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
    const [userCerts, settings] = await Promise.all([
      fetchCertificationsForUsers([data.currentUser.id]),
      loadPlatformSettings(data.currentUser.tenantId ?? undefined),
    ]);
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
      <>
        <DataSourceBanner source={source} />
        <SeToday
          calendarEnabled={isFeatureEnabled(settings.featureFlags, "plan-calendar")}
          data={data}
          gateRows={gateRows}
        />
      </>
    );
  }

  redirect(getHomeRoute(tier));
}
