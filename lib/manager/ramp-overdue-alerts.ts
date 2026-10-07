import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createNotification } from "@/lib/notifications/create-notification";
import { todayIso } from "@/lib/playbooks/assignments";

const REPEAT_DAYS = 7;

/**
 * Daily: tells each manager when someone on their team has overdue onboarding steps, and nudges the
 * person too. At most one of each per week while they stay behind, so it nags without flooding.
 */
export async function sendRampOverdueAlerts(): Promise<{ alerted: number; nudged: number }> {
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return { alerted: 0, nudged: 0 };

  const { data: stepRows } = await admin
    .from("plan_assignment_steps")
    .select("assignment_id, due_date")
    .in("status", ["not_started", "in_progress"])
    .lt("due_date", todayIso());
  const overdueByAssignment = new Map<string, { count: number; oldest: string }>();
  for (const row of (stepRows ?? []) as { assignment_id: string; due_date: string }[]) {
    const entry = overdueByAssignment.get(row.assignment_id) ?? { count: 0, oldest: row.due_date };
    entry.count += 1;
    if (row.due_date < entry.oldest) entry.oldest = row.due_date;
    overdueByAssignment.set(row.assignment_id, entry);
  }
  if (!overdueByAssignment.size) return { alerted: 0, nudged: 0 };

  const { data: plans } = await admin.from("plan_assignments").select("id, user_id").in("id", [...overdueByAssignment.keys()]);
  const planRows = (plans ?? []) as { id: string; user_id: string }[];
  const { data: people } = await admin
    .from("profiles")
    .select("*")
    .in(
      "id",
      planRows.map((row) => row.user_id),
    );
  // Inactive people get no nudges, and their managers get no alerts about them.
  const personById = new Map(
    ((people ?? []) as { id: string; full_name: string; manager_id: string | null; status?: string }[])
      .filter((row) => row.status !== "inactive")
      .map((row) => [row.id, row]),
  );

  const since = new Date(Date.now() - REPEAT_DAYS * 86_400_000).toISOString();
  let alerted = 0;
  let nudgedCount = 0;
  // Sends once per recipient and title per week; returns whether it sent.
  const sendWeekly = async (userId: string, title: string, body: string, actionUrl: string) => {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("title", title)
      .gte("created_at", since);
    if (count) return false;
    await createNotification(admin as unknown as SupabaseClient<Database>, { userId, title, body, actionUrl }).catch(() => undefined);
    return true;
  };

  for (const plan of planRows) {
    const person = personById.get(plan.user_id);
    const overdue = overdueByAssignment.get(plan.id);
    if (!person || !overdue) continue;
    const days = Math.round((Date.parse(todayIso()) - Date.parse(overdue.oldest)) / 86_400_000);
    const steps = `${overdue.count} onboarding step${overdue.count === 1 ? " is" : "s are"} overdue, the oldest by ${days} day${days === 1 ? "" : "s"}`;

    if (person.manager_id) {
      const sent = await sendWeekly(
        person.manager_id,
        `${person.full_name} is behind on onboarding`,
        `${steps}. Open their profile to check in.`,
        `/manager/team?profile=${person.id}`,
      );
      if (sent) alerted += 1;
    }
    // The SE gets their own nudge on the same weekly rhythm.
    const nudged = await sendWeekly(person.id, "You're behind on onboarding", `${steps}. Pick up where you left off in your plan.`, "/my-plan");
    if (nudged) nudgedCount += 1;
  }
  return { alerted, nudged: nudgedCount };
}
