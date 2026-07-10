import { cache } from "react";
import { cookies } from "next/headers";
import { getDemoDashboardData, getSubtree } from "@/lib/demo-data";
import { getAccessTier } from "@/lib/auth/rbac";
import {
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import {
  mapChallenge,
  mapProfile,
  parseCoachingCard,
  parseSessionData,
} from "@/lib/data/get-dashboard-data";
import type { DataSource } from "@/lib/data/get-dashboard-data";
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

type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];
type DbChallengeSubmission = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type DbSimulationAssignment = Database["public"]["Tables"]["simulation_assignments"]["Row"];
type DbCompetency = Database["public"]["Tables"]["competencies"]["Row"];
type DbActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

async function resolveOrgUserIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
): Promise<string[]> {
  const { data: subtree } = await supabase.rpc("get_profile_subtree", { root_profile_id: userId });
  return (subtree ?? []).map((row) => row.id);
}

async function fetchSupabaseManagerPageDataForTenant(
  tenantId: string,
  userId: string,
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
  const seProfiles = profiles.filter((profile) => getAccessTier(profile.role) === "se");
  const orgIds = seProfiles.map((profile) => profile.id);
  const scopedUserIds = orgIds.length > 0 ? orgIds : [];

  const [
    competenciesResult,
    challengesResult,
    submissionsResult,
    simulationsResult,
    coachingCardsResult,
    activityResult,
    plans,
  ] = await Promise.all([
    admin.from("competencies").select("id, name, category, description, rubric, created_at").eq("tenant_id", tenantId),
    admin
      .from("challenges")
      .select(
        "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      )
      .eq("tenant_id", tenantId),
    scopedUserIds.length > 0
      ? admin
          .from("challenge_submissions")
          .select(
            "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
          )
          .in("user_id", scopedUserIds)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      : Promise.resolve({ data: [], error: null }),
    scopedUserIds.length > 0
      ? admin
          .from("simulation_assignments")
          .select(
            "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
          )
          .in("assigned_to", scopedUserIds)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
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
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    scopedUserIds.length > 0
      ? admin
          .from("activity_logs")
          .select("id, user_id, event_type, title, metadata, created_at")
          .in("user_id", scopedUserIds)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
          .order("created_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [], error: null }),
    fetchPlansForUsers(admin, scopedUserIds, tenantId),
  ]);

  const myOrg = seProfiles;

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

  const simulations: SimulationAssignment[] = ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map((row) => ({
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
  }));

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

  return {
    currentUser,
    myOrg,
    profiles,
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

async function fetchSupabaseManagerPageData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role: Profile["role"]; tenant_id: string | null } | null)?.role ?? "basic_se";
  const profileTenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
  const cookieStore = await cookies();
  const access = resolveEffectiveAccess(
    role,
    profileTenantId,
    cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );

  if (access.isShadowing && access.tenantId) {
    return fetchSupabaseManagerPageDataForTenant(access.tenantId, user.id);
  }

  const orgIds = await resolveOrgUserIds(supabase, user.id);
  const scopedUserIds = orgIds.length > 0 ? orgIds : [user.id];

  const [
    currentProfileResult,
    orgProfilesResult,
    mentorProfilesResult,
    competenciesResult,
    challengesResult,
    submissionsResult,
    simulationsResult,
    coachingCardsResult,
    activityResult,
    notificationsResult,
    plans,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    orgIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
          .in("id", orgIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .in("role", ["manager", "mentor", "director", "admin"]),
    supabase.from("competencies").select("id, name, category, description"),
    supabase
      .from("challenges")
      .select(
        "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      ),
    orgIds.length > 0
      ? supabase
          .from("challenge_submissions")
          .select(
            "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
          )
          .in("user_id", orgIds)
      : Promise.resolve({ data: [], error: null }),
    orgIds.length > 0
      ? supabase
          .from("simulation_assignments")
          .select(
            "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
          )
          .in("assigned_to", orgIds)
      : Promise.resolve({ data: [], error: null }),
    orgIds.length > 0
      ? supabase
          .from("coaching_cards")
          .select(
            "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
          )
          .in("user_id", orgIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    orgIds.length > 0
      ? supabase
          .from("activity_logs")
          .select("id, user_id, event_type, title, metadata, created_at")
          .in("user_id", orgIds)
          .order("created_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    fetchPlansForUsers(supabase, scopedUserIds),
  ]);

  if (currentProfileResult.error || !currentProfileResult.data) {
    return null;
  }

  const profileById = new Map<string, Profile>();
  profileById.set(currentProfileResult.data.id, mapProfile(currentProfileResult.data));
  for (const row of orgProfilesResult.data ?? []) {
    profileById.set(row.id, mapProfile(row));
  }
  for (const row of mentorProfilesResult.data ?? []) {
    profileById.set(row.id, mapProfile(row));
  }

  const profiles = [...profileById.values()];
  const currentUser = mapProfile(currentProfileResult.data);
  const myOrg = orgIds.length > 0 ? profiles.filter((profile) => orgIds.includes(profile.id)) : getSubtree(currentUser.id, profiles);

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

  const simulations: SimulationAssignment[] = ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map((row) => ({
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
  }));

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

  return {
    currentUser,
    myOrg,
    profiles,
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

export const getManagerPageData = cache(async (): Promise<{ data: DashboardData; source: DataSource }> => {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  try {
    const live = await fetchSupabaseManagerPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  if (user && supabase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const currentUser = mapProfile(profile);
      return {
        data: {
          currentUser,
          myOrg: [],
          profiles: [currentUser],
          plans: [],
          challenges: [],
          submissions: [],
          simulations: [],
          coachingCards: [],
          activity: [],
          competencies: [],
          notifications: [],
        },
        source: "supabase",
      };
    }
  }

  return { data: getDemoDashboardData(), source: "demo" };
});
