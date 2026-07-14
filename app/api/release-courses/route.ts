import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { assignPlanToUser } from "@/lib/plans/assign-plan";
import { getActiveAssignmentUserIdsForPlan } from "@/lib/plans/active-assignment";
import { createNotification } from "@/lib/notifications/create-notification";
import { requireManagerSession } from "@/lib/auth/require-manager";

const createSchema = z.object({
 name: z.string().min(3),
 description: z.string().optional(),
 projectTag: z.string().min(2),
 planId: z.string().uuid().optional(),
 labMode: z.string().optional(),
 pitchTopic: z.string().optional(),
 corpusTagFilters: z.array(z.string()).optional(),
 slackAnnounceChannel: z.string().optional(),
});

const assignSchema = z.object({
 userIds: z.array(z.string().uuid()).min(1),
 startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 targetCompletion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET() {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) return session;

 const { data, error } = await session.supabase
 .from("release_courses")
 .select("id, name, description, project_tag, plan_id, published_at, created_at")
 .order("created_at", { ascending: false });

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const courses = data ?? [];
 const planIds = [...new Set(courses.map((course) => course.plan_id).filter(Boolean))] as string[];

 const enrolledByPlan = new Map<string, string[]>();
 await Promise.all(
 planIds.map(async (planId) => {
 const enrolled = await getActiveAssignmentUserIdsForPlan(session.supabase, planId);
 enrolledByPlan.set(planId, [...enrolled]);
 }),
 );

 const enriched = courses.map((course) => ({
 ...course,
 enrolled_user_ids: course.plan_id ? (enrolledByPlan.get(course.plan_id) ?? []) : [],
 }));

 return NextResponse.json({ courses: enriched });
}

export async function POST(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) return session;

 const parsed = createSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data, error } = await session.supabase
 .from("release_courses")
 .insert({
 name: parsed.data.name,
 description: parsed.data.description ?? null,
 project_tag: parsed.data.projectTag,
 plan_id: parsed.data.planId ?? null,
 lab_mode: parsed.data.labMode ?? null,
 pitch_topic: parsed.data.pitchTopic ?? null,
 corpus_tag_filters: parsed.data.corpusTagFilters ?? [],
 slack_announce_channel: parsed.data.slackAnnounceChannel ?? null,
 created_by: session.user.id,
 published_at: new Date().toISOString(),
 })
 .select("id")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(
 session.user.id,
 "release.course.created",
 "release_course",
 data.id,
 { name: parsed.data.name, projectTag: parsed.data.projectTag },
 session.tenantId,
 );

 return NextResponse.json({ id: data.id });
}

export async function PATCH(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) return session;

 const body = z
 .object({
 courseId: z.string().uuid(),
 assign: assignSchema,
 })
 .safeParse(await request.json());

 if (!body.success) {
 return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
 }

 const { data: course } = await session.supabase
 .from("release_courses")
 .select("id, name, plan_id, project_tag")
 .eq("id", body.data.courseId)
 .maybeSingle();

 if (!course?.plan_id) {
 return NextResponse.json({ error: "Course has no linked plan template" }, { status: 400 });
 }

 const assignmentIds: string[] = [];
 const skippedUserIds: string[] = [];
 const alreadyEnrolled = await getActiveAssignmentUserIdsForPlan(
 session.supabase,
 course.plan_id,
 body.data.assign.userIds,
 );

 for (const userId of body.data.assign.userIds) {
 if (alreadyEnrolled.has(userId)) {
 skippedUserIds.push(userId);
 continue;
 }

 const assignmentId = await assignPlanToUser(session.supabase, {
 planId: course.plan_id,
 userId,
 mentorId: null,
 assignedBy: session.user.id,
 startDate: body.data.assign.startDate,
 targetCompletion: body.data.assign.targetCompletion ?? null,
 tenantId: session.tenantId,
 });
 assignmentIds.push(assignmentId);

 await createNotification(session.supabase, {
 userId,
 title: `Release training: ${course.name}`,
 body: "Your manager assigned just-in-time release training.",
 actionUrl: "/resources",
 });

 if (course.project_tag && process.env.SLACK_BOT_TOKEN) {
 const { data: courseMeta } = await session.supabase
 .from("release_courses")
 .select("slack_announce_channel, corpus_tag_filters, lab_mode, pitch_topic")
 .eq("id", body.data.courseId)
 .maybeSingle();

 const channel = courseMeta?.slack_announce_channel;
 if (channel) {
 await fetch("https://slack.com/api/chat.postMessage", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 channel,
 text: [
 `*Release training assigned:* ${course.name}`,
 `Project tag: ${course.project_tag}`,
 courseMeta?.lab_mode ? `Lab mode: ${courseMeta.lab_mode}` : null,
 courseMeta?.pitch_topic ? `Pitch: ${courseMeta.pitch_topic}` : null,
 `Resources: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}/resources`,
 ]
 .filter(Boolean)
 .join("\n"),
 }),
 });
 }
 }
 }

 if (assignmentIds.length > 0) {
 auditMutation(
 session.user.id,
 "release.course.assigned",
 "release_course",
 body.data.courseId,
 { assignmentIds, userCount: assignmentIds.length },
 session.tenantId,
 );
 }

 return NextResponse.json({
 assigned: assignmentIds.length,
 skipped: skippedUserIds.length,
 skippedUserIds,
 assignmentIds,
 });
}
