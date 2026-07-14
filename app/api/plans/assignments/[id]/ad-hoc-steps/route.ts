import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isManagerGate: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id: assignmentId } = await context.params;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: assignment } = await session.supabase
    .from("plan_assignments")
    .select("id, user_id, tenant_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const { count } = await session.supabase
    .from("plan_ad_hoc_steps")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId);

  const { data, error } = await session.supabase
    .from("plan_ad_hoc_steps")
    .insert({
      assignment_id: assignmentId,
      tenant_id: (assignment as { tenant_id?: string | null }).tenant_id ?? session.tenantId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      due_date: parsed.data.dueDate ?? null,
      is_manager_gate: parsed.data.isManagerGate ?? true,
      created_by: session.user.id,
      sort_order: (count ?? 0) + 1,
      status: "not_started",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await createNotification(session.supabase, {
    userId: assignment.user_id,
    title: "New task added to your ramp plan",
    body: parsed.data.title,
    actionUrl: "/my-plan",
  });

  return NextResponse.json({ id: data.id });
}
