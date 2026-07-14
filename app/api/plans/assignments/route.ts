import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import { assignPlanToUser } from "@/lib/plans/assign-plan";

const assignSchema = z.object({
 planId: z.string().uuid(),
 userId: z.string().uuid(),
 mentorId: z.string().uuid().nullable().optional(),
 startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 targetCompletion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function POST(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = assignSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const { data: existingAssignment } = await session.supabase
 .from("plan_assignments")
 .select("id")
 .eq("user_id", parsed.data.userId)
 .eq("plan_id", parsed.data.planId)
 .neq("status", "completed")
 .maybeSingle();

 if (existingAssignment) {
 return NextResponse.json(
 { error: "This plan is already assigned to this team member." },
 { status: 409 },
 );
 }

 const assignmentId = await assignPlanToUser(session.supabase, {
 planId: parsed.data.planId,
 userId: parsed.data.userId,
 mentorId: parsed.data.mentorId ?? null,
 assignedBy: session.user.id,
 startDate: parsed.data.startDate,
 targetCompletion: parsed.data.targetCompletion ?? null,
 tenantId: session.tenantId,
 });

 const { data: assignee } = await session.supabase
 .from("profiles")
 .select("full_name, manager_id")
 .eq("id", parsed.data.userId)
 .maybeSingle();

 await session.supabase.from("activity_logs").insert({
 user_id: parsed.data.userId,
 actor_id: session.user.id,
 event_type: "plan_assigned",
 title: "Onboarding plan assigned",
 metadata: { planId: parsed.data.planId, assignmentId },
 });

 await createNotification(session.supabase, {
 userId: parsed.data.userId,
 title: "New onboarding plan assigned",
 body: "Your manager assigned an onboarding plan. Open your workspace to see what's next.",
 actionUrl: "/dashboard",
 });

 await logAuditEvent(session.user.id, {
 action: "plan.assigned",
 targetType: "plan_assignment",
 targetId: assignmentId,
 details: {
 planId: parsed.data.planId,
 userId: parsed.data.userId,
 assigneeName: assignee?.full_name,
 },
 });

 return NextResponse.json({ id: assignmentId });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Assignment failed." },
 { status: 500 },
 );
 }
}
