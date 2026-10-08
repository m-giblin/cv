import { headers } from "next/headers";
import { Suspense } from "react";
import { AdminConsole } from "@/components/admin/admin-console";
import { LoadingState } from "@/components/admin/admin-ui";
import { loadPracticeUsage } from "@/lib/admin/practice-usage";
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

/** `practice` loads library usage figures; only the Content › Practice route needs them. */
export async function AdminSectionPage({ practice = false }: { practice?: boolean } = {}) {
 const adminClient = createAdminClient();
 const { data, source, tenantId } = await requireAdminPageAccess();
 const scopedTenantId = tenantId ?? data.currentUser.tenantId ?? null;
 const seUserIds = seUserIdsFromProfiles(data.profiles);
 const demoData = source === "demo" ? getDemoDashboardData() : null;

 // Independent lookups run together.
 // Only the sections that show these figures pay for them.
 const pathname = (await headers()).get("x-pathname") ?? "";
 const needsAiUsage = practice || pathname.startsWith("/admin/settings/ai");
 const needsReviews = pathname === "/admin" || pathname.startsWith("/admin/content/reviews");
 const [aiUsage, practiceUsage, pendingReviewBreakdown] = await Promise.all([
 adminClient && needsAiUsage ? loadAiUsageSummary(adminClient, scopedTenantId ?? undefined) : Promise.resolve(null),
 practice && adminClient && scopedTenantId
 ? loadPracticeUsage(adminClient, scopedTenantId).catch(() => null)
 : Promise.resolve(null),
 source === "demo" && demoData
 ? Promise.resolve(
 pendingReviewBreakdownFromRecords({
 submissions: demoData.submissions,
 coachingCards: demoData.coachingCards,
 plans: data.plans,
 }),
 )
 : tenantId && needsReviews
 ? fetchPendingReviewBreakdown(tenantId, seUserIds)
 : Promise.resolve({
 challengeSubmissions: 0,
 simulationCards: 0,
 planStepReviews: 0,
 certSignoffs: 0,
 }),
 ]);

 const assignees = data.profiles.filter((profile) => getAccessTier(profile.role) === "se");
 const mentors = data.profiles.filter((profile) =>
 ["manager", "mentor", "director", "admin"].includes(profile.role),
 );

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
 <>
 <Suspense fallback={<LoadingState label="Loading admin console…" />}>
 <AdminConsole
 activity={data.activity}
 aiUsage={aiUsage}
 assignees={assignees}
 initialUsers={initialUsers}
 viewer={data.currentUser}
 mentors={mentors}
 pendingReviews={pendingReviews}
 pendingReviewBreakdown={pendingReviewBreakdown}
 plans={data.plans}
 practiceUsage={practiceUsage}
 profiles={data.profiles}
 />
 </Suspense>
 </>
 );
}
