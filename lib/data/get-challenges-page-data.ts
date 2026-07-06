import { cache } from "react";
import { getDemoDashboardData } from "@/lib/demo-data";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { createClient } from "@/lib/supabase/server";
import type {
  Challenge,
  ChallengeSubmission,
  CoachingCard,
  Competency,
  DashboardData,
  Notification,
  Profile,
  UserPlan,
} from "@/lib/types";
import type { Database, Json } from "@/lib/database.types";
import type { DataSource } from "@/lib/data/get-dashboard-data";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbChallengeSubmission = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];
type DbCompetency = Database["public"]["Tables"]["competencies"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

function mapProfile(
  row: Pick<DbProfile, "id" | "email" | "full_name" | "role" | "level" | "manager_id" | "avatar_url" | "created_at">,
): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    level: row.level,
    managerId: row.manager_id,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

function competencyNamesFromMetadata(row: DbChallenge): string[] {
  const aiMetadata =
    row.ai_metadata && typeof row.ai_metadata === "object" && !Array.isArray(row.ai_metadata)
      ? (row.ai_metadata as { competencyNames?: string[]; linkedResources?: string[] })
      : null;
  return Array.isArray(aiMetadata?.competencyNames) ? aiMetadata.competencyNames : [];
}

/** List row — steps and success criteria load on demand via /api/challenges/[id]. */
export function mapChallengeListItem(row: DbChallenge): Challenge {
  const aiMetadata =
    row.ai_metadata && typeof row.ai_metadata === "object" && !Array.isArray(row.ai_metadata)
      ? (row.ai_metadata as { linkedResources?: string[] })
      : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    steps: [],
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    linkedSolutions: row.linked_solutions ?? [],
    linkedResources: aiMetadata?.linkedResources ?? [],
    successCriteria: [],
    targetLevel: row.target_level ?? null,
    isAiGenerated: row.is_ai_generated,
    createdBy: row.created_by ?? "system",
    competencyNames: competencyNamesFromMetadata(row),
  };
}

export function mapChallengeDetail(row: DbChallenge): Challenge {
  const successCriteria = Array.isArray(row.success_criteria) ? (row.success_criteria as string[]) : [];
  const steps = Array.isArray(row.steps) ? (row.steps as string[]) : [];
  const list = mapChallengeListItem(row);
  return {
    ...list,
    steps,
    successCriteria,
  };
}

function parseCoachingCardLite(row: DbCoachingCard): CoachingCard {
  const output =
    row.structured_output && typeof row.structured_output === "object" && !Array.isArray(row.structured_output)
      ? (row.structured_output as Record<string, Json | undefined>)
      : {};

  const asStringArray = (value: Json | undefined) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  return {
    id: row.id,
    simulationAssignmentId: row.simulation_assignment_id ?? "",
    userId: row.user_id,
    strengths: asStringArray(output.strengths),
    gaps: asStringArray(output.gaps),
    recommendedImprovements: [],
    score: 0,
    linkedCompetencies: [],
    managerSummary: "",
    seReflection: null,
    isPractice: Boolean((row as { is_practice?: boolean }).is_practice),
    managerReviewStatus: row.manager_review_status,
    managerComments: null,
    managerGrade: null,
    sentToManagerAt: row.created_at,
    reviewedAt: null,
  };
}

export type ChallengesPageData = Pick<
  DashboardData,
  "currentUser" | "challenges" | "submissions" | "plans" | "competencies" | "coachingCards" | "notifications"
>;

async function fetchSupabaseChallengesPageData(): Promise<ChallengesPageData | null> {
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
    challengesResult,
    submissionsResult,
    competenciesResult,
    coachingCardsResult,
    notificationsResult,
    plans,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("challenges")
      .select(
        "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      )
      .order("title"),
    supabase
      .from("challenge_submissions")
      .select(
        "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
      )
      .eq("user_id", user.id),
    supabase.from("competencies").select("id, name, category, description"),
    supabase
      .from("coaching_cards")
      .select("id, user_id, simulation_assignment_id, structured_output, manager_review_status, created_at, is_practice")
      .eq("user_id", user.id)
      .eq("is_practice", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    fetchPlansForUsers(supabase, [user.id]),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const currentUser = mapProfile(profileResult.data);
  const challenges = ((challengesResult.data ?? []) as DbChallenge[]).map(mapChallengeListItem);
  const submissions: ChallengeSubmission[] = ((submissionsResult.data ?? []) as DbChallengeSubmission[]).map(
    (row) => ({
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
    }),
  );

  const competencies: Competency[] = ((competenciesResult.data ?? []) as DbCompetency[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
  }));

  const coachingCards = ((coachingCardsResult.data ?? []) as DbCoachingCard[]).map(parseCoachingCardLite);

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
    challenges,
    submissions,
    plans,
    competencies,
    coachingCards,
    notifications,
  };
}

export const getChallengesPageData = cache(async (): Promise<{ data: ChallengesPageData; source: DataSource }> => {
  try {
    const live = await fetchSupabaseChallengesPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  const demo = getDemoDashboardData();
  return {
    data: {
      currentUser: demo.currentUser,
      challenges: demo.challenges,
      submissions: demo.submissions.filter((s) => s.userId === demo.currentUser.id),
      plans: demo.plans.filter((p) => p.userId === demo.currentUser.id),
      competencies: demo.competencies,
      coachingCards: demo.coachingCards.filter((c) => c.userId === demo.currentUser.id),
      notifications: demo.notifications,
    },
    source: "demo",
  };
});

/** Manager/admin challenge workspace needs org-wide submissions. */
export async function getChallengesPageDataForTier(tier: "se" | "manager" | "admin") {
  const result = await getChallengesPageData();
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

  let submissionsQuery = supabase
    .from("challenge_submissions")
    .select(
      "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
    );

  if (tier === "manager") {
    const { data: subtree } = await supabase.rpc("get_profile_subtree", { root_profile_id: user.id });
    const orgIds = (subtree ?? []).map((row) => row.id);
    if (orgIds.length === 0) {
      return result;
    }
    submissionsQuery = submissionsQuery.in("user_id", orgIds);
  }

  const { data: submissions } = await submissionsQuery;

  if (!submissions?.length) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      submissions: submissions.map((row) => ({
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
      })),
    },
  };
}

export function challengesPageDataAsDashboardSlice(data: ChallengesPageData): DashboardData {
  return {
    currentUser: data.currentUser,
    myOrg: [],
    profiles: [data.currentUser],
    plans: data.plans,
    challenges: data.challenges,
    submissions: data.submissions,
    simulations: [],
    coachingCards: data.coachingCards,
    activity: [],
    competencies: data.competencies,
    notifications: data.notifications,
  };
}
