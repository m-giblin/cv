import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

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

  const { error } = await session.supabase
    .from("plan_assignments")
    .update(updates)
    .eq("id", assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
