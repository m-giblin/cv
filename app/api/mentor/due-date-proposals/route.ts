import { NextResponse } from "next/server";
import { z } from "zod";
import { rescheduleMilestoneStep } from "@/lib/manager/milestone-actions";
import { mentorErrorResponse, mentorSession } from "@/lib/mentoring/mentor-session";
import {
  MentorAccessError,
  approversFor,
  loadMentorRecords,
  recordMentorEvent,
  requireMentoredStep,
  type MentorAssignment,
  type ViewerProfile,
  viewerTenantId,
} from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT, type DateProposal } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";
import { applyMentorSchedule } from "@/lib/mentoring/set-schedule";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ADMIN_ROLES = ["director", "admin", "super_admin"];

const postSchema = z.object({
  assignmentStepId: z.string().uuid(),
  proposedDue: z.string().regex(DATE),
  reason: z.string().trim().min(10).max(2000),
});

const patchSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
});

/** Pending date proposals the signed-in manager can decide. */
export async function GET() {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const { admin, userId } = session;
  const { data: viewerRow } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const viewer = viewerRow as ViewerProfile | null;
  const viewerTenant = viewerTenantId(viewer);
  const isAdmin = ADMIN_ROLES.includes(viewer?.role ?? "");

  const [{ data: reports }, { data: assigned }] = await Promise.all([
    isAdmin && viewerTenant
      ? admin.from("profiles").select("id").eq("tenant_id", viewerTenant)
      : admin.from("profiles").select("id").eq("manager_id", userId),
    admin.from("plan_assignments").select("user_id").eq("assigned_by", userId),
  ]);
  const menteeIds = [...new Set([...(reports ?? []).map((row) => row.id), ...(assigned ?? []).map((row) => row.user_id)])];
  const records = await loadMentorRecords(admin, menteeIds);
  const { data: names } = menteeIds.length ? await admin.from("profiles").select("id, full_name").in("id", menteeIds) : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id, row.full_name]));

  const proposals: (DateProposal & { menteeName: string })[] = [];
  for (const [menteeId, record] of records) {
    for (const proposal of record.proposals) {
      if (proposal.status === "pending" && proposal.proposedById !== userId) {
        proposals.push({ ...proposal, menteeName: nameOf.get(menteeId) ?? "Team member" });
      }
    }
  }
  proposals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json({ proposals });
}

/**
 * Older clients ask to move a date. Mentors now set dates directly (see /api/mentor/schedule), so a
 * request applies at once and the mentee and manager are told; nothing waits on approval.
 */
export async function POST(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a date and give a reason of at least a sentence." }, { status: 400 });

  try {
    const { assignment } = await requireMentoredStep(session.admin, session.userId, parsed.data.assignmentStepId);
    const result = await applyMentorSchedule(session.admin, {
      mentorId: session.userId,
      assignmentId: assignment.id,
      dates: [{ assignmentStepId: parsed.data.assignmentStepId, dueDate: parsed.data.proposedDue }],
      note: parsed.data.reason,
      scope: "step",
    });
    return NextResponse.json(result);
  } catch (error) {
    return mentorErrorResponse(error);
  }
}

/** Manager approves (the date moves) or declines a proposal. */
export async function PATCH(request: Request) {
  const session = await mentorSession();
  if (session instanceof NextResponse) return session;
  const { admin, userId } = session;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { data: event } = await admin
      .from("activity_logs")
      .select("id, user_id, actor_id, metadata, event_type")
      .eq("id", parsed.data.proposalId)
      .eq("event_type", MENTOR_EVENT.dateProposal)
      .maybeSingle();
    if (!event) throw new MentorAccessError("Proposal not found.");
    const proposal = (await loadMentorRecords(admin, [event.user_id])).get(event.user_id)?.proposals.find((item) => item.id === event.id);
    if (!proposal) throw new MentorAccessError("Proposal not found.");
    if (proposal.status !== "pending") throw new MentorAccessError("This proposal was already decided.");

    const { data: assignment } = await admin
      .from("plan_assignments")
      .select("id, user_id, mentor_id, assigned_by, tenant_id")
      .eq("id", proposal.assignmentId)
      .maybeSingle();
    if (!assignment) throw new MentorAccessError("Program not found.");
    const { data: viewer } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    const approvers = await approversFor(admin, assignment as MentorAssignment, "");
    if (!approvers.includes(userId) && !ADMIN_ROLES.includes(viewer?.role ?? "")) {
      throw new MentorAccessError("Only the hiring manager can decide this.");
    }

    if (parsed.data.decision === "approved") {
      await rescheduleMilestoneStep(admin, {
        managerId: userId,
        assignmentId: proposal.assignmentId,
        assignmentStepId: proposal.assignmentStepId,
        newDueDate: proposal.proposedDue,
      });
    }
    await recordMentorEvent(admin, {
      menteeId: proposal.menteeId,
      actorId: userId,
      tenantId: assignment.tenant_id,
      type: MENTOR_EVENT.dateDecision,
      title: `Manager ${parsed.data.decision} the new date for ${proposal.stepTitle}`,
      metadata: { proposal_id: proposal.id, decision: parsed.data.decision, assignment_step_id: proposal.assignmentStepId },
    });
    if (proposal.proposedById) {
      await createNotification(admin, {
        userId: proposal.proposedById,
        title: parsed.data.decision === "approved" ? "Date change approved" : "Date change declined",
        body: `${proposal.stepTitle}: ${parsed.data.decision === "approved" ? `now due ${proposal.proposedDue}` : `stays due ${proposal.currentDue ?? "as planned"}`}.`,
        actionUrl: "/mentoring",
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return mentorErrorResponse(error);
  }
}
