import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { mapPlaybook } from "@/lib/playbooks/data";
import { OBJECTION_DRILL_PERSONA, objectionDrillName, objectionDrillPrompt } from "@/lib/playbooks/drills";
import { resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";
import { SE_ROUTES } from "@/lib/se/se-routes";

/**
 * Starts an objection drill for the signed-in person from a published playbook: a simulation
 * assignment to themselves, built from the playbook's current objections.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  // RLS only returns published playbooks in the reader's own tenant. (Table not in generated types.)
  const reader = session.supabase as unknown as SupabaseClient;
  const { data: row } = await reader
    .from("capability_playbooks")
    .select("id, guide_id, chapter, slug, title, status, version, body, published_at, updated_at")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "That playbook isn't available." }, { status: 404 });
  const playbook = mapPlaybook(row as unknown as Parameters<typeof mapPlaybook>[0]);
  if (!playbook.body.objections.length) {
    return NextResponse.json({ error: "This playbook has no objections to practise." }, { status: 422 });
  }

  const context = await resolveTenantContext();
  if (!context?.tenantId) return NextResponse.json({ error: "No organization found." }, { status: 403 });

  const { data: template } = await session.supabase
    .from("simulation_templates")
    .select("id")
    .eq("source_playbook_id", playbook.id)
    .maybeSingle();

  const name = objectionDrillName(playbook);
  const promptBody = objectionDrillPrompt(playbook);
  const { data, error } = await session.supabase
    .from("simulation_assignments")
    .insert({
      template_id: (template as { id: string } | null)?.id ?? null,
      assigned_to: session.user.id,
      assigned_by: session.user.id,
      persona: OBJECTION_DRILL_PERSONA,
      vertical: "SLED",
      solution_focus: playbook.title,
      difficulty: "intermediate",
      status: "not_started",
      transcript: [],
      session_data: {
        promptSnapshot: promptBody,
        aiRoleplay: true,
        simulationKind: "objection_practice",
        startMessage: resolveSimulationStartMessage(name, promptBody),
        practiceRoundsRequired: 0,
        practiceRoundsCompleted: 0,
        sourcePlaybookId: playbook.id,
        sourcePlaybookVersion: playbook.version,
      },
      tenant_id: context.tenantId,
    })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Couldn't start the drill." }, { status: 500 });

  return NextResponse.json({
    assignmentId: data.id,
    redirectUrl: `${SE_ROUTES.simulations}?focus=simulation&assignment=${data.id}`,
  });
}
