import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PITCH_PASSING_GRADE,
  PITCH_QUEUE_SLOT_COUNT,
  PITCH_SCENARIO_SEEDS,
  type PitchScenarioSeed,
} from "@/lib/pitch/pitch-scenario-seeds";
import { tenantTable } from "@/lib/data/tenant-scoped-query";

export type PitchScenarioRow = {
  id: string;
  slug: string;
  track: string;
  shortLabel: string;
  label: string;
  promptLabel: string;
  prompt: string;
  description: string;
  competencies: string[];
  linkedSolution: string | null;
  maxDurationSec: number;
  sortOrder: number;
  active: boolean;
  passingGrade: number;
};

export type PitchQueueSlot = {
  id: string;
  slot: number;
  status: string;
  scenario: PitchScenarioRow;
  submissionId: string | null;
};

type DbScenario = {
  id: string;
  slug: string;
  track: string;
  short_label: string;
  label: string;
  prompt_label: string;
  prompt: string;
  description: string;
  competencies: string[] | null;
  linked_solution: string | null;
  max_duration_sec: number;
  sort_order: number;
  active: boolean;
  passing_grade: number;
};

function mapScenario(row: DbScenario): PitchScenarioRow {
  return {
    id: row.id,
    slug: row.slug,
    track: row.track,
    shortLabel: row.short_label,
    label: row.label,
    promptLabel: row.prompt_label,
    prompt: row.prompt,
    description: row.description,
    competencies: row.competencies ?? [],
    linkedSolution: row.linked_solution,
    maxDurationSec: row.max_duration_sec,
    sortOrder: row.sort_order,
    active: row.active,
    passingGrade: row.passing_grade,
  };
}

export async function seedPitchScenariosForTenant(tenantId: string): Promise<void> {
  const scoped = tenantTable(tenantId);
  if (!scoped) return;

  const { data: existing } = await scoped.select("pitch_scenario_templates", "slug");
  const existingSlugs = new Set(
    ((existing ?? []) as unknown as Array<{ slug: string }>).map((row) => row.slug),
  );

  const missing = PITCH_SCENARIO_SEEDS.filter((seed) => !existingSlugs.has(seed.slug));
  if (missing.length > 0) {
    await scoped.from("pitch_scenario_templates").insert(
      missing.map((seed) => scenarioSeedToRow(seed, tenantId)) as never[],
    );
  }

  for (const seed of PITCH_SCENARIO_SEEDS) {
    if (!existingSlugs.has(seed.slug)) continue;
    const row = scenarioSeedToRow(seed, tenantId);
    await scoped
      .from("pitch_scenario_templates")
      .update({
        track: row.track,
        short_label: row.short_label,
        label: row.label,
        prompt_label: row.prompt_label,
        prompt: row.prompt,
        description: row.description,
        competencies: row.competencies,
        linked_solution: row.linked_solution,
        max_duration_sec: row.max_duration_sec,
        sort_order: row.sort_order,
        passing_grade: row.passing_grade,
      })
      .eq("tenant_id", tenantId)
      .eq("slug", seed.slug);
  }
}

function scenarioSeedToRow(seed: PitchScenarioSeed, tenantId: string) {
  return {
    tenant_id: tenantId,
    slug: seed.slug,
    track: seed.track,
    short_label: seed.shortLabel,
    label: seed.label,
    prompt_label: seed.promptLabel,
    prompt: seed.prompt,
    description: seed.description,
    competencies: seed.competencies,
    linked_solution: seed.linkedSolution,
    max_duration_sec: seed.maxDurationSec,
    sort_order: seed.sortOrder,
    active: true,
    passing_grade: PITCH_PASSING_GRADE,
  };
}

export async function listPitchScenarios(
  supabase: SupabaseClient,
  tenantId: string,
  opts?: { track?: string; includeInactive?: boolean },
): Promise<PitchScenarioRow[]> {
  await seedPitchScenariosForTenant(tenantId);

  let query = supabase
    .from("pitch_scenario_templates")
    .select(
      "id, slug, track, short_label, label, prompt_label, prompt, description, competencies, linked_solution, max_duration_sec, sort_order, active, passing_grade",
    )
    .eq("tenant_id", tenantId)
    .order("sort_order");

  if (!opts?.includeInactive) {
    query = query.eq("active", true);
  }

  if (opts?.track) {
    query = query.eq("track", opts.track);
  }

  const { data } = await query;
  return ((data ?? []) as DbScenario[]).map(mapScenario);
}

export async function ensurePitchQueueForUser(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<PitchQueueSlot[]> {
  await seedPitchScenariosForTenant(tenantId);

  const { data: activeRows } = await supabase
    .from("pitch_se_queue")
    .select(
      "id, slot, status, submission_id, scenario:pitch_scenario_templates(id, slug, track, short_label, label, prompt_label, prompt, description, competencies, linked_solution, max_duration_sec, sort_order, active, passing_grade)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("slot");

  const active = (activeRows ?? []) as unknown as Array<{
    id: string;
    slot: number;
    status: string;
    submission_id: string | null;
    scenario: DbScenario;
  }>;

  if (active.length >= PITCH_QUEUE_SLOT_COUNT) {
    return active.map((row) => ({
      id: row.id,
      slot: row.slot,
      status: row.status,
      submissionId: row.submission_id,
      scenario: mapScenario(row.scenario),
    }));
  }

  const scenarios = await listPitchScenarios(supabase, tenantId);
  const assignedScenarioIds = new Set([
    ...active.map((row) => row.scenario.id),
    ...(await completedScenarioIds(supabase, userId)),
  ]);

  const pool = scenarios.filter((s) => !assignedScenarioIds.has(s.id));
  const slotsNeeded = PITCH_QUEUE_SLOT_COUNT - active.length;
  const usedSlots = new Set(active.map((row) => row.slot));
  const nextSlots = freeSlots(usedSlots, slotsNeeded);

  const inserts = nextSlots
    .map((slot, index) => ({
      tenant_id: tenantId,
      user_id: userId,
      scenario_id: pool[index % Math.max(pool.length, 1)]?.id,
      slot,
      status: "active" as const,
    }))
    .filter((row) => row.scenario_id);

  if (inserts.length > 0) {
    await supabase.from("pitch_se_queue").insert(inserts);
  }

  return getActivePitchQueue(supabase, userId);
}

async function completedScenarioIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("pitch_se_queue")
    .select("scenario_id")
    .eq("user_id", userId)
    .eq("status", "completed");

  return (data ?? []).map((row) => (row as { scenario_id: string }).scenario_id);
}

function freeSlots(used: Set<number>, count: number): number[] {
  const slots: number[] = [];
  for (let slot = 1; slot <= 5 && slots.length < count; slot += 1) {
    if (!used.has(slot)) slots.push(slot);
  }
  return slots;
}

export async function getActivePitchQueue(
  supabase: SupabaseClient,
  userId: string,
): Promise<PitchQueueSlot[]> {
  const { data } = await supabase
    .from("pitch_se_queue")
    .select(
      "id, slot, status, submission_id, scenario:pitch_scenario_templates(id, slug, track, short_label, label, prompt_label, prompt, description, competencies, linked_solution, max_duration_sec, sort_order, active, passing_grade)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("slot");

  return ((data ?? []) as unknown as Array<{
    id: string;
    slot: number;
    status: string;
    submission_id: string | null;
    scenario: DbScenario;
  }>).map((row) => ({
    id: row.id,
    slot: row.slot,
    status: row.status,
    submissionId: row.submission_id,
    scenario: mapScenario(row.scenario),
  }));
}

export async function rotateQueueOnPitchApproval(
  supabase: SupabaseClient,
  submissionId: string,
  grade: number | null,
): Promise<void> {
  const { data: submission } = await supabase
    .from("pitch_submissions")
    .select("user_id, tenant_id, scenario_id, queue_slot_id, manager_grade")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission?.queue_slot_id || !submission.scenario_id) return;

  const effectiveGrade = grade ?? submission.manager_grade ?? 0;
  const { data: scenario } = await supabase
    .from("pitch_scenario_templates")
    .select("passing_grade")
    .eq("id", submission.scenario_id)
    .maybeSingle();

  const passingGrade = (scenario as { passing_grade?: number } | null)?.passing_grade ?? PITCH_PASSING_GRADE;
  if (effectiveGrade < passingGrade) return;

  const tenantId = (submission as { tenant_id?: string | null }).tenant_id;
  if (!tenantId) return;

  await supabase
    .from("pitch_se_queue")
    .update({
      status: "completed",
      submission_id: submissionId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", submission.queue_slot_id);

  await ensurePitchQueueForUser(supabase, submission.user_id, tenantId);
}
