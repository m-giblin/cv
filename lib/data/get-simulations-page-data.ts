import { cache } from "react";
import { cookies } from "next/headers";
import { getDemoDashboardData } from "@/lib/demo-data";
import { getAuthenticatedUser } from "@/lib/data/get-authenticated-user";
import { mapChallengeListItem } from "@/lib/data/get-challenges-page-data";
import { mapProfile, parseCoachingCard, parseSessionData } from "@/lib/data/get-dashboard-data";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import { createClient } from "@/lib/supabase/server";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import {
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import type {
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
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

async function resolveOrgUserIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
): Promise<string[]> {
  const { data: subtree } = await supabase.rpc("get_profile_subtree", { root_profile_id: userId });
  return (subtree ?? []).map((row) => row.id);
}

export type SimulationsPageData = Pick<
  DashboardData,
  "currentUser" | "notifications" | "simulations" | "coachingCards" | "submissions" | "profiles" | "challenges" | "competencies"
>;

function mapSubmission(row: DbChallengeSubmission): ChallengeSubmission {
  return {
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
  };
}

function mapSimulation(row: DbSimulationAssignment): SimulationAssignment {
  return {
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
  };
}

async function fetchSupabaseSimulationsPageData(): Promise<SimulationsPageData | null> {
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

  const [
    profileResult,
    notificationsResult,
    simulationsResult,
    coachingCardsResult,
    submissionsResult,
    challengesResult,
    competenciesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("simulation_assignments")
      .select(
        "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
      )
      .eq("assigned_to", user.id),
    supabase
      .from("coaching_cards")
      .select(
        "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("challenge_submissions")
      .select(
        "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
      )
      .eq("user_id", user.id),
    supabase
      .from("challenges")
      .select(
        "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      )
      .order("title"),
    supabase.from("competencies").select("id, name, category, description"),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const currentUser = mapProfile(profileResult.data);
  const notifications: Notification[] = ((notificationsResult.data ?? []) as DbNotification[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  const simulations = ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map(mapSimulation);
  const coachingCards = ((coachingCardsResult.data ?? []) as DbCoachingCard[]).map(parseCoachingCard);
  const submissions = ((submissionsResult.data ?? []) as DbChallengeSubmission[]).map(mapSubmission);
  const challenges: Challenge[] = ((challengesResult.data ?? []) as DbChallenge[]).map(mapChallengeListItem);
  const competencies: Competency[] = ((competenciesResult.data ?? []) as DbCompetency[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
  }));

  return {
    currentUser,
    notifications,
    simulations,
    coachingCards,
    submissions,
    profiles: [currentUser],
    challenges,
    competencies,
  };
}

export const getSimulationsPageData = cache(async (): Promise<{ data: SimulationsPageData; source: DataSource }> => {
  const authenticatedUser = await getAuthenticatedUser();

  try {
    const live = await fetchSupabaseSimulationsPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  if (authenticatedUser) {
    const supabase = await createClient();
    const { data: profile } = supabase
      ? await supabase
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
          .eq("id", authenticatedUser.id)
          .maybeSingle()
      : { data: null };

    if (profile) {
      const currentUser = mapProfile(profile);
      return {
        data: {
          currentUser,
          notifications: [],
          simulations: [],
          coachingCards: [],
          submissions: [],
          profiles: [currentUser],
          challenges: [],
          competencies: [],
        },
        source: "supabase",
      };
    }
  }

  const demo = getDemoDashboardData();
  return {
    data: {
      currentUser: demo.currentUser,
      notifications: demo.notifications,
      simulations: demo.simulations.filter((item) => item.assignedTo === demo.currentUser.id),
      coachingCards: demo.coachingCards.filter((card) => card.userId === demo.currentUser.id),
      submissions: demo.submissions.filter((item) => item.userId === demo.currentUser.id),
      profiles: [demo.currentUser],
      challenges: demo.challenges,
      competencies: demo.competencies,
    },
    source: "demo",
  };
});

/** Manager/admin preview needs org-wide assignments and coaching history. */
export async function getSimulationsPageDataForTier(tier: "se" | "manager" | "admin") {
  const result = await getSimulationsPageData();
  if (tier === "se" || result.source === "demo") {
    return result;
  }

  const supabase = await createClient();
  if (!supabase) {
    return result;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return result;
  }

  const orgIds = tier === "manager" ? await resolveOrgUserIds(supabase, user.id) : [];
  const scopedUserIds = tier === "manager" ? (orgIds.length > 0 ? orgIds : [user.id]) : null;

  if (tier === "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    const cookieStore = await cookies();
    const access = resolveEffectiveAccess(
      (profile as { role: Profile["role"] } | null)?.role ?? "basic_se",
      (profile as { tenant_id: string | null } | null)?.tenant_id ?? null,
      cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
      cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
    );
    const tenantId = access.tenantId ?? (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
    if (!tenantId) {
      return result;
    }

    const admin = getTenantAdminClient();
    if (!admin) {
      return result;
    }

    const [orgProfilesResult, simulationsResult, coachingCardsResult, submissionsResult, challengesResult, competenciesResult] =
      await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
        .eq("tenant_id", tenantId),
      admin
        .from("simulation_assignments")
        .select(
          "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
        )
        .eq("tenant_id", tenantId),
      admin
        .from("coaching_cards")
        .select(
          "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(300),
      admin
        .from("challenge_submissions")
        .select(
          "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
        )
        .eq("tenant_id", tenantId),
      admin
        .from("challenges")
        .select(
          "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
        )
        .eq("tenant_id", tenantId)
        .order("title"),
      admin.from("competencies").select("id, name, category, description").eq("tenant_id", tenantId),
    ]);

    const profiles: Profile[] = ((orgProfilesResult.data ?? []) as Database["public"]["Tables"]["profiles"]["Row"][]).map(
      mapProfile,
    );

    return {
      ...result,
      data: {
        ...result.data,
        profiles: profiles.length > 0 ? profiles : result.data.profiles,
        simulations: ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map(mapSimulation),
        coachingCards: ((coachingCardsResult.data ?? []) as DbCoachingCard[]).map(parseCoachingCard),
        submissions: ((submissionsResult.data ?? []) as DbChallengeSubmission[]).map(mapSubmission),
        challenges: ((challengesResult.data ?? []) as DbChallenge[]).map(mapChallengeListItem),
        competencies: ((competenciesResult.data ?? []) as DbCompetency[]).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description ?? "",
        })),
      },
    };
  }

  const [orgProfilesResult, simulationsResult, coachingCardsResult] = await Promise.all([
    scopedUserIds
      ? supabase
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
          .in("id", scopedUserIds)
      : supabase
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, avatar_url, created_at"),
    scopedUserIds
      ? supabase
          .from("simulation_assignments")
          .select(
            "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
          )
          .in("assigned_to", scopedUserIds)
      : supabase
          .from("simulation_assignments")
          .select(
            "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
          ),
    scopedUserIds
      ? supabase
          .from("coaching_cards")
          .select(
            "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
          )
          .in("user_id", scopedUserIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : supabase
          .from("coaching_cards")
          .select(
            "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
          )
          .order("created_at", { ascending: false })
          .limit(300),
  ]);

  const profiles: Profile[] = ((orgProfilesResult.data ?? []) as Database["public"]["Tables"]["profiles"]["Row"][]).map(
    mapProfile,
  );

  return {
    ...result,
    data: {
      ...result.data,
      profiles: profiles.length > 0 ? profiles : result.data.profiles,
      simulations: ((simulationsResult.data ?? []) as DbSimulationAssignment[]).map(mapSimulation),
      coachingCards: ((coachingCardsResult.data ?? []) as DbCoachingCard[]).map(parseCoachingCard),
      submissions: [],
      challenges: [],
      competencies: [],
    },
  };
}

export function simulationsPageDataAsDashboardSlice(data: SimulationsPageData): DashboardData {
  return {
    currentUser: data.currentUser,
    myOrg: [],
    profiles: data.profiles,
    plans: [],
    challenges: data.challenges,
    submissions: data.submissions,
    simulations: data.simulations,
    coachingCards: data.coachingCards,
    activity: [],
    competencies: data.competencies,
    notifications: data.notifications,
  };
}
