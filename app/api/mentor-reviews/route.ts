import { NextResponse } from "next/server";
import { z } from "zod";
import { approveAssignmentStep, rejectAssignmentStep, submitAssignmentStep } from "@/lib/plans/complete-step";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { data, error } = await supabase
 .from("mentor_review_requests")
 .select("id, user_id, topic, se_notes, status, created_at, assignment_step_id")
 .or(`mentor_id.eq.${user.id},mentor_id.is.null`)
 .order("created_at", { ascending: false });

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 // Stage gates go to the manager; the mentor adds a recommendation on the gate step instead of approving here.
 const gateStepIds = await gateAssignmentStepIds(
 supabase,
 (data ?? []).map((row) => row.assignment_step_id).filter((id): id is string => Boolean(id)),
 );
 const rows = (data ?? []).filter((row) => !row.assignment_step_id || !gateStepIds.has(row.assignment_step_id));

 const userIds = [...new Set(rows.map((row) => row.user_id))];
 const { data: profiles } =
 userIds.length > 0
 ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
 : { data: [] };

 const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

 return NextResponse.json({
 requests: rows.map((row) => ({
 id: row.id,
 userId: row.user_id,
 topic: row.topic,
 seNotes: row.se_notes,
 status: row.status,
 createdAt: row.created_at,
 seName: nameById.get(row.user_id),
 })),
 });
}

async function gateAssignmentStepIds(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, ids: string[]) {
 if (!ids.length) return new Set<string>();
 const { data: steps } = await supabase.from("plan_assignment_steps").select("id, plan_step_id").in("id", ids);
 const planStepIds = [...new Set((steps ?? []).map((step) => step.plan_step_id))];
 const { data: planSteps } = planStepIds.length
 ? await supabase.from("plan_steps").select("id, metadata, sort_order").in("id", planStepIds)
 : { data: [] };
 const gates = new Set(
 (planSteps ?? []).filter((step) => parsePlanStepMetadata(step.metadata, step.sort_order).isSegmentGate).map((step) => step.id),
 );
 return new Set((steps ?? []).filter((step) => gates.has(step.plan_step_id)).map((step) => step.id));
}

const schema = z.object({
 assignmentStepId: z.string().uuid().optional(),
 topic: z.string().min(3),
 seNotes: z.string().optional(),
});

export async function POST(request: Request) {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const parsed = schema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 let mentorId: string | null = null;

 if (parsed.data.assignmentStepId) {
 const { data: assignmentStep } = await supabase
 .from("plan_assignment_steps")
 .select("assignment_id")
 .eq("id", parsed.data.assignmentStepId)
 .maybeSingle();

 if (assignmentStep) {
 const { data: assignment } = await supabase
 .from("plan_assignments")
 .select("mentor_id, user_id")
 .eq("id", assignmentStep.assignment_id)
 .maybeSingle();

 if (assignment?.user_id === user.id) {
 mentorId = assignment.mentor_id;
 }
 }
 }

 if (!mentorId) {
 const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();
 mentorId = profile?.manager_id ?? null;
 }

 const { error } = await supabase.from("mentor_review_requests").insert({
 user_id: user.id,
 mentor_id: mentorId,
 assignment_step_id: parsed.data.assignmentStepId ?? null,
 topic: parsed.data.topic,
 se_notes: parsed.data.seNotes ?? null,
 status: "pending",
 });

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (parsed.data.assignmentStepId) {
 await submitAssignmentStep(supabase, {
 assignmentStepId: parsed.data.assignmentStepId,
 userId: user.id,
 });
 }

 if (mentorId) {
 await createNotification(supabase, {
 userId: mentorId,
 title: "Mentor review requested",
 body: parsed.data.topic,
 actionUrl: "/manager",
 });
 }

 return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const body = (await request.json()) as {
 id: string;
 mentorFeedback: string;
 decision?: "approve" | "reject";
 };

 const { data: requestRow } = await supabase
 .from("mentor_review_requests")
 .select("assignment_step_id, user_id")
 .eq("id", body.id)
 .eq("mentor_id", user.id)
 .maybeSingle();

 const approved = body.decision !== "reject";

 const { error } = await supabase
 .from("mentor_review_requests")
 .update({
 mentor_feedback: body.mentorFeedback,
 status: approved ? "completed" : "pending",
 completed_at: approved ? new Date().toISOString() : null,
 })
 .eq("id", body.id)
 .eq("mentor_id", user.id);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (requestRow?.assignment_step_id) {
 if (approved) {
 await approveAssignmentStep(supabase, {
 assignmentStepId: requestRow.assignment_step_id,
 reviewerId: user.id,
 feedback: body.mentorFeedback,
 });
 } else {
 await rejectAssignmentStep(supabase, {
 assignmentStepId: requestRow.assignment_step_id,
 reviewerId: user.id,
 feedback: body.mentorFeedback,
 });
 }
 }

 if (requestRow?.user_id) {
 await createNotification(supabase, {
 userId: requestRow.user_id,
 title: approved ? "Mentor review approved" : "Mentor review — try again",
 body: body.mentorFeedback,
 actionUrl: "/dashboard",
 });
 }

 return NextResponse.json({ success: true });
}
