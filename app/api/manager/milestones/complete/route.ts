import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { completeMilestoneStep } from "@/lib/manager/milestone-actions";
import { revalidatePlanSurfaces } from "@/lib/plans/revalidate-plan-surfaces";

const schema = z.object({
  assignmentStepId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await completeMilestoneStep(session.supabase, {
      managerId: session.user.id,
      assignmentStepId: parsed.data.assignmentStepId,
    });
    revalidatePlanSurfaces();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete milestone";
    const status = message.includes("Not authorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
