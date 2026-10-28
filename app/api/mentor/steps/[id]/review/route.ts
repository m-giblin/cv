import { NextResponse } from "next/server";
import { z } from "zod";
import { recordMentorEvent } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { createNotification } from "@/lib/notifications/create-notification";
import { approveAssignmentStep, rejectAssignmentStep } from "@/lib/plans/complete-step";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { canMentorApproveStep } from "@/lib/plans/review-policy";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  feedback: z.string().trim().max(2000).optional(),
});

/** The assigned mentor approves or sends back an everyday step. Gates and check-ins use their own flows. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose approve or send back." }, { status: 400 });
  const feedback = parsed.data.feedback || undefined;
  if (parsed.data.decision === "reject" && (!feedback || feedback.length < 3)) {
    return NextResponse.json({ error: "Say what to change so they know what to redo." }, { status: 400 });
  }

  const { admin, userId } = session;
  const { data: step } = await admin
    .from("plan_assignment_steps")
    .select("id, status, plan_step_id, assignment_id")
    .eq("id", id)
    .maybeSingle();
  if (!step) return NextResponse.json({ error: "Step not found." }, { status: 404 });
  const [{ data: assignment }, { data: planStep }, { data: mentor }] = await Promise.all([
    admin.from("plan_assignments").select("user_id, mentor_id, tenant_id").eq("id", step.assignment_id).maybeSingle(),
    admin.from("plan_steps").select("title, step_type, metadata, sort_order").eq("id", step.plan_step_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const isSegmentGate = planStep ? parsePlanStepMetadata(planStep.metadata, planStep.sort_order).isSegmentGate : false;
  if (
    !assignment ||
    !planStep ||
    !canMentorApproveStep({ reviewerId: userId, mentorId: assignment.mentor_id, stepType: planStep.step_type, isSegmentGate })
  ) {
    return NextResponse.json({ error: "Only their mentor reviews this step." }, { status: 403 });
  }
  if (step.status !== "submitted") {
    return NextResponse.json({ error: "This step isn't waiting on a review." }, { status: 409 });
  }

  try {
    // The service client writes the step; the checks above make sure the caller is this step's mentor.
    if (parsed.data.decision === "approve") {
      await approveAssignmentStep(admin, { assignmentStepId: id, reviewerId: userId, feedback });
    } else {
      await rejectAssignmentStep(admin, { assignmentStepId: id, reviewerId: userId, feedback: feedback! });
    }
    // The note shows on the step for both of them, alongside any other feedback on it.
    if (feedback) {
      await recordMentorEvent(admin, {
        menteeId: assignment.user_id,
        actorId: userId,
        tenantId: assignment.tenant_id,
        type: MENTOR_EVENT.feedback,
        title: `Mentor feedback on ${planStep.title}`,
        metadata: { assignment_step_id: id, assignment_id: step.assignment_id, body: feedback },
      });
    }
    const first = mentor?.full_name.split(" ")[0] ?? "Your mentor";
    await createNotification(admin, {
      userId: assignment.user_id,
      title:
        parsed.data.decision === "approve" ? `${first} approved ${planStep.title}` : `${first} sent back ${planStep.title}`,
      body: feedback ?? (parsed.data.decision === "approve" ? "On to the next step." : "Open the step to see what to change."),
      // With a note, open the step so they can read it in context; a bare approval goes to what's next.
      actionUrl: parsed.data.decision === "approve" && !feedback ? "/dashboard" : `/my-plan?step=${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
