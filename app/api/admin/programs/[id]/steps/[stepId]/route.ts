import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

const moveSchema = z.object({ toPlanId: z.string().uuid() });

async function guard(programId: string, stepId: string) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data: program } = await admin
    .from("enablement_programs")
    .select("id")
    .eq("id", programId)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  const { data: segments } = program
    ? await admin.from("enablement_program_segments").select("plan_id").eq("program_id", programId)
    : { data: null };
  const planIds = (segments ?? []).map((row) => row.plan_id);
  const { data: step } = planIds.length
    ? await admin.from("plan_steps").select("id, plan_id, title").eq("id", stepId).in("plan_id", planIds).eq("tenant_id", session.tenantId).maybeSingle()
    : { data: null };
  if (!program || !step) return NextResponse.json({ error: "Step not found in this program." }, { status: 404 });
  return { session, admin, step, planIds };
}

async function lastOrder(admin: NonNullable<ReturnType<typeof getTenantAdminClient>>, planId: string) {
  const { data } = await admin.from("plan_steps").select("sort_order").eq("plan_id", planId).order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 1;
}

/** Moves a step to the end of another stage in the same program. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId } = await params;
  const context = await guard(id, stepId);
  if (context instanceof NextResponse) return context;
  const { session, admin, step, planIds } = context;

  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !planIds.includes(parsed.data.toPlanId)) {
    return NextResponse.json({ error: "Choose a stage in this program." }, { status: 400 });
  }
  if (parsed.data.toPlanId === step.plan_id) return NextResponse.json({ ok: true });

  const { error } = await admin
    .from("plan_steps")
    .update({ plan_id: parsed.data.toPlanId, sort_order: await lastOrder(admin, parsed.data.toPlanId) } as never)
    .eq("id", stepId)
    .eq("tenant_id", session.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  auditMutation(session.user.id, "program.step_moved", "plan_step", stepId, { programId: id, from: step.plan_id, to: parsed.data.toPlanId }, session.tenantId);
  return NextResponse.json({ ok: true });
}

/** Deletes a step from a stage's outline. Copies already given to people keep their own history. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId } = await params;
  const context = await guard(id, stepId);
  if (context instanceof NextResponse) return context;
  const { session, admin, step } = context;

  const { error } = await admin.from("plan_steps").delete().eq("id", stepId).eq("tenant_id", session.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  auditMutation(session.user.id, "program.step_removed", "plan_step", stepId, { programId: id, planId: step.plan_id, title: step.title }, session.tenantId);
  return NextResponse.json({ ok: true });
}
