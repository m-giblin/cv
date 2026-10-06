import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { mapPlaybook } from "@/lib/playbooks/data";
import { playbookBodySchema } from "@/lib/playbooks/types";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  body: playbookBodySchema.optional(),
  status: z.enum(["draft", "published"]).optional(),
});

/** Edits one chapter: its content (bumps the version) and/or its published state. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields." }, { status: 400 });
  if (!(await assertTenantOwnedRow(session.tenantId, "capability_playbooks", id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data: current } = await admin.from("capability_playbooks").select("version, status").eq("id", id).single();
  const existing = current as { version: number; status: string } | null;

  const { title, body, status } = parsed.data;
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_by: session.user.id, updated_at: now };
  if (title) update.title = title;
  if (body) {
    update.body = body;
    update.version = (existing?.version ?? 1) + 1;
  }
  if (status) {
    update.status = status;
    if (status === "published" && existing?.status !== "published") update.published_at = now;
  }

  const { data, error } = await admin
    .from("capability_playbooks")
    .update(update)
    .eq("id", id)
    .eq("tenant_id", session.tenantId)
    .select("id, guide_id, chapter, slug, title, status, version, body, published_at, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Couldn't save." }, { status: 500 });

  auditMutation(session.user.id, "playbook.updated", "capability_playbook", id, { status, edited: Boolean(body) }, session.tenantId);
  return NextResponse.json({ playbook: mapPlaybook(data as Parameters<typeof mapPlaybook>[0]) });
}
