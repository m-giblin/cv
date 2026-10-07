import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { todayIso } from "@/lib/playbooks/assignments";

const patchSchema = z.object({
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cancel: z.boolean().optional(),
});

/** Moves a due date or cancels an assignment, for people the viewer manages. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (parsed.data.dueDate && parsed.data.dueDate < todayIso()) {
    return NextResponse.json({ error: "Pick a due date from today onward." }, { status: 400 });
  }

  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data } = await admin.from("playbook_assignments").select("assigned_to, tenant_id").eq("id", id).maybeSingle();
  const row = data as { assigned_to: string; tenant_id: string } | null;
  const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
  if (!row || row.tenant_id !== session.tenantId || !people.some((person) => person.id === row.assigned_to)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.dueDate) Object.assign(update, { due_date: parsed.data.dueDate, due_soon_reminded_at: null, overdue_reminded_at: null });
  if (parsed.data.cancel) update.status = "cancelled";
  const { error } = await admin.from("playbook_assignments").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
