import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { PlanStep, UserPlan } from "@/lib/types";
import { parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { isStepLockedForSegment } from "@/lib/corpus/parse-step-metadata";
import { fetchAdHocStepsForAssignments } from "@/lib/plans/ad-hoc-steps";

type DbPlanStep = Database["public"]["Tables"]["plan_steps"]["Row"];
type DbPlanAssignment = Database["public"]["Tables"]["plan_assignments"]["Row"];
type DbPlanAssignmentStep = Database["public"]["Tables"]["plan_assignment_steps"]["Row"];
type DbOnboardingPlan = Database["public"]["Tables"]["onboarding_plans"]["Row"];

export async function fetchPlansBundle(
  supabase: SupabaseClient<Database>,
  tenantId?: string | null,
): Promise<UserPlan[]> {
  let query = supabase.from("plan_assignments").select("user_id");
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  const { data: assignments } = await query;
  const userIds = [...new Set((assignments ?? []).map((row) => row.user_id))];
  return fetchPlansForUsers(supabase, userIds, tenantId);
}

export async function fetchPlansForUsers(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  tenantId?: string | null,
): Promise<UserPlan[]> {
  if (userIds.length === 0) {
    return [];
  }

  let assignmentsQuery = supabase.from("plan_assignments").select("*").in("user_id", userIds);
  if (tenantId) {
    assignmentsQuery = assignmentsQuery.eq("tenant_id", tenantId);
  }
  const { data: assignmentsRaw } = await assignmentsQuery;

  const assignments = (assignmentsRaw ?? []) as DbPlanAssignment[];
  if (assignments.length === 0) {
    return [];
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const planIds = [...new Set(assignments.map((assignment) => assignment.plan_id))];

  const plansQuery = supabase.from("onboarding_plans").select("id, name").in("id", planIds);
  const planStepsQuery = supabase.from("plan_steps").select("*").in("plan_id", planIds).order("sort_order");
  const contentAssetsQuery = supabase.from("content_assets").select("id, storage_path");

  const [plansResult, planStepsResult, assignmentStepsResult, contentAssetsResult] = await Promise.all([
    plansQuery,
    planStepsQuery,
    supabase.from("plan_assignment_steps").select("*").in("assignment_id", assignmentIds),
    contentAssetsQuery,
  ]);
  const planSteps = (planStepsResult.data ?? []) as DbPlanStep[];
  const assignmentSteps = (assignmentStepsResult.data ?? []) as DbPlanAssignmentStep[];
  const onboardingPlans = (plansResult.data ?? []) as DbOnboardingPlan[];
  const contentUrlByAssetId = new Map(
    ((contentAssetsResult.data ?? []) as Array<{ id: string; storage_path: string }>).map((asset) => [
      asset.id,
      asset.storage_path,
    ]),
  );

  const planStepsByPlan = new Map<string, DbPlanStep[]>();
  for (const step of planSteps) {
    const existing = planStepsByPlan.get(step.plan_id) ?? [];
    existing.push(step);
    planStepsByPlan.set(step.plan_id, existing);
  }

  const assignmentStepsByAssignment = new Map<string, DbPlanAssignmentStep[]>();
  for (const step of assignmentSteps) {
    const existing = assignmentStepsByAssignment.get(step.assignment_id) ?? [];
    existing.push(step);
    assignmentStepsByAssignment.set(step.assignment_id, existing);
  }

  const adHocByAssignment = await fetchAdHocStepsForAssignments(supabase, assignmentIds);

  return assignments.map((assignment) => {
    const template = onboardingPlans.find((plan) => plan.id === assignment.plan_id);
    const templateSteps = planStepsByPlan.get(assignment.plan_id) ?? [];
    const progressSteps = assignmentStepsByAssignment.get(assignment.id) ?? [];

    const unlockedSegmentMax = assignment.unlocked_segment_max ?? 1;

    const steps: PlanStep[] = templateSteps.map((step) => {
      const progress = progressSteps.find((item) => item.plan_step_id === step.id);
      const segmentMeta = parsePlanStepMetadata(step.metadata, step.sort_order);

      return {
        id: step.id,
        assignmentStepId: progress?.id,
        title: step.title,
        description: step.description ?? "",
        type: step.step_type,
        order: step.sort_order,
        status: progress?.status ?? "not_started",
        dueDate: progress?.due_date ?? undefined,
        resourceUrl:
          step.content_url ??
          (step.content_asset_id ? contentUrlByAssetId.get(step.content_asset_id) : undefined) ??
          undefined,
        contentAssetId: step.content_asset_id ?? undefined,
        challengeId: step.challenge_id ?? undefined,
        simulationTemplateId: step.simulation_template_id ?? undefined,
        segmentIndex: segmentMeta.segmentIndex,
        isSegmentGate: segmentMeta.isSegmentGate,
        locked: isStepLockedForSegment(segmentMeta.segmentIndex, unlockedSegmentMax),
      };
    });

    const adHocSteps = adHocByAssignment.get(assignment.id) ?? [];

    return {
      id: assignment.id,
      userId: assignment.user_id,
      mentorId: assignment.mentor_id,
      name: template?.name ?? "Onboarding plan",
      startDate: assignment.start_date,
      targetCompletion: assignment.target_completion ?? "",
      status: assignment.status,
      progress: Number(assignment.progress_percent),
      unlockedSegmentMax,
      steps: [...steps, ...adHocSteps],
    };
  });
}
