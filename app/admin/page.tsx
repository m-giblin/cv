import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminConsole } from "@/components/admin/admin-console";
import { loadAiUsageSummary } from "@/lib/ai/settings";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAdminPageAccess } from "@/lib/auth/require-access";
import {
 fetchPendingReviewBreakdown,
 pendingReviewBreakdownFromRecords,
 pendingReviewTotal,
 seUserIdsFromProfiles,
} from "@/lib/data/get-pending-review-breakdown";
import { getDemoDashboardData } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
 const adminClient = createAdminClient();
 const { data, source, tenantId } = await requireAdminPageAccess();
 const aiUsage = adminClient
 ? await loadAiUsageSummary(adminClient, tenantId ?? data.currentUser.tenantId ?? undefined)
 : null;

 const assignees = data.profiles.filter((profile) => getAccessTier(profile.role) === "se");
 const mentors = data.profiles.filter((profile) =>
 ["manager", "mentor", "director", "admin"].includes(profile.role),
 );

 const seUserIds = seUserIdsFromProfiles(data.profiles);
 const demoData = source === "demo" ? getDemoDashboardData() : null;
 const pendingReviewBreakdown =
 source === "demo" && demoData
 ? pendingReviewBreakdownFromRecords({
 submissions: demoData.submissions,
 coachingCards: demoData.coachingCards,
 plans: data.plans,
 })
 : tenantId
 ? await fetchPendingReviewBreakdown(tenantId, seUserIds)
 : {
 challengeSubmissions: 0,
 simulationCards: 0,
 planStepReviews: 0,
 certSignoffs: 0,
 };

 const pendingReviews = pendingReviewTotal(pendingReviewBreakdown);

 const initialUsers = data.profiles.map((profile) => ({
 id: profile.id,
 email: profile.email,
 full_name: profile.fullName,
 role: profile.role,
 level: profile.level,
 manager_id: profile.managerId,
 created_at: profile.createdAt,
 }));

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <div className="space-y-6">
 <Suspense fallback={<div className="text-sm text-stone-500">Loading admin console…</div>}>
 <AdminConsole
 activity={data.activity}
 aiUsage={aiUsage}
 assignees={assignees}
 initialUsers={initialUsers}
 mentors={mentors}
 pendingReviews={pendingReviews}
 pendingReviewBreakdown={pendingReviewBreakdown}
 plans={data.plans}
 profiles={data.profiles}
 />
 </Suspense>
 </div>
 </AppShell>
 );
}
