import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { fetchMenteeTrack, type MenteeTrack } from "@/lib/mentoring/fetch-mentee-track";
import { fetchStepEvidence } from "@/lib/mentoring/fetch-step-evidence";
import { fetchStepResources } from "@/lib/mentoring/fetch-step-resources";
import type { StepResource } from "@/lib/mentoring/mentor-guide";
import { loadMentorRecords } from "@/lib/mentoring/mentor-records";
import { EMPTY_RECORDS, type MenteeRecords, type StepEvidence } from "@/lib/mentoring/mentor-records-model";
import type { Profile, UserPlan } from "@/lib/types";

export type MenteeAssignment = {
  plan: UserPlan;
  profile: Profile;
  pendingMentorReviews: number;
  awaitingManagerSignoff: number;
  /** Summaries of the content each step links to, keyed by resourceKeyForStep. */
  resources: Record<string, StepResource>;
  /** The mentee's own work for each step, keyed by plan step id. */
  evidence: Record<string, StepEvidence[]>;
  records: MenteeRecords;
  track: MenteeTrack | null;
};

export async function fetchMenteeAssignments(
  supabase: SupabaseClient<Database>,
  mentorId: string,
  profiles: Profile[],
  tenantId?: string | null,
): Promise<MenteeAssignment[]> {
  let query = supabase
    .from("plan_assignments")
    .select("id, user_id, mentor_id, status")
    .eq("mentor_id", mentorId)
    .neq("status", "completed");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: assignments } = await query;
  if (!assignments?.length) {
    return [];
  }

  const userIds = [...new Set(assignments.map((row) => row.user_id))];
  const plans = await fetchPlansForUsers(supabase, userIds, tenantId);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
  const mentored = plans.filter((plan) => assignmentIds.has(plan.id));
  const [records, tracks, evidence] = await Promise.all([
    loadMentorRecords(supabase, userIds),
    Promise.all(mentored.map((plan) => fetchMenteeTrack(supabase, plan))),
    Promise.all(mentored.map((plan) => fetchStepEvidence(supabase, plan.userId, plan.steps))),
  ]);
  const trackSteps = tracks.flatMap((track) => track?.stages.flatMap((stage) => stage.steps) ?? []);
  const resources = await fetchStepResources(supabase, [...mentored.flatMap((plan) => plan.steps), ...trackSteps]);

  return mentored
    .map((plan, index): MenteeAssignment | null => {
      const profile = profileById.get(plan.userId);
      if (!profile) return null;

      const pendingMentorReviews = plan.steps.filter(
        (step) => step.type === "mentor_review" && step.status === "submitted",
      ).length;
      const awaitingManagerSignoff = plan.steps.filter(
        (step) => step.status === "under_review",
      ).length;

      return {
        plan,
        profile,
        pendingMentorReviews,
        awaitingManagerSignoff,
        resources,
        evidence: evidence[index] ?? {},
        records: records.get(plan.userId) ?? EMPTY_RECORDS,
        track: tracks[index] ?? null,
      };
    })
    .filter((item): item is MenteeAssignment => item !== null)
    .sort((a, b) => a.profile.fullName.localeCompare(b.profile.fullName));
}

export async function fetchMentorCoachingNotesForManager(
  supabase: SupabaseClient<Database>,
  seUserIds: string[],
): Promise<Record<string, { mentorName: string; notes: string; updatedAt: string }>> {
  if (seUserIds.length === 0) {
    return {};
  }

  const { data: rows } = await supabase
    .from("mentor_coaching_notes")
    .select("se_user_id, notes, updated_at, mentor_id")
    .in("se_user_id", seUserIds);

  if (!rows?.length) {
    return {};
  }

  const mentorIds = [...new Set(rows.map((row) => row.mentor_id))];
  const { data: mentors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", mentorIds);

  const mentorNameById = new Map((mentors ?? []).map((m) => [m.id, m.full_name]));

  const result: Record<string, { mentorName: string; notes: string; updatedAt: string }> = {};
  for (const row of rows) {
    if (!row.notes?.trim()) continue;
    result[row.se_user_id] = {
      mentorName: mentorNameById.get(row.mentor_id) ?? "Mentor",
      notes: row.notes,
      updatedAt: row.updated_at,
    };
  }
  return result;
}
