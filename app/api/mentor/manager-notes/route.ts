import { NextResponse } from "next/server";
import { z } from "zod";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import {
  approversFor,
  loadMentorRecords,
  menteeRelationship,
  recordMentorEvent,
  requireMentoredAssignment,
} from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT, type ManagerNote } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";

const ADMIN_ROLES = ["director", "admin", "super_admin"];

const postSchema = z.object({
  assignmentId: z.string().uuid(),
  strength: z.string().trim().min(10).max(2000),
  risk: z.string().trim().min(10).max(2000),
  action: z.string().trim().min(10).max(2000),
});

const patchSchema = z.object({ noteId: z.string().uuid() });

/** Notes mentors have sent that this manager has not marked as read. */
export async function GET() {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const { admin, userId } = session;
  const { data: viewer } = await admin.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  const isAdmin = ADMIN_ROLES.includes(viewer?.role ?? "");
  const [{ data: reports }, { data: assigned }] = await Promise.all([
    isAdmin && viewer?.tenant_id
      ? admin.from("profiles").select("id").eq("tenant_id", viewer.tenant_id)
      : admin.from("profiles").select("id").eq("manager_id", userId),
    admin.from("plan_assignments").select("user_id").eq("assigned_by", userId),
  ]);
  const menteeIds = [...new Set([...(reports ?? []).map((row) => row.id), ...(assigned ?? []).map((row) => row.user_id)])];
  const records = await loadMentorRecords(admin, menteeIds);
  const { data: names } = menteeIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", menteeIds)
    : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id, row.full_name]));

  const notes: (ManagerNote & { menteeId: string; menteeName: string })[] = [];
  for (const [menteeId, record] of records) {
    for (const note of record.managerNotes) {
      if (!note.acknowledged && note.authorId !== userId) {
        notes.push({ ...note, menteeId, menteeName: nameOf.get(menteeId) ?? "Team member" });
      }
    }
  }
  notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ notes });
}

/** Send the manager a strength, a risk, and what the mentor is doing about it. */
export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a strength, a risk, and what you are doing about it." }, { status: 400 });
  }
  try {
    const assignment = await requireMentoredAssignment(session.admin, session.userId, parsed.data.assignmentId);
    const { data: mentee } = await session.admin.from("profiles").select("full_name").eq("id", assignment.user_id).maybeSingle();
    const id = await recordMentorEvent(session.admin, {
      menteeId: assignment.user_id,
      actorId: session.userId,
      tenantId: assignment.tenant_id,
      type: MENTOR_EVENT.managerNote,
      title: `Mentor note on ${mentee?.full_name ?? "a mentee"}`,
      metadata: {
        assignment_id: assignment.id,
        strength: parsed.data.strength,
        risk: parsed.data.risk,
        action: parsed.data.action,
      },
    });
    const approvers = await approversFor(session.admin, assignment, session.userId);
    await Promise.all(
      approvers.map((userId) =>
        createNotification(session.admin, {
          userId,
          title: `Mentor note on ${mentee?.full_name ?? "your new hire"}`,
          body: parsed.data.risk.slice(0, 280),
          actionUrl: "/manager/inbox",
        }),
      ),
    );
    return NextResponse.json({ id });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}

/** The manager has read the note. It leaves the inbox and stays in the log. */
export async function PATCH(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  const { data: row } = await session.admin
    .from("activity_logs")
    .select("id, user_id, event_type")
    .eq("id", parsed.data.noteId)
    .maybeSingle();
  if (!row || row.event_type !== MENTOR_EVENT.managerNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  const relationship = await menteeRelationship(session.admin, session.userId, row.user_id);
  if (relationship !== "manager" && relationship !== "admin") {
    return NextResponse.json({ error: "The hiring manager marks this read." }, { status: 403 });
  }
  try {
    const { data: mentee } = await session.admin.from("profiles").select("tenant_id").eq("id", row.user_id).maybeSingle();
    await recordMentorEvent(session.admin, {
      menteeId: row.user_id,
      actorId: session.userId,
      tenantId: mentee?.tenant_id ?? null,
      type: MENTOR_EVENT.managerNoteAck,
      title: "Mentor note read",
      metadata: { note_id: row.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
