import type { SupabaseClient } from "@supabase/supabase-js";
import { nextClockAction, type ClockAction } from "@/lib/challenges/attempt-clock";
import type { Database } from "@/lib/database.types";
import { createNotification } from "@/lib/notifications/create-notification";

type Admin = SupabaseClient<Database>;

const CHALLENGE_URL = "/challenges";

/** Stops the clock when work is turned in. Does nothing if the person never pressed Start. */
export async function markAttemptSubmitted(
  admin: Admin,
  params: { userId: string; challengeId: string; submissionId: string },
) {
  await admin
    .from("challenge_attempts")
    .update({ status: "submitted", submission_id: params.submissionId, updated_at: new Date().toISOString() })
    .eq("user_id", params.userId)
    .eq("challenge_id", params.challengeId)
    .eq("status", "active");
}

/** Applies the manager's decision: approval closes the attempt, a send-back gets a new clock. */
export async function applyAttemptReview(admin: Admin, params: { submissionId: string; approved: boolean }) {
  const now = new Date().toISOString();
  await admin
    .from("challenge_attempts")
    .update(
      params.approved
        ? { status: "approved", updated_at: now }
        : { status: "active", clock_started_at: now, reminder_sent_at: null, warning_sent_at: null, updated_at: now },
    )
    .eq("submission_id", params.submissionId)
    .eq("status", "submitted");
}

function participantMessage(action: ClockAction, title: string) {
  if (action === "remind") {
    return { title: "Still working on your challenge?", body: `${title} is still open. You have 3 working days left.` };
  }
  if (action === "warn") {
    return { title: "Your challenge expires in 2 working days", body: `Turn in ${title} within 2 working days to keep it open.` };
  }
  return {
    title: "Challenge canceled: requirements not met",
    body: `${title} wasn't turned in within 5 working days. Your manager has been told so you can talk about it.`,
  };
}

/** Daily: send each reminder that's due and cancel anything past the limit. */
export async function processChallengeClocks(admin: Admin, now = new Date()) {
  const result = { reminded: 0, warned: 0, canceled: 0 };
  const { data: attempts } = await admin
    .from("challenge_attempts")
    .select("id, user_id, challenge_id, tenant_id, clock_started_at, reminder_sent_at, warning_sent_at")
    .eq("status", "active");

  const due = (attempts ?? []).flatMap((attempt) => {
    const action = nextClockAction(attempt, now);
    return action ? [{ attempt, action }] : [];
  });
  if (due.length === 0) return result;

  const [{ data: challenges }, { data: profiles }] = await Promise.all([
    admin.from("challenges").select("id, title").in("id", due.map((row) => row.attempt.challenge_id)),
    admin.from("profiles").select("id, manager_id, full_name").in("id", due.map((row) => row.attempt.user_id)),
  ]);
  const titles = new Map((challenges ?? []).map((row) => [row.id, row.title]));
  const people = new Map((profiles ?? []).map((row) => [row.id, row]));

  for (const { attempt, action } of due) {
    const stamp = now.toISOString();
    const change =
      action === "cancel"
        ? { status: "canceled", canceled_at: stamp, updated_at: stamp }
        : action === "warn"
          ? { warning_sent_at: stamp, updated_at: stamp }
          : { reminder_sent_at: stamp, updated_at: stamp };

    // Only the run that changes the row sends the notice, so a repeat run can't send it twice.
    const { data: claimed } = await admin
      .from("challenge_attempts")
      .update(change)
      .eq("id", attempt.id)
      .eq("status", "active")
      .select("id");
    if (!claimed?.length) continue;

    const title = titles.get(attempt.challenge_id) ?? "Your challenge";
    await createNotification(admin, {
      userId: attempt.user_id,
      ...participantMessage(action, title),
      actionUrl: CHALLENGE_URL,
    });

    if (action === "cancel") {
      const person = people.get(attempt.user_id);
      if (person?.manager_id) {
        await createNotification(admin, {
          userId: person.manager_id,
          title: "A challenge needs a conversation",
          body: `${person.full_name ?? "Someone on your team"} didn't turn in ${title} within 5 working days, so it was canceled.`,
          actionUrl: "/manager",
        });
      }
      await admin.from("activity_logs").insert({
        user_id: attempt.user_id,
        actor_id: attempt.user_id,
        event_type: "challenge_canceled",
        title: "Challenge canceled: requirements not met",
        tenant_id: attempt.tenant_id,
        metadata: { attemptId: attempt.id, challengeId: attempt.challenge_id },
      });
      result.canceled += 1;
    } else if (action === "warn") {
      result.warned += 1;
    } else {
      result.reminded += 1;
    }
  }

  return result;
}
