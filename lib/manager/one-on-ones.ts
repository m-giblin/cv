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

export type BookedOneOnOne = { userId: string; actorId: string | null; start: string; minutes: number; label: string; mentorId: string | null };

/** The first booked 1:1 that overlaps [start, start + minutes), or null. Pure, so it is unit tested. */
export function firstOverlap(booked: BookedOneOnOne[], start: string, minutes: number): BookedOneOnOne | null {
  const from = new Date(start).getTime();
  const to = from + minutes * 60_000;
  return (
    booked.find((item) => {
      const itemFrom = new Date(item.start).getTime();
      return itemFrom < to && itemFrom + item.minutes * 60_000 > from;
    }) ?? null
  );
}

/**
 * 1:1s with other people that the scheduler or the invited mentor are already in at that time.
 * Returns a sentence for the scheduler, or null when the time is free.
 */
export async function oneOnOneClash(
  admin: Db,
  params: { schedulerId: string; mentorId: string | null; mentorName: string | null; userId: string; start: string; minutes: number },
): Promise<string | null> {
  const people = [params.schedulerId, params.mentorId].filter((id): id is string => Boolean(id));
  const filters = people.flatMap((id) => [`actor_id.eq.${id}`, `metadata->>mentor_id.eq.${id}`]).join(",");
  // 1:1s are booked days or weeks ahead; anything booked in the last 90 days may still be upcoming.
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await admin
    .from("activity_logs")
    .select("user_id, actor_id, metadata")
    .eq("event_type", ONE_ON_ONE_EVENT)
    .neq("user_id", params.userId)
    .gte("created_at", since)
    .or(filters);
  const booked: BookedOneOnOne[] = (data ?? []).flatMap((row) => {
    const meta = (row.metadata ?? {}) as OneOnOneMetadata;
    return meta.start
      ? [{ userId: row.user_id, actorId: row.actor_id, start: meta.start, minutes: meta.minutes ?? 30, label: meta.label ?? meta.start, mentorId: meta.mentor_id ?? null }]
      : [];
  });
  const clash = firstOverlap(booked, params.start, params.minutes);
  if (!clash) return null;
  const { data: other } = await admin.from("profiles").select("full_name").eq("id", clash.userId).maybeSingle();
  const whose = `${other?.full_name ?? "someone else"}'s 1:1 (${clash.label})`;
  const youAreIn = clash.actorId === params.schedulerId || clash.mentorId === params.schedulerId;
  return youAreIn ? `You already have ${whose} at that time.` : `${params.mentorName ?? "The mentor"} is already in ${whose} at that time.`;
}
