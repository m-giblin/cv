import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { completeMilestoneStep } from "@/lib/manager/milestone-actions";
import { revalidatePlanSurfaces } from "@/lib/plans/revalidate-plan-surfaces";

const patchSchema = z.object({
  status: z.literal("approved"),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ gateId: string }> },
) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { gateId: assignmentStepId } = await context.params;

  try {
    const result = await completeMilestoneStep(session.supabase, {
      managerId: session.user.id,
      assignmentStepId,
    });
    revalidatePlanSurfaces();
    return NextResponse.json({ ...result, status: "approved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve gate";
    const status = message.includes("Not authorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
