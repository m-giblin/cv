import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

const patchSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).optional(),
});

async function guard(programId: string, planId: string) {
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
  const { data: segment } = program
    ? await admin.from("enablement_program_segments").select("id, segment_index").eq("program_id", programId).eq("plan_id", planId).maybeSingle()
    : { data: null };
  if (!program || !segment) return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  return { session, admin, segment };
}

/** Renames a stage (its plan). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const context = await guard(id, planId);
  if (context instanceof NextResponse) return context;
  const { session, admin } = context;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.name && parsed.data.description === undefined)) {
    return NextResponse.json({ error: "Give the stage a name of at least 3 characters." }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.description !== undefined) update.description = parsed.data.description || null;
  const { error } = await admin.from("onboarding_plans").update(update as never).eq("id", planId).eq("tenant_id", session.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  auditMutation(session.user.id, "program.stage_renamed", "onboarding_plan", planId, { programId: id, ...update }, session.tenantId);
  return NextResponse.json({ ok: true });
}

/** Removes a stage and its steps, then closes the gap in the stage numbering. Blocked while anyone is on it. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const context = await guard(id, planId);
  if (context instanceof NextResponse) return context;
  const { session, admin, segment } = context;

  const { count } = await admin
    .from("plan_assignments")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("tenant_id", session.tenantId);
  if (count) {
    return NextResponse.json(
      { error: `${count} ${count === 1 ? "person is" : "people are"} on this stage. Remove them from it first.` },
      { status: 409 },
    );
  }

  const { error } = await admin.from("enablement_program_segments").delete().eq("id", segment.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Later stages move up one, lowest first so the unique (program, index) never collides.
  const { data: later } = await admin
    .from("enablement_program_segments")
    .select("id, segment_index")
    .eq("program_id", id)
    .gt("segment_index", segment.segment_index)
    .order("segment_index");
  for (const row of later ?? []) {
    await admin.from("enablement_program_segments").update({ segment_index: row.segment_index - 1 } as never).eq("id", row.id);
  }
  await admin.from("onboarding_plans").delete().eq("id", planId).eq("tenant_id", session.tenantId);
  auditMutation(session.user.id, "program.stage_removed", "onboarding_plan", planId, { programId: id }, session.tenantId);
  return NextResponse.json({ ok: true });
}
