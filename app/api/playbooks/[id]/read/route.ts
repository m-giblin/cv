import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { completePlaybookSteps } from "@/lib/playbooks/plan-completion";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";

/** Marks a published playbook as read by the signed-in person. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  // RLS: only published playbooks in the reader's tenant come back. (Table not in generated types.)
  const { data } = await (session.supabase as unknown as SupabaseClient)
    .from("capability_playbooks")
    .select("id, version, tenant_id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  const playbook = data as { id: string; version: number; tenant_id: string } | null;
  const tenantId = await resolveEffectiveTenantId(session.supabase, session.user.id);
  if (!playbook || playbook.tenant_id !== tenantId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const admin = getTenantAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const readAt = new Date().toISOString();
  const { error } = await admin
    .from("playbook_reads")
    .upsert(
      { tenant_id: tenantId, playbook_id: id, user_id: session.user.id, version: playbook.version, read_at: readAt },
      { onConflict: "playbook_id,user_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await completePlaybookSteps({ tenantId, userId: session.user.id, playbookId: id }).catch(() => []);
  return NextResponse.json({ readAt });
}
