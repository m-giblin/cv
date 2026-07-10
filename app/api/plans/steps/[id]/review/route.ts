import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import { approveAssignmentStep, rejectAssignmentStep } from "@/lib/plans/complete-step";
import { parseAdHocStepId, reviewAdHocStep } from "@/lib/plans/ad-hoc-steps";

const schema = z.object({
 decision: z.enum(["approve", "reject"]),
 feedback: z.string().min(3),
});

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { id } = await context.params;
 const parsed = schema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const adHocId = parseAdHocStepId(id);
 if (adHocId) {
 const result = await reviewAdHocStep(session.supabase, {
 adHocStepId: adHocId,
 reviewerId: session.user.id,
 decision: parsed.data.decision,
 feedback: parsed.data.feedback,
 });
 await createNotification(session.supabase, {
 userId: result.userId,
 title: parsed.data.decision === "approve" ? "Manager signed off on your task" : "Task needs revision",
 body: parsed.data.feedback,
 actionUrl: "/my-plan",
 });
 return NextResponse.json({ success: true });
 }

 const result =
 parsed.data.decision === "approve"
 ? await approveAssignmentStep(session.supabase, {
 assignmentStepId: id,
 reviewerId: session.user.id,
 feedback: parsed.data.feedback,
 })
 : await rejectAssignmentStep(session.supabase, {
 assignmentStepId: id,
 reviewerId: session.user.id,
 feedback: parsed.data.feedback,
 });

 await createNotification(session.supabase, {
 userId: result.userId,
 title:
 parsed.data.decision === "approve"
 ? "Plan step approved"
 : "Plan step needs revision",
 body: parsed.data.feedback,
 actionUrl: parsed.data.decision === "approve" ? "/dashboard" : `/plan-steps/${id}`,
 });

 auditMutation(session.user.id, "plan.step_reviewed", "plan_assignment_step", id, {
 decision: parsed.data.decision,
 userId: result.userId,
 });

 return NextResponse.json({ success: true });
 } catch (error) {
 const message = error instanceof Error ? error.message : "Review failed";
 const status = message.includes("Not authorized") ? 403 : 400;
 return NextResponse.json({ error: message }, { status });
 }
}
