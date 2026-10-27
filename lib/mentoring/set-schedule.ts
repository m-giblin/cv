import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { MentorAccessError, approversFor, recordMentorEvent, requireMentoredAssignment } from "@/lib/mentoring/mentor-records";
import { MENTOR_EVENT, formatDueDate, latestDueDate, type ScheduleDateChange } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";

type Db = SupabaseClient<Database>;

const DONE = new Set(["completed", "reviewed"]);

export type ScheduleResult = { changed: number; lastDue: string | null };

/**
 * The mentor agrees the dates with the new hire and sets them here. Nothing waits on the manager:
 * the dates change at once, the stage's target completion moves to the latest due date, and the
 * new hire and their manager are told what was set.
 */
export async function applyMentorSchedule(
  admin: Db,
  params: {
    mentorId: string;
    assignmentId: string;
    dates: { assignmentStepId: string; dueDate: string }[];
    note?: string;
    scope: "step" | "schedule";
    today?: string;
  },
): Promise<ScheduleResult> {
  const assignment = await requireMentoredAssignment(admin, params.mentorId, params.assignmentId);
  const today = params.today ?? new Date().toISOString().slice(0, 10);

  const [{ data: stepRows }, { data: planRow }, { data: people }] = await Promise.all([
    admin.from("plan_assignment_steps").select("id, plan_step_id, due_date, status").eq("assignment_id", assignment.id),
    admin.from("plan_assignments").select("plan_id").eq("id", assignment.id).maybeSingle(),
    admin.from("profiles").select("id, full_name").in("id", [assignment.user_id, params.mentorId]),
  ]);
  const steps = stepRows ?? [];
  const { data: plan } = planRow ? await admin.from("onboarding_plans").select("name").eq("id", planRow.plan_id).maybeSingle() : { data: null };
  const { data: planSteps } = steps.length
    ? await admin.from("plan_steps").select("id, title").in("id", steps.map((step) => step.plan_step_id))
    : { data: [] as { id: string; title: string }[] };
  const titleOf = new Map((planSteps ?? []).map((row) => [row.id, row.title]));

  const changes: ScheduleDateChange[] = [];
  for (const entry of params.dates) {
    const step = steps.find((row) => row.id === entry.assignmentStepId);
    if (!step) throw new MentorAccessError("One of those steps is not in this program.");
    if (step.due_date === entry.dueDate) continue;
    if (DONE.has(step.status)) throw new MentorAccessError("A finished step keeps its date.");
    if (entry.dueDate < today) throw new MentorAccessError("Pick today or a future date.");
    changes.push({ assignmentStepId: step.id, stepTitle: titleOf.get(step.plan_step_id) ?? "Plan step", from: step.due_date, to: entry.dueDate });
  }
  if (changes.length === 0) return { changed: 0, lastDue: latestDueDate(steps.map((step) => step.due_date)) };

  for (const change of changes) {
    const { error } = await admin.from("plan_assignment_steps").update({ due_date: change.to }).eq("id", change.assignmentStepId);
    if (error) throw new Error(error.message);
  }
  const updated = new Map(changes.map((change) => [change.assignmentStepId, change.to]));
  const lastDue = latestDueDate(steps.map((step) => updated.get(step.id) ?? step.due_date));
  if (lastDue) await admin.from("plan_assignments").update({ target_completion: lastDue }).eq("id", assignment.id);

  const planName = plan?.name ?? "the program";
  const nameOf = new Map((people ?? []).map((row) => [row.id, row.full_name]));
  const mentorName = nameOf.get(params.mentorId) ?? "Your mentor";
  const menteeName = nameOf.get(assignment.user_id) ?? "Your new hire";
  const note = params.note?.trim() ?? "";

  await recordMentorEvent(admin, {
    menteeId: assignment.user_id,
    actorId: params.mentorId,
    tenantId: assignment.tenant_id,
    type: MENTOR_EVENT.dateSet,
    title: params.scope === "step" ? `Mentor set the date for ${changes[0]!.stepTitle}` : `Mentor set the ${planName} schedule`,
    metadata: {
      assignment_id: assignment.id,
      plan_name: planName,
      scope: params.scope,
      note,
      last_due: lastDue,
      changes: changes.map((change) => ({
        assignment_step_id: change.assignmentStepId,
        step_title: change.stepTitle,
        from: change.from,
        to: change.to,
      })),
    },
  });

  const summary =
    params.scope === "step" || changes.length === 1
      ? `${changes[0]!.stepTitle} is now due ${formatDueDate(changes[0]!.to)}.`
      : `${changes.length} tasks have new dates. The last is due ${formatDueDate(lastDue)}.`;
  const withNote = note ? `${summary} ${note.slice(0, 200)}` : summary;

  await createNotification(admin, {
    userId: assignment.user_id,
    title: `${mentorName.split(" ")[0]} set your ${planName} schedule`,
    body: withNote,
    actionUrl: "/my-plan",
  });
  for (const managerId of await approversFor(admin, assignment, params.mentorId)) {
    await createNotification(admin, {
      userId: managerId,
      title: `${mentorName.split(" ")[0]} set ${menteeName.split(" ")[0]}'s ${planName} schedule`,
      body: withNote,
      actionUrl: `/manager?profile=${assignment.user_id}`,
    });
  }

  return { changed: changes.length, lastDue };
}
