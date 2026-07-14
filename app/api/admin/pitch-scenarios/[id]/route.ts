import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

const schema = z.object({
  slug: z.string().min(2),
  track: z.enum(["elevator", "discovery", "competitive", "executive", "governance"]),
  shortLabel: z.string().min(2),
  label: z.string().min(3),
  promptLabel: z.string().min(2),
  prompt: z.string().min(10),
  description: z.string().min(3),
  competencies: z.array(z.string()).default([]),
  linkedSolution: z.string().nullable().optional(),
  maxDurationSec: z.number().int().min(30).max(300).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  passingGrade: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const scoped = tenantTable(session.tenantId);
  if (!scoped) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await assertTenantOwnedRow(session.tenantId, "pitch_scenario_templates", id);
  if (!owned) {
    return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
  }

  const { error } = await scoped
    .from("pitch_scenario_templates")
    .update({
      slug: parsed.data.slug,
      track: parsed.data.track,
      short_label: parsed.data.shortLabel,
      label: parsed.data.label,
      prompt_label: parsed.data.promptLabel,
      prompt: parsed.data.prompt,
      description: parsed.data.description,
      competencies: parsed.data.competencies,
      linked_solution: parsed.data.linkedSolution ?? null,
      max_duration_sec: parsed.data.maxDurationSec ?? 60,
      sort_order: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
      passing_grade: parsed.data.passingGrade ?? 4,
    })
    .eq("id", id)
    .eq("tenant_id", session.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "pitch_scenario.updated", "pitch_scenario_template", id, {
    slug: parsed.data.slug,
  }, session.tenantId);

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const scoped = tenantTable(session.tenantId);
  if (!scoped) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await context.params;
  const owned = await assertTenantOwnedRow(session.tenantId, "pitch_scenario_templates", id);
  if (!owned) {
    return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
  }

  const { error } = await scoped
    .from("pitch_scenario_templates")
    .update({ active: false })
    .eq("id", id)
    .eq("tenant_id", session.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "pitch_scenario.deactivated", "pitch_scenario_template", id, undefined, session.tenantId);

  return NextResponse.json({ success: true });
}
