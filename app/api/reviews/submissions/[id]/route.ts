import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import {
 approvePlanStepsByType,
 rejectPlanStepsByType,
} from "@/lib/plans/complete-step";

const reviewSchema = z.object({
 decision: z.enum(["approve", "reject"]).default("approve"),
 status: z.enum(["reviewed", "under_review", "in_progress"]).optional(),
 managerGrade: z.number().int().min(1).max(5).optional(),
 managerFeedback: z.string().min(3),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { id } = await context.params;
 const parsed = reviewSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: existing, error: loadError } = await session.supabase
 .from("challenge_submissions")
 .select("user_id, status")
 .eq("id", id)
 .maybeSingle();

 if (loadError || !existing) {
 return NextResponse.json({ error: "Submission not found" }, { status: 404 });
 }

 if (existing.status !== "submitted") {
 return NextResponse.json({ error: "Only submitted work can be reviewed." }, { status: 400 });
 }

 if (!(await canReviewUserWork(existing.user_id))) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const approved = parsed.data.decision === "approve";

 const { data, error } = await session.supabase
 .from("challenge_submissions")
 .update({
 status: approved ? "reviewed" : "in_progress",
 manager_grade: approved ? parsed.data.managerGrade : null,
 manager_feedback: parsed.data.managerFeedback,
 reviewed_at: approved ? new Date().toISOString() : null,
 })
 .eq("id", id)
 .select("user_id, challenge_id")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (approved) {
 await approvePlanStepsByType(session.supabase, {
 userId: data.user_id,
 stepType: "challenge",
 reviewerId: session.user.id,
 feedback: parsed.data.managerFeedback,
 });
 } else {
 await rejectPlanStepsByType(session.supabase, {
 userId: data.user_id,
 stepType: "challenge",
 reviewerId: session.user.id,
 feedback: parsed.data.managerFeedback,
 });
 }

 await session.supabase.from("activity_logs").insert({
 user_id: data.user_id,
 actor_id: session.user.id,
 event_type: "manager_feedback_received",
 title: approved ? "Manager approved challenge" : "Manager requested challenge redo",
 tenant_id: session.tenantId,
 metadata: { submissionId: id, grade: parsed.data.managerGrade ?? null, decision: parsed.data.decision },
 });

 await createNotification(session.supabase, {
 userId: data.user_id,
 title: approved ? "Challenge approved" : "Challenge needs revision",
 body: parsed.data.managerFeedback,
 actionUrl: approved ? "/feedback" : "/challenges?focus=challenge",
 });

 auditMutation(session.user.id, "submission.reviewed", "challenge_submission", id, {
 decision: parsed.data.decision,
 userId: data.user_id,
 });

 return NextResponse.json({ success: true });
}
