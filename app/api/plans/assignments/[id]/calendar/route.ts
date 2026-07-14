import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { bizToDate } from "@/lib/plans/business-days";
import { revalidatePlanSurfaces } from "@/lib/plans/revalidate-plan-surfaces";

const stepUpdateSchema = z.object({
  assignmentStepId: z.string().uuid(),
  dueOffset: z.number().int().min(1),
});

const patchSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  steps: z.array(stepUpdateSchema).optional(),
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

  const { data: assignment, error: fetchError } = await session.supabase
    .from("plan_assignments")
    .select("id, start_date")
    .eq("id", assignmentId)
    .maybeSingle();

  if (fetchError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const startDate = parsed.data.startDate ?? assignment.start_date;

  if (parsed.data.startDate) {
    const { error } = await session.supabase
      .from("plan_assignments")
      .update({ start_date: parsed.data.startDate })
      .eq("id", assignmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (parsed.data.steps?.length) {
    for (const step of parsed.data.steps) {
      const dueDate = bizToDate(startDate, step.dueOffset);
      const { error } = await session.supabase
        .from("plan_assignment_steps")
        .update({ due_date: dueDate })
        .eq("id", step.assignmentStepId)
        .eq("assignment_id", assignmentId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  revalidatePlanSurfaces();
  return NextResponse.json({ success: true });
}
