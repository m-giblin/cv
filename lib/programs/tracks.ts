import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

/**
 * Programs as tracks: an enablement program is an ordered set of stages, each stage one plan.
 * This loads them with every stage's steps for the timeline view (service role; routes check access).
 */

export type TrackStep = {
  id: string;
  title: string;
  type: string;
  order: number;
  /** Days after the stage starts that the step is due. */
  dueOffsetDays: number | null;
  isGate: boolean;
};

export type TrackStage = { index: number; planId: string; name: string; description: string; steps: TrackStep[] };

export type ProgramTrack = { id: string; name: string; description: string; stages: TrackStage[] };

export async function loadProgramTracks(tenantId: string): Promise<ProgramTrack[]> {
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return [];
  const { data: programs } = await admin
    .from("enablement_programs")
    .select("id, name, description")
    .eq("tenant_id", tenantId)
    .order("name");
  const programRows = (programs ?? []) as { id: string; name: string; description: string | null }[];
  if (!programRows.length) return [];

  const { data: segments } = await admin
    .from("enablement_program_segments")
    .select("program_id, segment_index, plan_id")
    .in(
      "program_id",
      programRows.map((row) => row.id),
    )
    .order("segment_index");
  const segmentRows = (segments ?? []) as { program_id: string; segment_index: number; plan_id: string }[];
  const planIds = [...new Set(segmentRows.map((row) => row.plan_id))];
  if (!planIds.length) return programRows.map((row) => ({ id: row.id, name: row.name, description: row.description ?? "", stages: [] }));

  const [plans, steps] = await Promise.all([
    admin.from("onboarding_plans").select("id, name, description").in("id", planIds),
    admin.from("plan_steps").select("id, plan_id, title, step_type, sort_order, metadata").in("plan_id", planIds).order("sort_order"),
  ]);
  const planById = new Map(((plans.data ?? []) as { id: string; name: string; description: string | null }[]).map((row) => [row.id, row]));
  const stepsByPlan = new Map<string, TrackStep[]>();
  for (const row of (steps.data ?? []) as { id: string; plan_id: string; title: string; step_type: string; sort_order: number; metadata: unknown }[]) {
    const meta = parsePlanStepMetadata(row.metadata, row.sort_order);
    const list = stepsByPlan.get(row.plan_id) ?? [];
    list.push({ id: row.id, title: row.title, type: row.step_type, order: row.sort_order, dueOffsetDays: meta.dueOffsetDays, isGate: meta.isSegmentGate });
    stepsByPlan.set(row.plan_id, list);
  }

  return programRows.map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description ?? "",
    stages: segmentRows
      .filter((segment) => segment.program_id === program.id && planById.has(segment.plan_id))
      .map((segment) => {
        const plan = planById.get(segment.plan_id)!;
        return {
          index: segment.segment_index,
          planId: plan.id,
          name: plan.name,
          description: plan.description ?? "",
          steps: stepsByPlan.get(plan.id) ?? [],
        };
      }),
  }));
}
