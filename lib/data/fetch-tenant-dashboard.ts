import { getSubtree } from "@/lib/demo-data";
import type { DashboardScope } from "@/lib/auth/tenant-context";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import {
  mapChallenge,
  mapProfile,
  parseCoachingCard,
  parseSessionData,
} from "@/lib/data/get-dashboard-data";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createClient } from "@/lib/supabase/server";
import { uniqueIds, uniqueProfiles } from "@/lib/utils";
import type {
  ActivityLog,
  Challenge,
  ChallengeSubmission,
  CoachingCard,
  Competency,
  DashboardData,
  Notification,
  Profile,
  SimulationAssignment,
} from "@/lib/types";
import type { Database } from "@/lib/database.types";
import type { ProfileRole } from "@/lib/types";

type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];
type DbChallengeSubmission = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type DbSimulationAssignment = Database["public"]["Tables"]["simulation_assignments"]["Row"];
type DbCompetency = Database["public"]["Tables"]["competencies"]["Row"];
type DbActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

async function resolveScopedUserIds(
  tenantId: string,
  userId: string,
  scope: DashboardScope,
  tenantProfiles: Profile[],
): Promise<string[]> {
  if (scope === "tenant") {
    return tenantProfiles.map((profile) => profile.id);
  }

  if (scope === "org") {
    const supabase = await createClient();
    if (!supabase) {
      return [userId];
    }
    const { data: subtree } = await supabase.rpc("get_profile_subtree", { root_profile_id: userId });
    const orgIds = new Set((subtree ?? []).map((row) => row.id));
    return tenantProfiles.filter((profile) => orgIds.has(profile.id)).map((profile) => profile.id);
  }

  return [userId];
}

export async function fetchTenantDashboard(
  tenantId: string,
  userId: string,
  scope: DashboardScope,
  role: ProfileRole,
): Promise<DashboardData | null> {
  const admin = getTenantAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase) {
    return null;
  }

  const [currentProfileResult, tenantProfilesResult, notificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (currentProfileResult.error || !currentProfileResult.data) {
    return null;
  }

  const currentUser = mapProfile(currentProfileResult.data);
  const profiles = (tenantProfilesResult.data ?? []).map(mapProfile);
  const scopedUserIds = await resolveScopedUserIds(tenantId, userId, scope, profiles);

  const [
    competenciesResult,
    challengesResult,
    submissionsResult,
    simulationsResult,
    coachingCardsResult,
    activityResult,
    plans,
  ] = await Promise.all([
    admin.from("competencies").select("id, name, category, description").eq("tenant_id", tenantId),
    admin
      .from("challenges")
      .select(
        "id, title, description, steps, success_criteria, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      )
      .eq("tenant_id", tenantId),
    scopedUserIds.length > 0
      ? admin
          .from("challenge_submissions")
          .select(
            "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
          )
          .eq("tenant_id", tenantId)
          .in("user_id", scopedUserIds)
      : Promise.resolve({ data: [], error: null }),
    scopedUserIds.length > 0
      ? admin
          .from("simulation_assignments")
          .select(
            "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
          )
          .eq("tenant_id", tenantId)
          .in("assigned_to", scopedUserIds)
      : Promise.resolve({ data: [], error: null }),
    scopedUserIds.length > 0
      ? admin
          .from("coaching_cards")
          .select(
            "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
          )
          .in("user_id", scopedUserIds)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
          .order("created_at", { ascending: false })
          .limit(400)
      : Promise.resolve({ data: [], error: null }),
    scopedUserIds.length > 0
      ? admin
          .from("activity_logs")
          .select("id, user_id, event_type, title, metadata, created_at")
          .in("user_id", scopedUserIds)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
          .order("created_at", { ascending: false })
          .limit(150)
      : Promise.resolve({ data: [], error: null }),
    fetchPlansForUsers(admin, scopedUserIds, tenantId),
  ]);

  const visibleProfiles =
    scope === "tenant"
      ? profiles
      : scope === "org"
        ? profiles.filter((profile) => scopedUserIds.includes(profile.id))
        : profiles.filter((profile) => profile.id === userId || profile.id === currentUser.managerId);

  const myOrg = uniqueProfiles(
    scope === "org"
      ? profiles.filter((profile) => scopedUserIds.includes(profile.id) && profile.id !== userId)
      : scope === "tenant"
        ? getSubtree(userId, profiles)
        : [],
  );

  const challenges: Challenge[] = ((challengesResult.data ?? []) as DbChallenge[]).map(mapChallenge);
  const submissions: ChallengeSubmission[] = ((submissionsResult.data ?? []) as DbChallengeSubmission[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    challengeId: row.challenge_id,
    status: row.status,
    reflectionText: row.reflection_text ?? "",
    managerGrade: row.manager_grade,
    managerFeedback: row.manager_feedback,
    aiSuggestedScore: row.ai_suggested_score,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  }));

  const simulations: SimulationAssignment[] = ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map(
    (row) => ({
      id: row.id,
      assignedTo: row.assigned_to,
      assignedBy: row.assigned_by ?? "system",
      persona: row.persona,
      vertical: row.vertical,
      solutionFocus: row.solution_focus,
      difficulty: row.difficulty,
      status: row.status,
      transcript: [],
      templateId: row.template_id,
      ...parseSessionData(row.session_data),
    }),
  );

  const coachingCards = ((coachingCardsResult.data ?? []) as DbCoachingCard[]).map(parseCoachingCard);
  const competencies: Competency[] = ((competenciesResult.data ?? []) as DbCompetency[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
  }));

  const activity: ActivityLog[] = ((activityResult.data ?? []) as DbActivityLog[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as ActivityLog["eventType"],
    title: row.title,
    metadata: (row.metadata as Record<string, string | number | boolean | null>) ?? {},
    createdAt: row.created_at,
  }));

  const notifications: Notification[] = ((notificationsResult.data ?? []) as DbNotification[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  void role;

  return {
    currentUser,
    myOrg,
    profiles: visibleProfiles.length > 0 ? visibleProfiles : [currentUser],
    plans,
    challenges,
    submissions,
    simulations,
    coachingCards,
    activity,
    competencies,
    notifications,
  };
}
