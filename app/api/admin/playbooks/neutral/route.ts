import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForTenant } from "@/lib/ai/resolve-provider-for-user";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { draftChanges, neutralGuide, neutralPlaybook, sledMentions } from "@/lib/playbooks/neutralize";
import { guideBodySchema, playbookBodySchema } from "@/lib/playbooks/types";

export const maxDuration = 300;

type Row = { id: string; title: string; chapter?: number; body: unknown; draft_body: unknown; draft_note: string | null; version?: number };

function db() {
  return getTenantAdminClient() as unknown as SupabaseClient | null;
}

/** Everything that can be rewritten, with its draft and what the draft changes. */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = db();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const [guides, playbooks] = await Promise.all([
    admin.from("playbook_guides").select("id, title, body, draft_body, draft_note").eq("tenant_id", session.tenantId),
    admin.from("capability_playbooks").select("id, title, chapter, body, draft_body, draft_note").eq("tenant_id", session.tenantId).order("chapter"),
  ]);
  if (guides.error || playbooks.error) {
    return NextResponse.json({ error: "Apply the playbook drafts database migration first." }, { status: 503 });
  }
  const item = (target: "guide" | "playbook", row: Row) => ({
    target,
    id: row.id,
    title: target === "guide" ? `${row.title} (front matter)` : `Ch. ${row.chapter} ${row.title}`,
    mentions: sledMentions(row.body),
    draft: row.draft_body ? { note: row.draft_note, mentionsLeft: sledMentions(row.draft_body), changes: draftChanges(row.body, row.draft_body) } : null,
  });
  return NextResponse.json({
    items: [...((guides.data ?? []) as Row[]).map((row) => item("guide", row)), ...((playbooks.data ?? []) as Row[]).map((row) => item("playbook", row))],
  });
}

const schema = z.object({
  target: z.enum(["guide", "playbook"]),
  id: z.string().uuid(),
  action: z.enum(["generate", "publish", "discard"]),
});

/** Generate a sector-neutral draft for one guide or chapter, or publish / discard its draft. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { target, id, action } = parsed.data;
  const admin = db();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const table = target === "guide" ? "playbook_guides" : "capability_playbooks";
  const { data } = await admin
    .from(table)
    .select(target === "guide" ? "id, title, body, draft_body, draft_note" : "id, title, chapter, version, body, draft_body, draft_note")
    .eq("tenant_id", session.tenantId)
    .eq("id", id)
    .maybeSingle();
  const row = data as Row | null;
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const now = new Date().toISOString();

  if (action === "discard") {
    await admin.from(table).update({ draft_body: null, draft_note: null }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "publish") {
    if (!row.draft_body) return NextResponse.json({ error: "There's no draft to publish." }, { status: 400 });
    // A chapter's new version marks its pitch and objection drills as out of date, so they get rebuilt.
    const update: Record<string, unknown> =
      target === "guide"
        ? { body: row.draft_body, draft_body: null, draft_note: null, segment_label: null, updated_at: now }
        : { body: row.draft_body, draft_body: null, draft_note: null, version: (row.version ?? 1) + 1, updated_by: session.user.id, updated_at: now };
    const { error } = await admin.from(table).update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    auditMutation(session.user.id, "playbook.updated", target === "guide" ? "playbook_guide" : "capability_playbook", id, { neutralDraft: true }, session.tenantId);
    return NextResponse.json({ ok: true });
  }

  const { model, provider, modelName } = await resolveAiProviderForTenant(session.tenantId);
  if (!model) return NextResponse.json({ error: "AI isn't configured for this workspace." }, { status: 503 });
  try {
    const result =
      target === "guide"
        ? await neutralGuide(model, row.title, guideBodySchema.parse(row.body ?? {}))
        : await neutralPlaybook(model, row.title, playbookBodySchema.parse(row.body ?? {}));
    await logAiUsage(session.supabase, { feature: "playbook_rewrite", provider, model: modelName, userId: session.user.id, usage: result.usage, tenantId: session.tenantId });
    const { error } = await admin.from(table).update({ draft_body: result.body, draft_note: "Sector-neutral rewrite" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, changes: draftChanges(row.body, result.body).length, mentionsLeft: sledMentions(result.body) });
  } catch {
    return NextResponse.json({ error: "The AI couldn't rewrite this one. Try it again." }, { status: 502 });
  }
}
