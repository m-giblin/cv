import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadAssignedWork } from "@/lib/manager/assigned-work";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { todayIso } from "@/lib/playbooks/assignments";

/** ?userId=: everything assigned to one person the manager can see. */
export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  if (!people.some((person) => person.id === userId)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const items = await loadAssignedWork(session.tenantId, [userId]);
  return NextResponse.json({ items });
}

const patchSchema = z.object({
  kind: z.enum(["simulation", "pitch", "ramp_task", "quiz"]),
  id: z.string().uuid(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cancel: z.boolean().optional(),
});

/** Moves a due date (any kind) or cancels a pitch. Playbooks use /api/playbook-assignments/[id]. */
export async function PATCH(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const input = parsed.data;
  if (input.dueDate && input.dueDate < todayIso()) {
    return NextResponse.json({ error: "Pick a due date from today onward." }, { status: 400 });
  }
  if (input.cancel && input.kind !== "pitch" && input.kind !== "quiz") {
    return NextResponse.json({ error: "Only pitch and knowledge check assignments can be cancelled here." }, { status: 400 });
  }

  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  // Find whose work it is, then check the manager can reach them.
  let ownerId: string | null = null;
  if (input.kind === "simulation") {
    const { data } = await admin.from("simulation_assignments").select("assigned_to").eq("id", input.id).maybeSingle();
    ownerId = (data as { assigned_to: string } | null)?.assigned_to ?? null;
  } else if (input.kind === "pitch" || input.kind === "quiz") {
    const { data } = await admin.from(input.kind === "pitch" ? "pitch_assignments" : "quiz_assignments").select("assigned_to").eq("id", input.id).maybeSingle();
    ownerId = (data as { assigned_to: string } | null)?.assigned_to ?? null;
  } else {
    const { data } = await admin.from("plan_ad_hoc_steps").select("assignment_id").eq("id", input.id).maybeSingle();
    const planId = (data as { assignment_id: string } | null)?.assignment_id;
    if (planId) {
      const { data: plan } = await admin.from("plan_assignments").select("user_id").eq("id", planId).maybeSingle();
      ownerId = (plan as { user_id: string } | null)?.user_id ?? null;
    }
  }
  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  if (!ownerId || !people.some((person) => person.id === ownerId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const table =
    input.kind === "simulation"
      ? "simulation_assignments"
      : input.kind === "pitch"
        ? "pitch_assignments"
        : input.kind === "quiz"
          ? "quiz_assignments"
          : "plan_ad_hoc_steps";
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.dueDate) update.due_date = input.dueDate;
  if (input.cancel) update.status = "cancelled";
  const { error } = await admin.from(table).update(update).eq("id", input.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
