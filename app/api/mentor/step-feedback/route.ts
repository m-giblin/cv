import { NextResponse } from "next/server";
import { z } from "zod";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { MentorAccessError, loadMentorRecords, recordMentorEvent, requireMentoredStep } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";

const postSchema = z.object({
  assignmentStepId: z.string().uuid(),
  body: z.string().trim().min(3).max(4000),
});

/** Feedback on one step, for the mentee who owns it or their mentor. */
export async function GET(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const assignmentStepId = new URL(request.url).searchParams.get("assignmentStepId");
  if (!assignmentStepId) return NextResponse.json({ error: "assignmentStepId required" }, { status: 400 });

  const { data: step } = await session.admin
    .from("plan_assignment_steps")
    .select("assignment_id")
    .eq("id", assignmentStepId)
    .maybeSingle();
  const { data: assignment } = step
    ? await session.admin.from("plan_assignments").select("user_id, mentor_id").eq("id", step.assignment_id).maybeSingle()
    : { data: null };
  if (!assignment || (assignment.user_id !== session.userId && assignment.mentor_id !== session.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const records = (await loadMentorRecords(session.admin, [assignment.user_id])).get(assignment.user_id);
  return NextResponse.json({
    feedback: (records?.feedback ?? []).filter((item) => item.assignmentStepId === assignmentStepId),
  });
}

export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write at least a few words of feedback." }, { status: 400 });

  try {
    const { assignment, planStep } = await requireMentoredStep(session.admin, session.userId, parsed.data.assignmentStepId);
    if (assignment.user_id === session.userId) throw new MentorAccessError("You cannot leave mentor feedback on your own step.");
    const id = await recordMentorEvent(session.admin, {
      menteeId: assignment.user_id,
      actorId: session.userId,
      tenantId: assignment.tenant_id,
      type: MENTOR_EVENT.feedback,
      title: `Mentor feedback on ${planStep.title}`,
      metadata: { assignment_step_id: parsed.data.assignmentStepId, assignment_id: assignment.id, body: parsed.data.body },
    });
    await createNotification(session.admin, {
      userId: assignment.user_id,
      title: "Your mentor left feedback",
      body: `On "${planStep.title}": ${parsed.data.body.slice(0, 180)}`,
      actionUrl: `/my-plan?step=${parsed.data.assignmentStepId}`,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
