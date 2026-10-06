import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeUsage } from "@/lib/admin/practice-library";

const DAY_MS = 24 * 60 * 60 * 1000;

function bump(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

/**
 * Usage figures for the practice library (Content › Practice), scoped to one tenant:
 * - simulations: ramp plan templates that use the sim as a step, and assignments created in the last 30 days;
 * - pitch scenarios: active SE queue slots, and pitch submissions in the last 30 days.
 * Any query that fails leaves its figures empty rather than failing the page.
 */
export async function loadPracticeUsage(admin: SupabaseClient, tenantId: string): Promise<PracticeUsage> {
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const usage: PracticeUsage = { simPlans: {}, simRuns30d: {}, pitchSlots: {}, pitchRuns30d: {} };

  const [templates, assignments, slots, submissions] = await Promise.all([
    admin.from("onboarding_plans").select("id").eq("tenant_id", tenantId).eq("is_template", true),
    admin
      .from("simulation_assignments")
      .select("template_id")
      .eq("tenant_id", tenantId)
      .gte("created_at", since)
      .not("template_id", "is", null),
    admin.from("pitch_se_queue").select("scenario_id").eq("tenant_id", tenantId).eq("status", "active"),
    admin
      .from("pitch_submissions")
      .select("scenario_id")
      .eq("tenant_id", tenantId)
      .gte("created_at", since)
      .not("scenario_id", "is", null),
  ]);

  for (const row of (assignments.data ?? []) as { template_id: string | null }[]) bump(usage.simRuns30d, row.template_id);
  for (const row of (slots.data ?? []) as { scenario_id: string | null }[]) bump(usage.pitchSlots, row.scenario_id);
  for (const row of (submissions.data ?? []) as { scenario_id: string | null }[]) bump(usage.pitchRuns30d, row.scenario_id);

  const planIds = ((templates.data ?? []) as { id: string }[]).map((row) => row.id);
  if (planIds.length > 0) {
    const { data: steps } = await admin
      .from("plan_steps")
      .select("plan_id, simulation_template_id")
      .in("plan_id", planIds)
      .not("simulation_template_id", "is", null);
    const plansBySim = new Map<string, Set<string>>();
    for (const step of (steps ?? []) as { plan_id: string; simulation_template_id: string | null }[]) {
      if (!step.simulation_template_id) continue;
      const set = plansBySim.get(step.simulation_template_id) ?? new Set<string>();
      set.add(step.plan_id);
      plansBySim.set(step.simulation_template_id, set);
    }
    for (const [simId, plans] of plansBySim) usage.simPlans[simId] = plans.size;
  }

  return usage;
}
