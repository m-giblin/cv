import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createNotification } from "@/lib/notifications/create-notification";

const patchSchema = z.object({
  mentorId: z.string().uuid().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetCompletion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id: assignmentId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: {
    mentor_id?: string | null;
    start_date?: string;
    target_completion?: string | null;
  } = {};
  if (parsed.data.mentorId !== undefined) updates.mentor_id = parsed.data.mentorId;
  if (parsed.data.startDate !== undefined) updates.start_date = parsed.data.startDate;
  if (parsed.data.targetCompletion !== undefined) updates.target_completion = parsed.data.targetCompletion;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: before } = await session.supabase
    .from("plan_assignments")
    .select("user_id, mentor_id, plan_id, start_date")
    .eq("id", assignmentId)
    .maybeSingle();

  const { error } = await session.supabase
    .from("plan_assignments")
    .update(updates)
    .eq("id", assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (before && updates.mentor_id !== undefined && updates.mentor_id !== before.mentor_id) {
    await notifyMentorChange(session.supabase, session.user.id, before, updates.mentor_id);
  }

  return NextResponse.json({ success: true });
}

/**
 * A changed mentor is told they're mentoring (with the same next steps as at assignment), the new
 * hire is told who their mentor is, and a replaced mentor is told they're off it.
 */
async function notifyMentorChange(
  supabase: Parameters<typeof createNotification>[0],
  managerId: string,
  before: { user_id: string; mentor_id: string | null; plan_id: string; start_date: string | null },
  mentorId: string | null,
) {
  const ids = [before.user_id, managerId, mentorId, before.mentor_id].filter((id): id is string => Boolean(id));
  const [{ data: people }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase.from("onboarding_plans").select("name").eq("id", before.plan_id).maybeSingle(),
  ]);
  const nameOf = (id: string | null) => (people ?? []).find((row) => row.id === id)?.full_name ?? "";
  const se = nameOf(before.user_id) || "your new hire";
  const seFirst = se.split(" ")[0];
  const managerFirst = nameOf(managerId).split(" ")[0] || "Your manager";
  const planName = plan?.name ?? "their onboarding plan";
  const sends: Promise<unknown>[] = [];
  if (mentorId) {
    const mentorFirst = nameOf(mentorId).split(" ")[0] || "Your mentor";
    sends.push(
      createNotification(supabase, {
        userId: mentorId,
        title: `You're mentoring ${se}`,
        body: `${managerFirst} made you ${seFirst}'s mentor for ${planName}. Read the hiring brief, meet ${seFirst}, then set the schedule together.`,
        actionUrl: "/mentoring",
      }),
      createNotification(supabase, {
        userId: before.user_id,
        title: `${nameOf(mentorId) || "A mentor"} is your mentor`,
        body: `${mentorFirst} will set up a 1:1 with you, where you agree your due dates together.`,
        actionUrl: "/dashboard",
      }),
    );
  } else {
    sends.push(
      createNotification(supabase, {
        userId: before.user_id,
        title: "Your mentor has changed",
        body: `${managerFirst} will pick a new mentor for you. Until then, ${managerFirst} reviews your steps.`,
        actionUrl: "/dashboard",
      }),
    );
  }
  if (before.mentor_id && before.mentor_id !== mentorId) {
    sends.push(
      createNotification(supabase, {
        userId: before.mentor_id,
        title: `You're no longer mentoring ${se}`,
        body: `${managerFirst} changed ${seFirst}'s mentor. Thanks for the time you put in.`,
        actionUrl: "/mentoring",
      }),
    );
  }
  await Promise.all(sends.map((send) => send.catch(() => undefined)));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id: assignmentId } = await context.params;

  const { data: assignment, error: fetchError } = await session.supabase
    .from("plan_assignments")
    .select("id, user_id, progress_percent, status, tenant_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (fetchError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  if (assignment.progress_percent > 0 || assignment.status === "completed") {
    return NextResponse.json(
      { error: "Only unstarted assignments can be removed." },
      { status: 400 },
    );
  }

  const admin = getTenantAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  let stepsDelete = admin.from("plan_assignment_steps").delete().eq("assignment_id", assignmentId);
  let assignmentDelete = admin.from("plan_assignments").delete().eq("id", assignmentId);

  if (assignment.tenant_id) {
    stepsDelete = stepsDelete.eq("tenant_id", assignment.tenant_id);
    assignmentDelete = assignmentDelete.eq("tenant_id", assignment.tenant_id);
  }

  const { error: stepsError } = await stepsDelete;
  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  const { data: deleted, error: deleteError } = await assignmentDelete.select("id").maybeSingle();

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!deleted) {
    return NextResponse.json(
      { error: "Assignment could not be removed. Refresh and try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, id: deleted.id });
}
