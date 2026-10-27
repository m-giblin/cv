import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

const MAX_STAGES = 6;

const bodySchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
});

/** Adds a stage to a program: a new, empty plan appended as the last stage. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the stage a name of at least 3 characters." }, { status: 400 });

  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: program } = await admin
    .from("enablement_programs")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  if (!program) return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const { data: segments } = await admin.from("enablement_program_segments").select("segment_index").eq("program_id", id);
  const next = Math.max(0, ...(segments ?? []).map((row) => row.segment_index)) + 1;
  if (next > MAX_STAGES) return NextResponse.json({ error: `A program can have at most ${MAX_STAGES} stages.` }, { status: 400 });

  const { data: plan, error: planError } = await admin
    .from("onboarding_plans")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      is_template: true,
      is_locked: false,
      created_by: session.user.id,
      tenant_id: session.tenantId,
    } as never)
    .select("id")
    .single();
  if (planError || !plan) return NextResponse.json({ error: planError?.message ?? "Could not create the stage." }, { status: 500 });

  const { error: segmentError } = await admin
    .from("enablement_program_segments")
    .insert({ program_id: id, segment_index: next, plan_id: plan.id, tenant_id: session.tenantId } as never);
  if (segmentError) {
    await admin.from("onboarding_plans").delete().eq("id", plan.id).eq("tenant_id", session.tenantId);
    return NextResponse.json({ error: segmentError.message }, { status: 500 });
  }

  await admin.from("enablement_programs").update({ segment_count: Math.min(MAX_STAGES, next) } as never).eq("id", id);
  auditMutation(session.user.id, "program.stage_added", "enablement_program", id, { planId: plan.id, name: parsed.data.name }, session.tenantId);
  return NextResponse.json({ planId: plan.id, index: next });
}
