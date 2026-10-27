import { NextResponse } from "next/server";
import { z } from "zod";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { recordMentorEvent, requireMentoredAssignment } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";

const schema = z.object({
  assignmentId: z.string().uuid(),
  metOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agenda: z.array(z.string().max(400)).max(30).default([]),
  notes: z.string().max(8000).default(""),
  nextActions: z.string().max(2000).default(""),
});

/** Log a 1:1. Next actions are sent to the mentee so they know what they agreed to. */
export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!parsed.data.notes.trim() && !parsed.data.nextActions.trim()) {
    return NextResponse.json({ error: "Add notes or next actions before saving the check-in." }, { status: 400 });
  }

  // UTC today runs ahead of US time, so this only refuses dates that are clearly in the future.
  if (parsed.data.metOn > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "That date hasn't happened yet. Log the 1:1 once you've met." }, { status: 400 });
  }

  try {
    const assignment = await requireMentoredAssignment(session.admin, session.userId, parsed.data.assignmentId);
    const id = await recordMentorEvent(session.admin, {
      menteeId: assignment.user_id,
      actorId: session.userId,
      tenantId: assignment.tenant_id,
      type: MENTOR_EVENT.checkin,
      title: `Mentor 1:1 on ${new Date(`${parsed.data.metOn}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}`,
      metadata: {
        assignment_id: assignment.id,
        met_on: parsed.data.metOn,
        agenda: parsed.data.agenda,
        notes: parsed.data.notes,
        next_actions: parsed.data.nextActions,
      },
    });
    if (parsed.data.nextActions.trim()) {
      await createNotification(session.admin, {
        userId: assignment.user_id,
        title: "Next actions from your mentor 1:1",
        body: parsed.data.nextActions.slice(0, 400),
        actionUrl: "/my-plan",
      });
    }
    return NextResponse.json({ id });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
