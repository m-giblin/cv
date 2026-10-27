import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Db = SupabaseClient<Database>;

/** activity_logs event for a 1:1 the manager put in the calendar. The row's user_id is the person met. */
export const ONE_ON_ONE_EVENT = "one_on_one_scheduled";

export type UpcomingOneOnOne = {
  id: string;
  /** ISO start time. */
  start: string;
  minutes: number;
  /** Start as the scheduler saw it, with their time zone, e.g. "Thu, Oct 29, 10:00 AM EDT". */
  label: string;
  scheduledById: string | null;
  scheduledByName: string;
  mentorInvited: boolean;
  mentorId: string | null;
};

type OneOnOneMetadata = {
  start?: string;
  minutes?: number;
  label?: string;
  mentor_invited?: boolean;
  mentor_id?: string;
  scheduled_by_name?: string;
};

/** 1:1s for this person that haven't finished yet, soonest first. */
export async function loadUpcomingOneOnOnes(admin: Db, userId: string, now = new Date()): Promise<UpcomingOneOnOne[]> {
  const { data } = await admin
    .from("activity_logs")
    .select("id, actor_id, metadata, created_at")
    .eq("user_id", userId)
    .eq("event_type", ONE_ON_ONE_EVENT)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? [])
    .map((row) => {
      const meta = (row.metadata ?? {}) as OneOnOneMetadata;
      if (!meta.start) return null;
      return {
        id: row.id,
        start: meta.start,
        minutes: meta.minutes ?? 30,
        label: meta.label ?? meta.start,
        scheduledById: row.actor_id,
        scheduledByName: meta.scheduled_by_name ?? "Your manager",
        mentorInvited: Boolean(meta.mentor_invited),
        mentorId: meta.mentor_id ?? null,
      };
    })
    .filter((item): item is UpcomingOneOnOne => {
      if (!item) return false;
      const end = new Date(item.start).getTime() + item.minutes * 60_000;
      return end > now.getTime();
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** The next 1:1 this mentor was invited to with each mentee, keyed by mentee id. */
export async function loadMentorInvites(admin: Db, mentorId: string, menteeIds: string[], now = new Date()) {
  const entries = await Promise.all(
    menteeIds.map(async (id) => {
      const upcoming = await loadUpcomingOneOnOnes(admin, id, now).catch(() => []);
      const invite = upcoming.find((item) => item.mentorInvited && item.mentorId === mentorId);
      return [id, invite ?? null] as const;
    }),
  );
  return new Map(entries.filter((entry): entry is readonly [string, UpcomingOneOnOne] => entry[1] !== null));
}
