import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import type { Profile } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type MyMentor = {
  profile: Profile;
  /** When the mentor last set the schedule for the current stage, if they have. */
  scheduleSetAt: string | null;
  lastCheckinAt: string | null;
};

/**
 * The new hire's mentor. An SE can't list colleagues outside their manager line, so the mentor's
 * profile is read with the service client, scoped to the mentor on their own assignment.
 */
export async function loadMyMentor(
  admin: Db,
  menteeId: string,
  mentorId: string,
  assignmentId: string,
): Promise<MyMentor | null> {
  const [{ data: row }, { data: events }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("id", mentorId)
      .maybeSingle(),
    admin
      .from("activity_logs")
      .select("event_type, created_at, metadata")
      .eq("user_id", menteeId)
      .eq("actor_id", mentorId)
      .in("event_type", [MENTOR_EVENT.dateSet, MENTOR_EVENT.checkin])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!row) return null;
  const latest = (type: string) => (events ?? []).find((event) => event.event_type === type)?.created_at ?? null;
  // Each stage gets its own dates, so a schedule set for an earlier stage doesn't count.
  const scheduleSetAt =
    (events ?? []).find(
      (event) =>
        event.event_type === MENTOR_EVENT.dateSet &&
        (event.metadata as { assignment_id?: string } | null)?.assignment_id === assignmentId,
    )?.created_at ?? null;
  return {
    profile: mapProfile(row),
    scheduleSetAt,
    lastCheckinAt: latest(MENTOR_EVENT.checkin),
  };
}
