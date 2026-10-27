import { redirect } from "next/navigation";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeToday } from "@/components/se/se-today";
import { getHomeRoute } from "@/lib/auth/rbac";
import { requireDashboardPageAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { buildGateRows, toGateRecords } from "@/lib/se/gate-matrix";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { loadAssignments } from "@/lib/playbooks/assignments";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadTodayMentees } from "@/lib/mentoring/today-mentees";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export default async function DashboardPage() {
  const { data, source, tier } = await requireDashboardPageAccess();

  if (tier === "manager") {
    redirect("/manager");
  }

  if (tier === "admin") {
    redirect("/admin");
  }

  if (tier === "se") {
    const context = await resolveTenantContext();
    const tenantId = context?.tenantId ?? data.currentUser.tenantId ?? null;
    const admin = getTenantAdminClient() as unknown as SupabaseClient<Database> | null;
    const [userCerts, settings, playbookAssignments, mentees] = await Promise.all([
      fetchCertificationsForUsers([data.currentUser.id]),
      loadPlatformSettings(data.currentUser.tenantId ?? undefined),
      tenantId ? loadAssignments(tenantId, { assigneeIds: [data.currentUser.id] }) : Promise.resolve([]),
      admin ? loadTodayMentees(admin, data.currentUser.id).catch(() => []) : Promise.resolve([]),
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
          mentees={mentees}
          playbookAssignments={playbookAssignments}
        />
      </>
    );
  }

  redirect(getHomeRoute(tier));
}
