import { format } from "date-fns";
import type { ActivityLog } from "@/lib/types";

/** Start of the most recent Friday strictly before `now` (local time). */
export function lastFriday(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const back = (start.getDay() - 5 + 7) % 7 || 7;
  start.setDate(start.getDate() - back);
  return start;
}

function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others`;
}

const SENTENCES: { type: ActivityLog["eventType"]; one: string; many: string }[] = [
  { type: "simulation_completed", one: "completed a simulation", many: "completed simulations" },
  { type: "plan_step_completed", one: "finished a ramp step", many: "finished ramp steps" },
  { type: "challenge_submitted", one: "submitted a challenge", many: "submitted challenges" },
  { type: "pitch_submitted", one: "submitted a pitch", many: "submitted pitches" },
  { type: "flight_check_completed", one: "ran a flight check", many: "ran flight checks" },
  { type: "deal_prep_completed", one: "prepared for a deal", many: "prepared for deals" },
];

/**
 * Plain-language summary of team activity since last Friday for the Today "Since Friday" note,
 * plus who has gone quiet. Built only from the activity log; returns an empty list when quiet.
 */
export function buildSinceFridayNote(
  activity: ActivityLog[],
  team: { profileId: string; firstName: string }[],
  now: Date,
): string[] {
  const since = lastFriday(now).getTime();
  const firstNameById = new Map(team.map((member) => [member.profileId, member.firstName]));
  const recent = activity.filter(
    (item) => firstNameById.has(item.userId) && new Date(item.createdAt).getTime() >= since,
  );

  const sentences: string[] = [];
  for (const kind of SENTENCES) {
    const ids = [...new Set(recent.filter((item) => item.eventType === kind.type).map((item) => item.userId))];
    if (ids.length === 0) continue;
    const names = ids.map((id) => firstNameById.get(id)!);
    sentences.push(`${listNames(names)} ${ids.length === 1 ? kind.one : kind.many}.`);
    if (sentences.length === 3) break;
  }

  // Who has been quiet for a week or more (and when they were last seen).
  const lastSeen = new Map<string, number>();
  for (const item of activity) {
    const time = new Date(item.createdAt).getTime();
    if (time > (lastSeen.get(item.userId) ?? 0)) lastSeen.set(item.userId, time);
  }
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const quiet = team
    .filter((member) => {
      const seen = lastSeen.get(member.profileId);
      return seen !== undefined && seen < weekAgo;
    })
    .sort((a, b) => (lastSeen.get(a.profileId) ?? 0) - (lastSeen.get(b.profileId) ?? 0))
    .slice(0, 2);
  for (const member of quiet) {
    sentences.push(
      `${member.firstName} has not been active since ${format(lastSeen.get(member.profileId)!, "MMM d")}.`,
    );
  }

  return sentences;
}
