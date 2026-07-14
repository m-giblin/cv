import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";
import { buildAccountabilityMetrics } from "@/lib/development/plan-utils";
import type { DashboardData, Profile } from "@/lib/types";

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;

 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const admin = createAdminClient();

 if (!admin) {
 return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
 }

 const { data: managers } = await admin
 .from("profiles")
 .select("id, email, full_name, tenant_id")
 .in("role", ["manager", "mentor", "director", "admin"])
 .not("tenant_id", "is", null);

 let sent = 0;

 for (const manager of managers ?? []) {
 if (!manager.tenant_id) continue;

 const { data: reports } = await admin
 .from("profiles")
 .select("*")
 .eq("manager_id", manager.id)
 .eq("tenant_id", manager.tenant_id);

 if (!reports?.length) {
 continue;
 }

 const reportIds = reports.map((report) => report.id);

 const [
 { data: allProfiles },
 { data: submissions },
 { data: coachingCards },
 { data: activity },
 { data: plans },
 ] = await Promise.all([
 admin.from("profiles").select("*").eq("tenant_id", manager.tenant_id),
 admin
 .from("challenge_submissions")
 .select("*")
 .eq("tenant_id", manager.tenant_id)
 .in("user_id", reportIds),
 admin
 .from("coaching_cards")
 .select("*")
 .eq("tenant_id", manager.tenant_id)
 .in("user_id", reportIds),
 admin
 .from("activity_logs")
 .select("*")
 .eq("tenant_id", manager.tenant_id)
 .in("user_id", reportIds)
 .order("created_at", { ascending: false }),
 admin
 .from("plan_assignments")
 .select("*")
 .eq("tenant_id", manager.tenant_id)
 .in("user_id", reportIds),
 ]);

 const orgProfiles: Profile[] = (reports ?? []).map((row) => ({
 id: row.id,
 email: row.email,
 fullName: row.full_name,
 role: row.role,
 level: row.level,
 managerId: row.manager_id,
 tenantId: row.tenant_id ?? null,
 createdAt: row.created_at,
 }));

 const stubData: DashboardData = {
 currentUser: orgProfiles[0],
 myOrg: orgProfiles,
 profiles: (allProfiles ?? []).map((row) => ({
 id: row.id,
 email: row.email,
 fullName: row.full_name,
 role: row.role,
 level: row.level,
 managerId: row.manager_id,
 tenantId: row.tenant_id ?? null,
 createdAt: row.created_at,
 })),
 plans: [],
 challenges: [],
 submissions: (submissions ?? []).map((row) => ({
 id: row.id,
 userId: row.user_id,
 challengeId: row.challenge_id,
 status: row.status,
 reflectionText: row.reflection_text ?? "",
 managerGrade: row.manager_grade,
 managerFeedback: row.manager_feedback,
 aiSuggestedScore: row.ai_suggested_score,
 submittedAt: row.submitted_at,
 reviewedAt: row.reviewed_at,
 })),
 simulations: [],
 coachingCards: (coachingCards ?? []).map((row) => ({
 id: row.id,
 simulationAssignmentId: row.simulation_assignment_id ?? "",
 userId: row.user_id,
 strengths: [],
 gaps: [],
 recommendedImprovements: [],
 score: 0,
 linkedCompetencies: [],
 managerSummary: "",
 seReflection: row.se_reflection,
 managerReviewStatus: row.manager_review_status,
 isPractice: Boolean((row as { is_practice?: boolean }).is_practice),
 managerComments: row.manager_comments,
 managerGrade: row.manager_grade,
 sentToManagerAt: row.sent_to_manager_at ?? row.created_at,
 reviewedAt: row.reviewed_at,
 })),
 activity: (activity ?? []).map((row) => ({
 id: row.id,
 userId: row.user_id,
 eventType: row.event_type as DashboardData["activity"][number]["eventType"],
 title: row.title,
 metadata: {},
 createdAt: row.created_at,
 })),
 competencies: [],
 notifications: [],
 };

 void plans;

 const developmentPlans = await fetchDevelopmentPlans(reportIds, admin);
 const metrics = buildAccountabilityMetrics(stubData, developmentPlans, orgProfiles);

 const lines = [
 `Weekly enablement digest`,
 "",
 `Pending submissions: ${metrics.pendingSubmissions}`,
 `Pending coaching cards: ${metrics.pendingCoachingCards}`,
 `Overdue goal reviews: ${metrics.overdueReviewCount}`,
 `Inactive SEs (14+ days): ${metrics.inactiveSes.length}`,
 "",
 ...metrics.overdueGoalReviews.slice(0, 5).map((item) => `• ${item.fullName}: ${item.reason}`),
 ];

 const body = lines.join("\n");

 await admin.from("notifications").insert({
 user_id: manager.id,
 title: "Weekly team enablement digest",
 body: body.slice(0, 500),
 });

 const resendKey = process.env.RESEND_API_KEY;
 const fromEmail = process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev";

 if (resendKey && manager.email) {
 await fetch("https://api.resend.com/emails", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${resendKey}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 from: fromEmail,
 to: manager.email,
 subject: "SE Enablement — weekly team digest",
 text: body,
 }),
 });
 }

 sent += 1;
 }

 return NextResponse.json({ sent });
}
