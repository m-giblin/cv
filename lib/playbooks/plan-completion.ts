import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

/**
 * Finishing a playbook completes every matching playbook step on the person's plans.
 * Playbook steps are stored as content_review rows with the chapter id in metadata.
 */
export async function completePlaybookSteps(input: { tenantId: string; userId: string; playbookId: string }) {
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return [];

  const { data: assignments } = await admin.from("plan_assignments").select("id, plan_id").eq("user_id", input.userId);
  const assignmentRows = (assignments ?? []) as { id: string; plan_id: string }[];
  if (!assignmentRows.length) return [];

  const { data: steps } = await admin
    .from("plan_steps")
    .select("id, plan_id, title, metadata")
    .eq("step_type", "content_review")
    .in(
      "plan_id",
      assignmentRows.map((row) => row.plan_id),
    );
  const matching = ((steps ?? []) as { id: string; plan_id: string; title: string; metadata: Record<string, unknown> | null }[]).filter(
    (step) => step.metadata?.playbookId === input.playbookId,
  );
  if (!matching.length) return [];

  const now = new Date().toISOString();
  const completed: string[] = [];
  for (const step of matching) {
    for (const assignment of assignmentRows.filter((row) => row.plan_id === step.plan_id)) {
      const { data: existing } = await admin
        .from("plan_assignment_steps")
        .select("id, status")
        .eq("assignment_id", assignment.id)
        .eq("plan_step_id", step.id)
        .maybeSingle();
      const row = existing as { id: string; status: string } | null;
      if (row && (row.status === "completed" || row.status === "reviewed")) continue;
      const fields = { status: "completed" as const, completed_at: now, updated_at: now, notes: "Finished the playbook." };
      const { error } = row
        ? await admin.from("plan_assignment_steps").update(fields).eq("id", row.id)
        : await admin.from("plan_assignment_steps").insert({
            ...fields,
            assignment_id: assignment.id,
            plan_step_id: step.id,
            tenant_id: input.tenantId,
          });
      if (!error) completed.push(step.title);
    }
  }
  return completed;
}
