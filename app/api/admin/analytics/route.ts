import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/data/get-analytics-data";
import { requireAdminSession } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const url = new URL(request.url);
 const format = url.searchParams.get("format");

 const analytics = await getAnalyticsData(session.tenantId);

 if (!analytics) {
 return NextResponse.json({ error: "Analytics unavailable." }, { status: 503 });
 }

 if (format === "csv") {
 const rows = [
 "metric,value",
 `totalUsers,${analytics.totalUsers}`,
 `seCount,${analytics.seCount}`,
 `managerCount,${analytics.managerCount}`,
 `activePlans,${analytics.activePlans}`,
 `completedPlans,${analytics.completedPlans}`,
 `avgPlanProgress,${analytics.avgPlanProgress}`,
 `pendingReviews,${analytics.pendingReviews}`,
 `certPendingSignoffs,${analytics.certPendingSignoffs}`,
 `certApprovedTotal,${analytics.certApprovedTotal}`,
 `certClearanceRate,${analytics.certClearanceRate}`,
 `submissionsThisMonth,${analytics.submissionsThisMonth}`,
 `avgDaysToComplete,${analytics.avgDaysToComplete ?? ""}`,
 `recentActivityCount,${analytics.recentActivityCount}`,
 ].join("\n");

 return new NextResponse(rows, {
 headers: {
 "Content-Type": "text/csv",
 "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
 },
 });
 }

 return NextResponse.json(analytics);
}
