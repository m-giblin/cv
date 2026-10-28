import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import type { UserPlan } from "@/lib/types";

type Db = SupabaseClient<Database>;

/**
 * A ramp step the mentor has with them, or what they decided on one.
 * awaiting: submitted and waiting on the mentor. sent_back: sent back and not resubmitted yet.
 * sent_back_resolved: an earlier send-back the mentee has since acted on. endorsed: a check-in the
 * mentor endorsed for the manager's sign-off. note: feedback the mentor left outside a decision.
 */
export type MentorStepReviewStatus = "awaiting" | "approved" | "sent_back" | "sent_back_resolved" | "endorsed" | "note";

export type MentorStepReview = {
  id: string;
  assignmentStepId: string;
  title: string;
  status: MentorStepReviewStatus;
  feedback: string | null;
  date: string | null;
  /** The mentor's full name, or null when we couldn't read it. */
  reviewerName: string | null;
};

export type MentorStepReviews = {
  /** First name of the mentor, for labels like "Awaiting Alex". Null when unknown or more than one. */
  mentorFirstName: string | null;
  items: MentorStepReview[];
};

export type StepReviewEventRow = {
  id: string;
  actor_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
};

const DECISION_EVENT = "manager_feedback_received";
const SUBMIT_EVENT = "plan_step_completed";

function meta(row: StepReviewEventRow): Record<string, unknown> {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The mentee's own plans that have a mentor: the steps that go to that mentor for review. */
export function mentoredPlans(plans: UserPlan[], userId: string): UserPlan[] {
  return plans.filter((plan) => plan.userId === userId && plan.mentorId && plan.mentorId !== userId);
}

/** Steps sitting with the mentor now. Stage gates go to the hiring manager, so they're left out. */
export function stepsAwaitingMentor(plans: UserPlan[], userId: string) {
  return mentoredPlans(plans, userId).flatMap((plan) =>
    plan.steps
      .filter((step) => step.status === "submitted" && step.assignmentStepId && !step.isSegmentGate)
      .map((step) => ({ plan, step })),
  );
}

/**
 * Fold the mentee's step events into what the mentor has and what they said. Decisions and notes are
 * kept only when the mentor wrote them; a send-back is outstanding until the step is resubmitted.
 */
export function buildMentorStepReviews(params: {
  plans: UserPlan[];
  userId: string;
  events: StepReviewEventRow[];
  mentorNames: Map<string, string>;
}): MentorStepReviews {
  const plans = mentoredPlans(params.plans, params.userId);
  const mentorIds = new Set(plans.map((plan) => plan.mentorId as string));
  const steps = new Map(
    plans.flatMap((plan) =>
      plan.steps
        .filter((step) => step.assignmentStepId)
        .map((step) => [step.assignmentStepId as string, { step, mentorId: plan.mentorId as string }] as const),
    ),
  );
  const nameOf = (id: string | null) => (id ? (params.mentorNames.get(id) ?? null) : null);

  const newestFirst = [...params.events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const items: MentorStepReview[] = [];
  const latestSubmit = new Map<string, string>();
  const latestDecision = new Map<string, string>();
  const decisionNotes = new Set<string>();

  for (const row of newestFirst) {
    const data = meta(row);
    const stepId = text(data.assignment_step_id);
    const entry = steps.get(stepId);
    if (!entry) continue;
    if (row.event_type === SUBMIT_EVENT) {
      if (!latestSubmit.has(stepId)) latestSubmit.set(stepId, row.created_at);
      continue;
    }
    if (!row.actor_id || row.actor_id !== entry.mentorId) continue;

    if (row.event_type === DECISION_EVENT) {
      const validation = text(data.validation_status);
      const feedback = text(data.feedback) || null;
      let status: MentorStepReviewStatus;
      if (validation === "reviewed") status = "approved";
      else if (validation === "under_review") status = "endorsed";
      else if (validation === "rejected") {
        // Rows run newest first, so anything already seen for this step came after this send-back.
        const outstanding =
          !latestDecision.has(stepId) &&
          !latestSubmit.has(stepId) &&
          (entry.step.status === "in_progress" || entry.step.status === "not_started");
        status = outstanding ? "sent_back" : "sent_back_resolved";
      } else continue;
      if (!latestDecision.has(stepId)) latestDecision.set(stepId, row.created_at);
      if (feedback) decisionNotes.add(`${stepId}:${feedback}`);
      items.push({
        id: row.id,
        assignmentStepId: stepId,
        title: entry.step.title,
        status,
        feedback,
        date: row.created_at,
        reviewerName: nameOf(row.actor_id),
      });
    } else if (row.event_type === MENTOR_EVENT.feedback) {
      const body = text(data.body);
      if (!body) continue;
      items.push({
        id: row.id,
        assignmentStepId: stepId,
        title: entry.step.title,
        status: "note",
        feedback: body,
        date: row.created_at,
        reviewerName: nameOf(row.actor_id),
      });
    }
  }

  // A review with a note also logs the note as mentor feedback; show it once, on the decision.
  const deduped = items.filter(
    (item) => item.status !== "note" || !decisionNotes.has(`${item.assignmentStepId}:${item.feedback}`),
  );

  const awaiting: MentorStepReview[] = stepsAwaitingMentor(params.plans, params.userId).map(({ plan, step }) => ({
    id: step.assignmentStepId as string,
    assignmentStepId: step.assignmentStepId as string,
    title: step.title,
    status: "awaiting",
    feedback: null,
    date: latestSubmit.get(step.assignmentStepId as string) ?? null,
    reviewerName: nameOf(plan.mentorId),
  }));

  const names = [...mentorIds].map((id) => params.mentorNames.get(id)).filter((name): name is string => Boolean(name));
  const mentorFirstName = mentorIds.size === 1 && names[0] ? (names[0].split(" ")[0] ?? null) : null;

  return { mentorFirstName, items: [...awaiting, ...deduped] };
}

/**
 * The mentor's reviews of the signed-in mentee's ramp steps. Two reads in parallel: the mentor's name
 * (often outside the SE's visible profiles) and the mentee's step events.
 */
export async function loadMentorStepReviews(admin: Db, plans: UserPlan[], userId: string): Promise<MentorStepReviews | null> {
  const mentorIds = [...new Set(mentoredPlans(plans, userId).map((plan) => plan.mentorId as string))];
  if (mentorIds.length === 0) return null;
  const [{ data: mentors }, { data: events }] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", mentorIds),
    admin
      .from("activity_logs")
      .select("id, actor_id, event_type, metadata, created_at")
      .eq("user_id", userId)
      .in("event_type", [DECISION_EVENT, SUBMIT_EVENT, MENTOR_EVENT.feedback])
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  return buildMentorStepReviews({
    plans,
    userId,
    events: (events ?? []) as StepReviewEventRow[],
    mentorNames: new Map((mentors ?? []).map((row) => [row.id, row.full_name])),
  });
}
