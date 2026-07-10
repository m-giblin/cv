import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import { processReviewSignoff } from "@/lib/coaching/process-review-signoff";
import { resolvePlanStepSignoffContext } from "@/lib/coaching/plan-step-signoff-context";
import { approveAssignmentStep, rejectAssignmentStep } from "@/lib/plans/complete-step";
import { parseAdHocStepId, reviewAdHocStep } from "@/lib/plans/ad-hoc-steps";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  feedback: z.string().min(3).optional(),
  coachingSignoff: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stepContext = await resolvePlanStepSignoffContext(session.supabase, id);
  if (!stepContext) {
    return NextResponse.json({ error: "Step not found." }, { status: 404 });
  }

  const signoffResult = await processReviewSignoff(session.supabase, body, {
    managerId: session.user.id,
    seUserId: stepContext.seUserId,
    tenantId: session.tenantId,
    reviewType: "plan_step",
    reviewTargetId: id,
    decision: parsed.data.decision,
    isManagerGate: stepContext.isManagerGate,
  });
  if (signoffResult instanceof NextResponse) return signoffResult;

  const feedback = signoffResult.feedback;

  try {
    const adHocId = parseAdHocStepId(id);
    if (adHocId) {
      const result = await reviewAdHocStep(session.supabase, {
        adHocStepId: adHocId,
        reviewerId: session.user.id,
        decision: parsed.data.decision,
        feedback,
      });
      await createNotification(session.supabase, {
        userId: result.userId,
        title: parsed.data.decision === "approve" ? "Manager signed off on your task" : "Task needs revision",
        body: feedback,
        actionUrl: "/my-plan",
      });
      return NextResponse.json({ success: true });
    }

    const result =
      parsed.data.decision === "approve"
        ? await approveAssignmentStep(session.supabase, {
            assignmentStepId: id,
            reviewerId: session.user.id,
            feedback,
          })
        : await rejectAssignmentStep(session.supabase, {
            assignmentStepId: id,
            reviewerId: session.user.id,
            feedback,
          });

    await createNotification(session.supabase, {
      userId: result.userId,
      title:
        parsed.data.decision === "approve"
          ? "Plan step approved"
          : "Plan step needs revision",
      body: feedback,
      actionUrl: parsed.data.decision === "approve" ? "/dashboard" : `/plan-steps/${id}`,
    });

    auditMutation(session.user.id, "plan.step_reviewed", "plan_assignment_step", id, {
      decision: parsed.data.decision,
      userId: result.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    const status = message.includes("Not authorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
