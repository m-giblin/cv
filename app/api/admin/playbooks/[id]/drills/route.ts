import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadDrillStatus, mapPlaybook } from "@/lib/playbooks/data";
import {
  OBJECTION_DRILL_PERSONA,
  buildPitchDrillRows,
  objectionDrillName,
  objectionDrillPrompt,
} from "@/lib/playbooks/drills";

const schema = z.object({ kind: z.enum(["pitch", "objections"]) });

/**
 * Creates or refreshes a published playbook's practice drills. Pitch drills become Pitch Studio
 * scenarios; the objection drill becomes a simulation template admins and managers can assign.
 * Re-running updates the existing drills in place, so learners' history stays attached.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await assertTenantOwnedRow(session.tenantId, "capability_playbooks", id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: row } = await admin
    .from("capability_playbooks")
    .select("id, guide_id, chapter, slug, title, status, version, body, published_at, updated_at")
    .eq("id", id)
    .single();
  const playbook = mapPlaybook(row as Parameters<typeof mapPlaybook>[0]);
  if (playbook.status !== "published") {
    return NextResponse.json({ error: "Publish the playbook first, so learners can read what they're practising." }, { status: 409 });
  }
  const { data: guide } = await admin.from("playbook_guides").select("title").eq("id", playbook.guideId).single();
  const guideTitle = (guide as { title: string } | null)?.title ?? "field guide";

  if (parsed.data.kind === "pitch") {
    const rows = buildPitchDrillRows(playbook, guideTitle);
    if (!rows.length) return NextResponse.json({ error: "This playbook has no pitches to practise." }, { status: 422 });

    const { data: existing } = await admin
      .from("pitch_scenario_templates")
      .select("id, slug")
      .eq("tenant_id", session.tenantId)
      .eq("source_playbook_id", playbook.id);
    const bySlug = new Map(((existing ?? []) as { id: string; slug: string }[]).map((item) => [item.slug, item.id]));

    for (const drill of rows) {
      const current = bySlug.get(drill.slug);
      const result = current
        ? await admin.from("pitch_scenario_templates").update(drill).eq("id", current)
        : await admin.from("pitch_scenario_templates").insert({ ...drill, tenant_id: session.tenantId, competencies: [] });
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      bySlug.delete(drill.slug);
    }
    // Pitches removed from the playbook: retire their drills (kept for learners' history).
    if (bySlug.size) {
      await admin.from("pitch_scenario_templates").update({ active: false }).in("id", [...bySlug.values()]);
    }
  } else {
    if (!playbook.body.objections.length) {
      return NextResponse.json({ error: "This playbook has no objections to practise." }, { status: 422 });
    }
    const template = {
      name: objectionDrillName(playbook),
      persona: OBJECTION_DRILL_PERSONA,
      vertical: "SLED",
      solution_focus: playbook.title,
      difficulty: "intermediate" as const,
      prompt_body: objectionDrillPrompt(playbook),
      source_playbook_id: playbook.id,
      source_version: playbook.version,
    };
    const { data: existing } = await admin
      .from("simulation_templates")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .eq("source_playbook_id", playbook.id)
      .maybeSingle();
    const current = (existing as { id: string } | null)?.id;
    const result = current
      ? await admin.from("simulation_templates").update(template).eq("id", current)
      : await admin.from("simulation_templates").insert({ ...template, tenant_id: session.tenantId, created_by: session.user.id });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "playbook.updated", "capability_playbook", id, { drills: parsed.data.kind }, session.tenantId);
  const status = await loadDrillStatus(session.tenantId, [playbook.id]);
  return NextResponse.json({ drills: status[playbook.id] });
}
