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

 const mentorId = parsed.data.mentorId ?? null;
 const [{ data: plan }, { data: people }] = await Promise.all([
 session.supabase.from("onboarding_plans").select("name").eq("id", parsed.data.planId).maybeSingle(),
 session.supabase
 .from("profiles")
 .select("id, full_name")
 .in("id", mentorId ? [session.user.id, mentorId] : [session.user.id]),
 ]);
 const firstNameOf = (id: string) => (people ?? []).find((row) => row.id === id)?.full_name.split(" ")[0] ?? null;
 const assignerFirst = firstNameOf(session.user.id) ?? "Your manager";
 const mentorFirst = mentorId && mentorId !== session.user.id ? firstNameOf(mentorId) : null;

 // Name the plan and the mentor, so the new hire knows who to expect and that dates come from that first meeting.
 await createNotification(session.supabase, {
 userId: parsed.data.userId,
 title: `${assignerFirst} assigned you ${plan?.name ?? "an onboarding plan"}`,
 body: mentorFirst
 ? `${mentorFirst} is your mentor and will set up your first 1:1, where you agree your due dates together. Your first step is on your Today page.`
 : "Your first step is on your Today page.",
 actionUrl: "/dashboard",
 });

 // The mentor agrees the schedule with the new hire, so they need to know they've been chosen.
 if (mentorId && mentorId !== session.user.id) {
 const name = assignee?.full_name ?? "A new team member";
 await createNotification(session.supabase, {
 userId: mentorId,
 title: `You're mentoring ${name}`,
 body: `${plan?.name ?? "An onboarding plan"} starts ${new Date(`${parsed.data.startDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}. Read the hiring brief, meet ${name.split(" ")[0]}, then set the schedule together.`,
 actionUrl: "/mentoring",
 });
 }

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
