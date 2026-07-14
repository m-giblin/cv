import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type UnifiedProgramView = {
  programId: string;
  programName: string;
  assignments: Array<{
    assignmentId: string;
    planName: string;
    segmentIndex: number;
    progress: number;
    unlockedSegmentMax: number;
  }>;
  overallProgress: number;
  currentSegment: number;
};

export async function loadUnifiedProgramForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UnifiedProgramView | null> {
  const { data: program } = await supabase
    .from("enablement_programs")
    .select("id, name, segment_count")
    .eq("name", "120-Day SE Mastery")
    .maybeSingle();

  if (!program) return null;

  const { data: segments } = await supabase
    .from("enablement_program_segments")
    .select("segment_index, plan_id")
    .eq("program_id", program.id)
    .order("segment_index");

  if (!segments?.length) return null;

  const planIds = segments.map((s) => s.plan_id);
  const { data: planNames } = await supabase
    .from("onboarding_plans")
    .select("id, name")
    .in("id", planIds);

  const nameByPlanId = new Map((planNames ?? []).map((p) => [p.id, p.name]));
  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id, plan_id, progress_percent, unlocked_segment_max")
    .eq("user_id", userId)
    .in("plan_id", planIds)
    .neq("status", "completed");

  if (!assignments?.length) return null;

  const assignmentByPlan = new Map(assignments.map((a) => [a.plan_id, a]));

  const rows = segments
    .map((seg) => {
      const assignment = assignmentByPlan.get(seg.plan_id);
      if (!assignment) return null;
      const planName = nameByPlanId.get(seg.plan_id);
      return {
        assignmentId: assignment.id,
        planName: planName ?? `Segment ${seg.segment_index}`,
        segmentIndex: seg.segment_index,
        progress: Number(assignment.progress_percent),
        unlockedSegmentMax: assignment.unlocked_segment_max ?? 1,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return null;

  const overallProgress = Math.round(rows.reduce((t, r) => t + r.progress, 0) / rows.length);
  const currentSegment = Math.max(...rows.map((r) => r.unlockedSegmentMax));

  return {
    programId: program.id,
    programName: program.name,
    assignments: rows,
    overallProgress,
    currentSegment,
  };
}
