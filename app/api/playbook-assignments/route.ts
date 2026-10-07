import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createNotification } from "@/lib/notifications/create-notification";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { loadAssignments, todayIso } from "@/lib/playbooks/assignments";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";
import type { Database } from "@/lib/database.types";

const assignSchema = z
  .object({
    playbookIds: z.array(z.string().uuid()).min(1).max(30),
    assigneeIds: z.array(z.string().uuid()).min(1).max(200),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    requireRead: z.boolean().default(true),
    requirePitch: z.boolean().default(true),
    requireObjections: z.boolean().default(true),
    pitchPassScore: z.number().int().min(1).max(100).default(70),
    requireQuiz: z.boolean().default(true),
    quizPassScore: z.number().int().min(1).max(100).default(80),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.requireRead || value.requirePitch || value.requireObjections, {
    message: "Pick at least one thing that counts as done.",
  });

/** ?scope=mine: my assignments. ?scope=team: everyone I can assign to. Both with live progress. */
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope") === "team" ? "team" : "mine";

  if (scope === "mine") {
    const session = await requireAuthenticatedSession();
    if (session instanceof NextResponse) return session;
    const tenantId = await resolveEffectiveTenantId(session.supabase, session.user.id);
    if (!tenantId) return NextResponse.json({ assignments: [] });
    const assignments = await loadAssignments(tenantId, { assigneeIds: [session.user.id], includeClosed: true });
    return NextResponse.json({ assignments });
  }

  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  const assignments = await loadAssignments(session.tenantId, { assigneeIds: people.map((person) => person.id), includeClosed: true });
  return NextResponse.json({ assignments, people });
}

/** Assigns playbooks to people with a due date. Re-assigning an open one updates it. */
export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = assignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the form.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const input = parsed.data;
  if (input.dueDate < todayIso()) return NextResponse.json({ error: "Pick a due date from today onward." }, { status: 400 });

  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  const allowed = new Set(people.map((person) => person.id));
  const outside = input.assigneeIds.filter((id) => !allowed.has(id));
  if (outside.length) return NextResponse.json({ error: "You can only assign to people on your team." }, { status: 403 });

  const { data: playbookRows } = await admin
    .from("capability_playbooks")
    .select("id, title")
    .eq("tenant_id", session.tenantId)
    .eq("status", "published")
    .in("id", input.playbookIds);
  const playbooks = (playbookRows ?? []) as { id: string; title: string }[];
  if (playbooks.length !== new Set(input.playbookIds).size) {
    return NextResponse.json({ error: "Only published playbooks can be assigned." }, { status: 400 });
  }

  const { data: openRows } = await admin
    .from("playbook_assignments")
    .select("id, playbook_id, assigned_to")
    .eq("tenant_id", session.tenantId)
    .eq("status", "active")
    .in("playbook_id", input.playbookIds)
    .in("assigned_to", input.assigneeIds);
  const open = new Map(((openRows ?? []) as { id: string; playbook_id: string; assigned_to: string }[]).map((row) => [`${row.playbook_id}:${row.assigned_to}`, row.id]));

  const fields = {
    due_date: input.dueDate,
    require_read: input.requireRead,
    require_pitch: input.requirePitch,
    require_objections: input.requireObjections,
    pitch_pass_score: input.pitchPassScore,
    require_quiz: input.requireQuiz,
    quiz_pass_score: input.quizPassScore,
    note: input.note || null,
    assigned_by: session.user.id,
    due_soon_reminded_at: null,
    overdue_reminded_at: null,
    updated_at: new Date().toISOString(),
  };
  const inserts = [];
  const updates: string[] = [];
  for (const playbook of playbooks) {
    for (const assigneeId of input.assigneeIds) {
      const existing = open.get(`${playbook.id}:${assigneeId}`);
      if (existing) updates.push(existing);
      else inserts.push({ ...fields, tenant_id: session.tenantId, playbook_id: playbook.id, assigned_to: assigneeId });
    }
  }
  // Before the knowledge-check migration is applied, save without those two columns.
  const { error: probe } = await admin.from("playbook_assignments").select("require_quiz").limit(1);
  if (probe) {
    delete (fields as Partial<typeof fields>).require_quiz;
    delete (fields as Partial<typeof fields>).quiz_pass_score;
  }
  if (inserts.length) {
    const { error } = await admin.from("playbook_assignments").insert(inserts.map((row) => (probe ? { ...row, require_quiz: undefined, quiz_pass_score: undefined } : row)));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (updates.length) {
    const { error } = await admin.from("playbook_assignments").update(fields).in("id", updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = new Date(`${input.dueDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const what = playbooks.length === 1 ? `the ${playbooks[0]!.title} playbook` : `${playbooks.length} playbooks`;
  await Promise.all(
    input.assigneeIds.map((userId) =>
      createNotification(admin as unknown as SupabaseClient<Database>, {
        userId,
        title: `Playbook assigned, due ${due}`,
        body: `You've been asked to work through ${what}.${input.note ? ` Note: ${input.note}` : ""}`,
        actionUrl: "/learn/playbooks",
      }).catch(() => undefined),
    ),
  );

  return NextResponse.json({ created: inserts.length, updated: updates.length });
}
