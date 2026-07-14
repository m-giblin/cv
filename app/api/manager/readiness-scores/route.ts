import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { computeSeReadinessScore } from "@/lib/readiness/compute-score";
import { coachingCardScore } from "@/lib/coaching/card-score";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";

export async function GET() {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) return session;

 const { data: org } = await session.supabase.rpc("get_profile_subtree", {
 root_profile_id: session.user.id,
 });
 const userIds = (org ?? []).map((row: { id: string }) => row.id);

 if (!userIds.length) {
 return NextResponse.json({ scores: [] });
 }

 const [plans, { data: profiles }, { data: cards }, { data: certs }, { data: lab }] =
 await Promise.all([
 fetchPlansForUsers(session.supabase, userIds),
 session.supabase.from("profiles").select("id, full_name").in("id", userIds),
 session.supabase
 .from("coaching_cards")
 .select("user_id, structured_output, is_practice")
 .in("user_id", userIds),
 session.supabase
 .from("readiness_certifications")
 .select("user_id, status")
 .in("user_id", userIds)
 .eq("status", "approved"),
 session.supabase
 .from("isc_lab_interactions")
 .select("user_id, created_at")
 .in("user_id", userIds)
 .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
 ]);

 const labCount = new Map<string, number>();
 for (const row of lab ?? []) {
 labCount.set(row.user_id, (labCount.get(row.user_id) ?? 0) + 1);
 }

 const certCount = new Map<string, number>();
 for (const row of certs ?? []) {
 certCount.set(row.user_id, (certCount.get(row.user_id) ?? 0) + 1);
 }

 const scores = userIds.map((userId) => {
 const plan = plans.find((p) => p.userId === userId);
 const userCards = (cards ?? []).filter((c) => c.user_id === userId);
 const profile = profiles?.find((p) => p.id === userId);
 const crmQuota = process.env.READINESS_CRM_QUOTA_FACTOR
 ? Number(process.env.READINESS_CRM_QUOTA_FACTOR)
 : null;

 const breakdown = computeSeReadinessScore({
 plan,
 coachingCards: userCards.map((c) => ({
 id: "",
 simulationAssignmentId: "",
 userId,
 strengths: [],
 gaps: [],
 recommendedImprovements: [],
 score: coachingCardScore(c.structured_output),
 linkedCompetencies: [],
 managerSummary: "",
 seReflection: null,
 managerReviewStatus: "pending",
 isPractice: c.is_practice,
 managerComments: null,
 managerGrade: null,
 sentToManagerAt: "",
 reviewedAt: null,
 })),
 approvedCertCount: certCount.get(userId) ?? 0,
 labSessions30d: labCount.get(userId) ?? 0,
 pitchApproved: false,
 crmQuotaAttainment: crmQuota,
 });

 return {
 userId,
 fullName: profile?.full_name ?? "Unknown",
 ...breakdown,
 };
 });

 return NextResponse.json({ scores });
}

const unlockSchema = z.object({
 assignmentId: z.string().uuid(),
 unlockedSegmentMax: z.number().int().min(1).max(6),
 reason: z.string().min(5),
});

export async function POST(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) return session;

 const parsed = unlockSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { managerUnlockSegment } = await import("@/lib/plans/segment-certificates");
 await managerUnlockSegment(session.supabase, {
 assignmentId: parsed.data.assignmentId,
 unlockedSegmentMax: parsed.data.unlockedSegmentMax,
 reason: parsed.data.reason,
 managerId: session.user.id,
 });

 return NextResponse.json({ success: true });
}
