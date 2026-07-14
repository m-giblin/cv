import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { rescheduleMilestoneStep } from "@/lib/manager/milestone-actions";
import { revalidatePlanSurfaces } from "@/lib/plans/revalidate-plan-surfaces";

const schema = z
  .object({
    assignmentId: z.string().uuid(),
    assignmentStepId: z.string().uuid(),
    shiftDays: z.number().int().min(1).max(90).optional(),
    newDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
  })
  .refine((value) => !(value.shiftDays && value.newDueDate), {
    message: "Pass shiftDays or newDueDate, not both.",
  });

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await rescheduleMilestoneStep(session.supabase, {
      managerId: session.user.id,
      assignmentId: parsed.data.assignmentId,
      assignmentStepId: parsed.data.assignmentStepId,
      shiftDays: parsed.data.shiftDays,
      newDueDate: parsed.data.newDueDate,
    });
    revalidatePlanSurfaces();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reschedule" },
      { status: 400 },
    );
  }
}
