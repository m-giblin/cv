import { NextResponse } from "next/server";
import { z } from "zod";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { loadMentorRecords, type ViewerProfile, viewerTenantId } from "@/lib/mentoring/mentor-records";
import type { ScheduleChange } from "@/lib/mentoring/mentor-records-model";
import { applyMentorSchedule } from "@/lib/mentoring/set-schedule";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ADMIN_ROLES = ["director", "admin", "super_admin"];

const postSchema = z.object({
  assignmentId: z.string().uuid(),
  scope: z.enum(["step", "schedule"]).default("schedule"),
  note: z.string().trim().max(2000).optional(),
  dates: z
    .array(z.object({ assignmentStepId: z.string().uuid(), dueDate: z.string().regex(DATE) }))
    .min(1)
    .max(200),
});

/** The mentor sets due dates (one step, or the whole stage). They apply at once; no approval. */
export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a date for each task." }, { status: 400 });

  try {
    const result = await applyMentorSchedule(session.admin, {
      mentorId: session.userId,
      assignmentId: parsed.data.assignmentId,
      dates: parsed.data.dates,
      note: parsed.data.note,
      scope: parsed.data.scope,
    });
    return NextResponse.json(result);
  } catch (error) {
    return mentorErrorResponse(error);
  }
}

/** Recent due dates mentors set for the signed-in manager's people. Information only. */
export async function GET() {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const { admin, userId } = session;
  const { data: viewerRow } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const viewer = viewerRow as ViewerProfile | null;
  const viewerTenant = viewerTenantId(viewer);
  const isAdmin = ADMIN_ROLES.includes(viewer?.role ?? "");

  const [{ data: reports }, { data: assigned }] = await Promise.all([
    isAdmin && viewerTenant
      ? admin.from("profiles").select("id").eq("tenant_id", viewerTenant)
      : admin.from("profiles").select("id").eq("manager_id", userId),
    admin.from("plan_assignments").select("user_id").eq("assigned_by", userId),
  ]);
  const menteeIds = [...new Set([...(reports ?? []).map((row) => row.id), ...(assigned ?? []).map((row) => row.user_id)])];
  const records = await loadMentorRecords(admin, menteeIds);
  const { data: names } = menteeIds.length ? await admin.from("profiles").select("id, full_name").in("id", menteeIds) : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id, row.full_name]));

  const changes: (ScheduleChange & { menteeName: string })[] = [];
  for (const [menteeId, record] of records) {
    for (const change of record.scheduleChanges) {
      if (change.setById !== userId) changes.push({ ...change, menteeName: nameOf.get(menteeId) ?? "Team member" });
    }
  }
  changes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ changes: changes.slice(0, 20) });
}
