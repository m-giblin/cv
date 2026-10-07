import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  edition: z.string().trim().max(40).optional(),
  segmentLabel: z.string().trim().max(120).optional(),
  /** Publish or unpublish every chapter in the guide at once. */
  publishAll: z.boolean().optional(),
});

async function guard(id: string) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  if (!(await assertTenantOwnedRow(session.tenantId, "playbook_guides", id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  return { session, admin };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await guard(id);
  if (context instanceof NextResponse) return context;
  const { session, admin } = context;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { title, edition, segmentLabel, publishAll } = parsed.data;
  const now = new Date().toISOString();

  if (title !== undefined || edition !== undefined || segmentLabel !== undefined) {
    const update: Record<string, unknown> = { updated_at: now };
    if (title !== undefined) update.title = title;
    if (edition !== undefined) update.edition = edition || null;
    if (segmentLabel !== undefined) update.segment_label = segmentLabel || null;
    const { error } = await admin.from("playbook_guides").update(update).eq("id", id).eq("tenant_id", session.tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (publishAll !== undefined) {
    const status = publishAll ? "published" : "draft";
    let query = admin
      .from("capability_playbooks")
      .update({ status, updated_by: session.user.id, updated_at: now, ...(publishAll ? { published_at: now } : {}) })
      .eq("guide_id", id)
      .eq("tenant_id", session.tenantId);
    // Publishing keeps each chapter's original publish date.
    if (publishAll) query = query.eq("status", "draft");
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "playbook.updated", "playbook_guide", id, { publishAll, renamed: Boolean(title) }, session.tenantId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await guard(id);
  if (context instanceof NextResponse) return context;
  const { session, admin } = context;

  const { error } = await admin.from("playbook_guides").delete().eq("id", id).eq("tenant_id", session.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  auditMutation(session.user.id, "playbook.deleted", "playbook_guide", id, {}, session.tenantId);
  return NextResponse.json({ ok: true });
}
