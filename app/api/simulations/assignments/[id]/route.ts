import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { canReviewUserWork } from "@/lib/auth/can-review";

const patchSchema = z.object({
  transcript: z.array(
    z.object({
      speaker: z.enum(["se", "persona", "coach"]),
      message: z.string(),
    }),
  ),
  status: z.enum(["not_started", "in_progress", "submitted", "completed"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: assignment, error: loadError } = await session.supabase
    .from("simulation_assignments")
    .select("assigned_to, assigned_by")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const isAssignee = assignment.assigned_to === session.user.id;
  const isAssigner = assignment.assigned_by === session.user.id;

  if (!isAssignee && !isAssigner && !(await canReviewUserWork(assignment.assigned_to))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await session.supabase
    .from("simulation_assignments")
    .update({
      transcript: parsed.data.transcript,
      status: parsed.data.status ?? "in_progress",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
