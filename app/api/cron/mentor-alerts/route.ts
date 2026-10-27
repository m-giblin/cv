import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { MENTOR_EVENT } from "@/lib/mentoring/mentor-records-model";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminClient } from "@/lib/supabase/admin";

const REALERT_DAYS = 7;

/** Daily: tell each mentor which of their mentees' steps went overdue. One alert per step per week. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 503 });

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - REALERT_DAYS * 86_400_000).toISOString();

  const { data: assignments } = await admin
    .from("plan_assignments")
    .select("id, user_id, mentor_id, tenant_id")
    .not("mentor_id", "is", null)
    .neq("status", "completed");
  const active = (assignments ?? []).filter((row) => row.mentor_id && row.mentor_id !== row.user_id);
  if (active.length === 0) return NextResponse.json({ sent: 0 });

  const [{ data: overdueSteps }, { data: recentAlerts }] = await Promise.all([
    admin
      .from("plan_assignment_steps")
      .select("id, assignment_id, plan_step_id, due_date, status")
      .in("assignment_id", active.map((row) => row.id))
      .lt("due_date", today)
      .not("status", "in", "(reviewed,completed)"),
    admin
      .from("activity_logs")
      .select("metadata")
      .eq("event_type", MENTOR_EVENT.overdueAlert)
      .gte("created_at", since),
  ]);
  const alerted = new Set(
    (recentAlerts ?? []).map((row) => (row.metadata as Record<string, unknown> | null)?.assignment_step_id).filter(Boolean),
  );
  const fresh = (overdueSteps ?? []).filter((row) => !alerted.has(row.id));
  if (fresh.length === 0) return NextResponse.json({ sent: 0 });

  const planStepIds = [...new Set(fresh.map((row) => row.plan_step_id))];
  const menteeIds = [...new Set(active.map((row) => row.user_id))];
  const [{ data: planSteps }, { data: mentees }] = await Promise.all([
    admin.from("plan_steps").select("id, title").in("id", planStepIds),
    admin.from("profiles").select("id, full_name").in("id", menteeIds),
  ]);
  const titleOf = new Map((planSteps ?? []).map((row) => [row.id, row.title]));
  const nameOf = new Map((mentees ?? []).map((row) => [row.id, row.full_name]));

  let sent = 0;
  for (const assignment of active) {
    const steps = fresh.filter((row) => row.assignment_id === assignment.id);
    if (steps.length === 0 || !assignment.mentor_id) continue;
    const name = nameOf.get(assignment.user_id) ?? "Your mentee";
    const titles = steps.map((row) => titleOf.get(row.plan_step_id) ?? "a step");
    await createNotification(admin, {
      userId: assignment.mentor_id,
      title: `${name} is behind`,
      body: `${steps.length} step${steps.length === 1 ? "" : "s"} overdue: ${titles.slice(0, 3).join(", ")}${titles.length > 3 ? ", and more" : ""}.`,
      actionUrl: "/mentoring",
    });
    await admin.from("activity_logs").insert(
      steps.map((row) => ({
        user_id: assignment.user_id,
        actor_id: null,
        event_type: MENTOR_EVENT.overdueAlert,
        title: "Mentor alerted to an overdue step",
        metadata: { assignment_step_id: row.id, assignment_id: assignment.id, due_date: row.due_date },
        tenant_id: assignment.tenant_id,
      })),
    );
    sent += 1;
  }
  return NextResponse.json({ sent });
}
