import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { planStepFromRow } from "@/lib/data/fetch-plans-bundle";
import type { PlanStep, UserPlan } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type TrackStageState = "done" | "current" | "upcoming";

export type TrackStage = {
  index: number;
  planId: string;
  name: string;
  description: string;
  state: TrackStageState;
  steps: PlanStep[];
};

export type MenteeTrack = { programName: string; stages: TrackStage[] };

/** Every stage of the program this plan belongs to, with the mentee's progress where they have it. */
export async function fetchMenteeTrack(admin: Db, plan: UserPlan): Promise<MenteeTrack | null> {
  const { data: membership } = await admin
    .from("enablement_program_segments")
    .select("program_id")
    .eq("plan_id", plan.planTemplateId)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: program }, { data: segments }] = await Promise.all([
    admin.from("enablement_programs").select("name").eq("id", membership.program_id).maybeSingle(),
    admin.from("enablement_program_segments").select("segment_index, plan_id").eq("program_id", membership.program_id).order("segment_index"),
  ]);
  const planIds = (segments ?? []).map((row) => row.plan_id);
  if (planIds.length === 0) return null;

  const [{ data: plans }, { data: templateSteps }, { data: assignments }] = await Promise.all([
    admin.from("onboarding_plans").select("id, name, description").in("id", planIds),
    admin.from("plan_steps").select("*").in("plan_id", planIds).order("sort_order"),
    admin.from("plan_assignments").select("id, plan_id, status").eq("user_id", plan.userId).in("plan_id", planIds),
  ]);
  const assignmentIds = (assignments ?? []).map((row) => row.id);
  const assetIds = [...new Set((templateSteps ?? []).map((row) => row.content_asset_id).filter((id): id is string => Boolean(id)))];
  const [{ data: progressRows }, { data: assets }] = await Promise.all([
    assignmentIds.length
      ? admin.from("plan_assignment_steps").select("*").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Database["public"]["Tables"]["plan_assignment_steps"]["Row"][] }),
    assetIds.length
      ? admin.from("content_assets").select("id, storage_path").in("id", assetIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string }[] }),
  ]);
  const assetUrls = new Map((assets ?? []).map((row) => [row.id, row.storage_path]));

  const stages = (segments ?? []).map((segment): TrackStage => {
    const stagePlan = (plans ?? []).find((row) => row.id === segment.plan_id);
    const assignment = (assignments ?? []).find((row) => row.plan_id === segment.plan_id);
    const progress = (progressRows ?? []).filter((row) => row.assignment_id === assignment?.id);
    const steps = (templateSteps ?? [])
      .filter((row) => row.plan_id === segment.plan_id)
      .map((row) => planStepFromRow(row, progress.find((item) => item.plan_step_id === row.id), assetUrls, 1));
    const gateApproved = steps.some((step) => step.isSegmentGate && step.status === "reviewed");
    const state: TrackStageState =
      segment.plan_id === plan.planTemplateId && !gateApproved
        ? "current"
        : gateApproved || assignment?.status === "completed"
          ? "done"
          : "upcoming";
    return {
      index: segment.segment_index,
      planId: segment.plan_id,
      name: stagePlan?.name ?? `Stage ${segment.segment_index}`,
      description: stagePlan?.description ?? "",
      state,
      steps,
    };
  });

  return { programName: program?.name ?? "Program", stages };
}
