import { NextResponse } from "next/server";
import { z } from "zod";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { loadMentorRecords, menteeRelationship, recordMentorEvent } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";

const putSchema = z.object({
  menteeId: z.string().uuid(),
  background: z.string().trim().min(10).max(4000),
  watchFor: z.string().trim().min(10).max(2000),
});

/** The hiring brief for a mentee. Mentors read it; the manager writes it. */
export async function GET(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const menteeId = new URL(request.url).searchParams.get("menteeId");
  if (!menteeId) return NextResponse.json({ error: "menteeId required" }, { status: 400 });
  const relationship = await menteeRelationship(session.admin, session.userId, menteeId);
  if (!relationship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const records = (await loadMentorRecords(session.admin, [menteeId])).get(menteeId);
  return NextResponse.json({ brief: records?.hiringBrief ?? null });
}

/** Replace the hiring brief. The mentor sees the latest one; earlier writes stay in the log. */
export async function PUT(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = putSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a short background and what the interview left open." }, { status: 400 });
  }
  const relationship = await menteeRelationship(session.admin, session.userId, parsed.data.menteeId);
  if (relationship !== "manager" && relationship !== "admin") {
    return NextResponse.json({ error: "The hiring manager writes this brief." }, { status: 403 });
  }
  try {
    const { data: mentee } = await session.admin
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("id", parsed.data.menteeId)
      .maybeSingle();
    const id = await recordMentorEvent(session.admin, {
      menteeId: parsed.data.menteeId,
      actorId: session.userId,
      tenantId: mentee?.tenant_id ?? null,
      type: MENTOR_EVENT.hiringBrief,
      title: `Hiring brief for ${mentee?.full_name ?? "a new hire"}`,
      metadata: { background: parsed.data.background, watch_for: parsed.data.watchFor },
    });
    return NextResponse.json({ id });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
