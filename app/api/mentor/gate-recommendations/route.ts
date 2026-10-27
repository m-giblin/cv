import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import { MentorAccessError, approversFor, loadMentorRecords, recordMentorEvent, requireMentoredStep } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";

const schema = z.object({
  assignmentStepId: z.string().uuid(),
  recommendation: z.enum(["ready", "not_yet"]),
  rationale: z.string().trim().min(10).max(4000),
});

/** The mentor's latest recommendation on a gate step, for the manager deciding it (or the mentor). */
export async function GET(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const assignmentStepId = new URL(request.url).searchParams.get("assignmentStepId");
  if (!assignmentStepId) return NextResponse.json({ error: "assignmentStepId required" }, { status: 400 });

  const { data: step } = await session.admin
    .from("plan_assignment_steps")
    .select("assignment_id")
    .eq("id", assignmentStepId)
    .maybeSingle();
  const { data: assignment } = step
    ? await session.admin
        .from("plan_assignments")
        .select("id, user_id, mentor_id, assigned_by, tenant_id")
        .eq("id", step.assignment_id)
        .maybeSingle()
    : { data: null };
  if (!assignment) return NextResponse.json({ recommendation: null });
  const { data: viewer } = await session.admin.from("profiles").select("role").eq("id", session.userId).maybeSingle();
  const approvers = await approversFor(session.admin, assignment, "");
  const allowed =
    assignment.mentor_id === session.userId ||
    approvers.includes(session.userId) ||
    ["director", "admin", "super_admin"].includes(viewer?.role ?? "");
  if (!allowed) return NextResponse.json({ recommendation: null });

  const records = (await loadMentorRecords(session.admin, [assignment.user_id])).get(assignment.user_id);
  return NextResponse.json({
    recommendation: records?.gateRecommendations.find((item) => item.assignmentStepId === assignmentStepId) ?? null,
  });
}

export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a recommendation and give a reason of at least a sentence." }, { status: 400 });

  try {
    const { assignment, planStep } = await requireMentoredStep(session.admin, session.userId, parsed.data.assignmentStepId);
    if (!parsePlanStepMetadata(planStep.metadata, planStep.sort_order).isSegmentGate) {
      throw new MentorAccessError("Recommendations are for gate steps.");
    }
    const ready = parsed.data.recommendation === "ready";
    const id = await recordMentorEvent(session.admin, {
      menteeId: assignment.user_id,
      actorId: session.userId,
      tenantId: assignment.tenant_id,
      type: MENTOR_EVENT.gateRecommendation,
      title: `Mentor recommends ${ready ? "approving" : "holding"} ${planStep.title}`,
      metadata: {
        assignment_step_id: parsed.data.assignmentStepId,
        assignment_id: assignment.id,
        recommendation: parsed.data.recommendation,
        rationale: parsed.data.rationale,
      },
    });
    const { data: mentee } = await session.admin.from("profiles").select("full_name").eq("id", assignment.user_id).maybeSingle();
    for (const approver of await approversFor(session.admin, assignment, session.userId)) {
      await createNotification(session.admin, {
        userId: approver,
        title: ready ? "Mentor says ready for the gate" : "Mentor says not ready yet",
        body: `${mentee?.full_name ?? "Your report"}, ${planStep.title}: ${parsed.data.rationale.slice(0, 220)}`,
        actionUrl: "/manager/inbox",
      });
    }
    return NextResponse.json({ id });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
