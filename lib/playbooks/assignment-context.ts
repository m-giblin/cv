import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

/** An open chapter assignment, as practice pages describe it: who asked and what passes. */
export type AssignedChapter = {
  playbookTitle: string;
  assignedByName: string | null;
  pitchPassScore: number;
  quizPassScore: number;
};

/**
 * The user's open assignment for one chapter, if they have one. Drills and checks from that chapter
 * count toward it, so practice pages say so instead of calling the attempt private.
 */
export async function loadAssignedChapter(userId: string, playbookId: string | null | undefined): Promise<AssignedChapter | null> {
  const admin = getTenantAdminClient();
  if (!admin || !playbookId) return null;
  const { data } = await admin
    .from("playbook_assignments")
    .select("assigned_by, pitch_pass_score, quiz_pass_score, playbook:capability_playbooks(title)")
    .eq("assigned_to", userId)
    .eq("playbook_id", playbookId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const row = data as {
    assigned_by: string | null;
    pitch_pass_score: number | null;
    quiz_pass_score: number | null;
    playbook: { title: string } | null;
  } | null;
  if (!row) return null;
  const { data: assigner } = row.assigned_by
    ? await admin.from("profiles").select("full_name").eq("id", row.assigned_by).maybeSingle()
    : { data: null };
  return {
    playbookTitle: row.playbook?.title ?? "this chapter",
    assignedByName: (assigner as { full_name?: string | null } | null)?.full_name ?? null,
    pitchPassScore: row.pitch_pass_score ?? 70,
    quizPassScore: row.quiz_pass_score ?? 80,
  };
}

/** The chapter a Pitch Studio scenario was drilled from, if any. */
export async function playbookForPitchScenario(scenarioId: string | null | undefined): Promise<string | null> {
  const admin = getTenantAdminClient();
  if (!admin || !scenarioId) return null;
  const { data } = await admin.from("pitch_scenario_templates").select("source_playbook_id").eq("id", scenarioId).maybeSingle();
  return (data as { source_playbook_id?: string | null } | null)?.source_playbook_id ?? null;
}
