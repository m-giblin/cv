import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import { createNotification } from "@/lib/notifications/create-notification";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { todayIso } from "@/lib/playbooks/assignments";
import { isDraftSimulationPrompt } from "@/lib/admin/practice-library";
import { loadBank } from "@/lib/question-bank/data";

/**
 * Backs the Assign work wizard. GET lists what can be assigned and to whom. POST assigns pitches
 * and ramp tasks; playbooks and simulations go through their own assignment routes.
 */

export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const [people, playbooks, simulations, pitches, plans] = await Promise.all([
    loadAssignablePeople(session.tenantId, session.user.id, session.role),
    admin
      .from("capability_playbooks")
      .select("id, title, chapter, slug")
      .eq("tenant_id", session.tenantId)
      .eq("status", "published")
      .order("chapter"),
    session.supabase
      .from("simulation_templates")
      .select("id, name, persona, vertical, solution_focus, difficulty, prompt_body")
      .order("name"),
    admin
      .from("pitch_scenario_templates")
      .select("id, label, track, max_duration_sec")
      .eq("tenant_id", session.tenantId)
      .eq("active", true)
      .order("sort_order"),
    admin.from("plan_assignments").select("user_id").eq("tenant_id", session.tenantId),
  ]);

  // Knowledge checks: every question-bank source with enough approved questions to run a check.
  const bank = await loadBank(session.tenantId);
  const checks = (bank?.sources ?? [])
    .filter((source) => source.active >= 3)
    .map((source) => ({ key: source.key, title: source.title, solution: source.solution, questions: source.active, kind: source.kind }));

  const withPlan = new Set(((plans.data ?? []) as { user_id: string }[]).map((row) => row.user_id));
  return NextResponse.json({
    people: people.map((person) => ({ ...person, hasRampPlan: withPlan.has(person.id) })),
    playbooks: playbooks.data ?? [],
    simulations: ((simulations.data ?? []) as { prompt_body?: string }[]).flatMap((row) => {
      if (isDraftSimulationPrompt(row.prompt_body ?? "")) return [];
      const { prompt_body: _promptBody, ...rest } = row;
      return [rest];
    }),
    pitches: pitches.data ?? [],
    checks,
  });
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pitch"),
    assigneeIds: z.array(z.string().uuid()).min(1).max(200),
    dueDate: dateSchema,
    scenarioIds: z.array(z.string().uuid()).min(1).max(20),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    kind: z.literal("quiz"),
    assigneeIds: z.array(z.string().uuid()).min(1).max(200),
    dueDate: dateSchema,
    sourceKeys: z.array(z.string().min(3).max(200)).min(1).max(20),
    passScore: z.number().int().min(1).max(100).default(80),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    kind: z.literal("ramp_task"),
    assigneeIds: z.array(z.string().uuid()).min(1).max(200),
    dueDate: dateSchema,
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
  }),
]);

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const input = parsed.data;
  if (input.dueDate < todayIso()) return NextResponse.json({ error: "Pick a due date from today onward." }, { status: 400 });

  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  const allowed = new Set(people.map((person) => person.id));
  if (input.assigneeIds.some((id) => !allowed.has(id))) {
    return NextResponse.json({ error: "You can only assign to people on your team." }, { status: 403 });
  }
  const notify = (userId: string, title: string, body: string, actionUrl: string) =>
    createNotification(admin as unknown as SupabaseClient<Database>, { userId, title, body, actionUrl }).catch(() => undefined);
  const due = new Date(`${input.dueDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  if (input.kind === "pitch") {
    const { data: scenarioRows } = await admin
      .from("pitch_scenario_templates")
      .select("id, label")
      .eq("tenant_id", session.tenantId)
      .in("id", input.scenarioIds);
    const scenarios = (scenarioRows ?? []) as { id: string; label: string }[];
    if (scenarios.length !== new Set(input.scenarioIds).size) {
      return NextResponse.json({ error: "Pick pitch scenarios from your workspace." }, { status: 400 });
    }
    const { data: openRows } = await admin
      .from("pitch_assignments")
      .select("id, scenario_id, assigned_to")
      .eq("status", "active")
      .in("scenario_id", input.scenarioIds)
      .in("assigned_to", input.assigneeIds);
    const open = new Map(((openRows ?? []) as { id: string; scenario_id: string; assigned_to: string }[]).map((row) => [`${row.scenario_id}:${row.assigned_to}`, row.id]));
    const fields = { due_date: input.dueDate, note: input.note || null, assigned_by: session.user.id, updated_at: new Date().toISOString() };
    const inserts = [];
    const updates: string[] = [];
    for (const scenario of scenarios) {
      for (const assigneeId of input.assigneeIds) {
        const existing = open.get(`${scenario.id}:${assigneeId}`);
        if (existing) updates.push(existing);
        else inserts.push({ ...fields, tenant_id: session.tenantId, scenario_id: scenario.id, assigned_to: assigneeId });
      }
    }
    if (inserts.length) {
      const { error } = await admin.from("pitch_assignments").insert(inserts);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (updates.length) {
      const { error } = await admin.from("pitch_assignments").update(fields).in("id", updates);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const what = scenarios.length === 1 ? `the "${scenarios[0]!.label}" pitch` : `${scenarios.length} pitches`;
    await Promise.all(
      input.assigneeIds.map((userId) =>
        notify(userId, `Pitch assigned, due ${due}`, `Record and submit ${what} in Pitch Studio.${input.note ? ` Note: ${input.note}` : ""}`, "/pitch"),
      ),
    );
    return NextResponse.json({ created: inserts.length, updated: updates.length });
  }

  if (input.kind === "quiz") {
    const bank = await loadBank(session.tenantId);
    const sources = (bank?.sources ?? []).filter((source) => input.sourceKeys.includes(source.key) && source.active >= 3);
    if (sources.length !== new Set(input.sourceKeys).size) {
      return NextResponse.json({ error: "Pick knowledge checks that have at least 3 approved questions." }, { status: 400 });
    }
    const { data: openRows } = await admin
      .from("quiz_assignments")
      .select("id, source_key, assigned_to")
      .eq("status", "active")
      .in("source_key", input.sourceKeys)
      .in("assigned_to", input.assigneeIds);
    const open = new Map(((openRows ?? []) as { id: string; source_key: string; assigned_to: string }[]).map((row) => [`${row.source_key}:${row.assigned_to}`, row.id]));
    const fields = { due_date: input.dueDate, pass_score: input.passScore, note: input.note || null, assigned_by: session.user.id, updated_at: new Date().toISOString() };
    const inserts = [];
    const updates: string[] = [];
    for (const source of sources) {
      for (const assigneeId of input.assigneeIds) {
        const existing = open.get(`${source.key}:${assigneeId}`);
        if (existing) updates.push(existing);
        else inserts.push({ ...fields, tenant_id: session.tenantId, source_key: source.key, source_title: source.title, assigned_to: assigneeId });
      }
    }
    if (inserts.length) {
      const { error } = await admin.from("quiz_assignments").insert(inserts);
      if (error) return NextResponse.json({ error: error.message.includes("quiz_assignments") ? "Apply the knowledge check assignments migration first." : error.message }, { status: 500 });
    }
    if (updates.length) await admin.from("quiz_assignments").update(fields).in("id", updates);
    const what = sources.length === 1 ? `the "${sources[0]!.title}" knowledge check` : `${sources.length} knowledge checks`;
    await Promise.all(
      input.assigneeIds.map((userId) =>
        notify(
          userId,
          `Knowledge check assigned, due ${due}`,
          `Pass ${what} with ${input.passScore}% or more.${input.note ? ` Note: ${input.note}` : ""}`,
          sources.length === 1 ? `/learn/knowledge-checks?source=${encodeURIComponent(sources[0]!.key)}` : "/learn/knowledge-checks",
        ),
      ),
    );
    return NextResponse.json({ created: inserts.length, updated: updates.length });
  }

  // Ramp task: added to each person's ramp plan. People without a plan are skipped and reported.
  const { data: planRows } = await admin
    .from("plan_assignments")
    .select("id, user_id, tenant_id, created_at")
    .in("user_id", input.assigneeIds)
    .order("created_at", { ascending: false });
  const planFor = new Map<string, { id: string; tenant_id: string | null }>();
  for (const row of (planRows ?? []) as { id: string; user_id: string; tenant_id: string | null }[]) {
    if (!planFor.has(row.user_id)) planFor.set(row.user_id, row);
  }
  const withPlan = input.assigneeIds.filter((id) => planFor.has(id));
  if (!withPlan.length) return NextResponse.json({ error: "None of these people have a ramp plan yet." }, { status: 400 });

  for (const userId of withPlan) {
    const plan = planFor.get(userId)!;
    const { count } = await admin.from("plan_ad_hoc_steps").select("id", { count: "exact", head: true }).eq("assignment_id", plan.id);
    const { error } = await admin.from("plan_ad_hoc_steps").insert({
      assignment_id: plan.id,
      tenant_id: plan.tenant_id ?? session.tenantId,
      title: input.title,
      description: input.description || null,
      due_date: input.dueDate,
      is_manager_gate: true,
      created_by: session.user.id,
      sort_order: (count ?? 0) + 1,
      status: "not_started",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notify(userId, `Ramp task added, due ${due}`, input.title, "/my-plan");
  }
  return NextResponse.json({ created: withPlan.length, skipped: input.assigneeIds.length - withPlan.length });
}
