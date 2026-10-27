import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createNotification } from "@/lib/notifications/create-notification";

type Db = SupabaseClient<Database>;

export type ActiveMentor = {
  /** The mentee's active plan assignment; /mentoring?open=<id> opens their workbench for the mentor. */
  assignmentId: string;
  mentorId: string;
  mentorName: string;
};

/**
 * The mentor on the SE's active onboarding plan, if they have one. Read with the service client: an SE
 * can't list profiles outside their manager line, and this is scoped to their own assignment.
 */
export async function findActiveMentor(admin: Db, menteeId: string): Promise<ActiveMentor | null> {
  const { data: assignment } = await admin
    .from("plan_assignments")
    .select("id, mentor_id")
    .eq("user_id", menteeId)
    .neq("status", "completed")
    .not("mentor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment?.mentor_id || assignment.mentor_id === menteeId) return null;
  const { data: mentor } = await admin.from("profiles").select("full_name").eq("id", assignment.mentor_id).maybeSingle();
  return {
    assignmentId: assignment.id,
    mentorId: assignment.mentor_id,
    mentorName: mentor?.full_name ?? "Your mentor",
  };
}

/** Notification copy for a shared practice result. Pure, so it is unit tested. */
export function sharedPracticeNotice(input: {
  menteeName: string;
  kind: string;
  title: string;
  score: number | null;
  snippet?: string;
}): { title: string; body: string } {
  const first = input.menteeName.trim().split(/\s+/)[0] || "Your mentee";
  const scored = input.score !== null ? `, AI score ${input.score}` : "";
  const quote = input.snippet?.trim() ? ` "${input.snippet.trim()}"` : "";
  return {
    title: `${first} shared a ${input.kind} with you`,
    body: `${input.title}${scored}.${quote}`.slice(0, 480),
  };
}

/**
 * Send the SE's mentor a practice result (a free-practice pitch today; simulations can call this too).
 * The mentee's session can't write to the mentor's notifications, so this takes the service client.
 * Returns the mentor it went to, or null when the SE has no mentor on an active plan.
 */
export async function shareWithMentor(
  admin: Db,
  params: {
    menteeId: string;
    /** What was shared, as the mentor reads it: "pitch", "simulation". */
    kind: string;
    title: string;
    score: number | null;
    snippet?: string;
    /** Where the mentor opens it. Defaults to the mentee's workbench on Mentoring. */
    actionUrl?: string;
    /** Extra fields kept on the activity row, e.g. the practice session id. */
    metadata?: Record<string, string | number | boolean | null>;
    eventType?: string;
  },
): Promise<ActiveMentor | null> {
  const mentor = await findActiveMentor(admin, params.menteeId);
  if (!mentor) return null;
  const { data: mentee } = await admin.from("profiles").select("full_name, tenant_id").eq("id", params.menteeId).maybeSingle();
  const notice = sharedPracticeNotice({
    menteeName: mentee?.full_name ?? "",
    kind: params.kind,
    title: params.title,
    score: params.score,
    snippet: params.snippet,
  });
  await createNotification(admin, {
    userId: mentor.mentorId,
    title: notice.title,
    body: notice.body,
    actionUrl: params.actionUrl ?? `/mentoring?open=${mentor.assignmentId}`,
  });
  await admin.from("activity_logs").insert({
    user_id: params.menteeId,
    event_type: params.eventType ?? "practice_shared_with_mentor",
    title: `Shared with mentor: ${params.title}`,
    tenant_id: mentee?.tenant_id ?? null,
    metadata: { ...params.metadata, kind: params.kind, mentorId: mentor.mentorId, score: params.score },
  });
  return mentor;
}
