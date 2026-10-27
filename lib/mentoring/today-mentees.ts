import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";

type Db = SupabaseClient<Database>;

export type TodayMentee = {
  menteeId: string;
  name: string;
  planName: string;
  startDate: string | null;
  /** True once the mentor has set the dates with them. Until then the next move is the first meeting. */
  scheduleSet: boolean;
  targetCompletion: string | null;
  /** Steps they've submitted that are waiting on a review. */
  waitingOnReview: number;
};

/** People the signed-in SE mentors, for the Today page: one row per active program, newest first. */
export async function loadTodayMentees(admin: Db, mentorId: string): Promise<TodayMentee[]> {
  const { data: rows } = await admin
    .from("plan_assignments")
    .select("id, user_id, plan_id, start_date, target_completion")
    .eq("mentor_id", mentorId)
    .neq("status", "completed")
    .order("start_date", { ascending: false });
  const assignments = rows ?? [];
  if (!assignments.length) return [];

  const menteeIds = [...new Set(assignments.map((row) => row.user_id))];
  const [{ data: people }, { data: plans }, { data: events }, { data: submitted }] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", menteeIds),
    admin.from("onboarding_plans").select("id, name").in("id", [...new Set(assignments.map((row) => row.plan_id))]),
    admin
      .from("activity_logs")
      .select("metadata")
      .eq("actor_id", mentorId)
      .eq("event_type", MENTOR_EVENT.dateSet)
      .in("user_id", menteeIds),
    admin
      .from("plan_assignment_steps")
      .select("assignment_id")
      .in("assignment_id", assignments.map((row) => row.id))
      .eq("status", "submitted"),
  ]);
  const nameOf = new Map((people ?? []).map((row) => [row.id, row.full_name]));
  const planOf = new Map((plans ?? []).map((row) => [row.id, row.name]));
  const scheduled = new Set(
    (events ?? []).map((row) => (row.metadata as { assignment_id?: string } | null)?.assignment_id).filter(Boolean),
  );

  const waiting = new Map<string, number>();
  for (const row of submitted ?? []) waiting.set(row.assignment_id, (waiting.get(row.assignment_id) ?? 0) + 1);

  return assignments.map((row) => ({
    menteeId: row.user_id,
    name: nameOf.get(row.user_id) ?? "Your mentee",
    planName: planOf.get(row.plan_id) ?? "Onboarding program",
    startDate: row.start_date,
    scheduleSet: scheduled.has(row.id),
    targetCompletion: row.target_completion,
    waitingOnReview: waiting.get(row.id) ?? 0,
  }));
}
