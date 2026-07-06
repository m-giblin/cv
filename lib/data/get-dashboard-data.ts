import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchPlansBundle } from "@/lib/data/fetch-plans-bundle";
import { getDemoDashboardData, getSubtree } from "@/lib/demo-data";
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
  UserPlan,
} from "@/lib/types";
import type { Database, Json } from "@/lib/database.types";

export type DataSource = "supabase" | "demo";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];
type DbChallengeSubmission = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type DbSimulationAssignment = Database["public"]["Tables"]["simulation_assignments"]["Row"];
type DbCompetency = Database["public"]["Tables"]["competencies"]["Row"];
type DbActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

export function mapProfile(row: Pick<DbProfile, "id" | "email" | "full_name" | "role" | "level" | "manager_id" | "avatar_url" | "created_at">): Profile {
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

export function mapChallenge(row: DbChallenge): Challenge {
  const successCriteria = Array.isArray(row.success_criteria)
    ? (row.success_criteria as string[])
    : [];
  const steps = Array.isArray(row.steps) ? (row.steps as string[]) : [];
  const aiMetadata =
    row.ai_metadata && typeof row.ai_metadata === "object" && !Array.isArray(row.ai_metadata)
      ? (row.ai_metadata as { linkedResources?: string[]; competencyNames?: string[] })
      : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    steps,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    linkedSolutions: row.linked_solutions ?? [],
    linkedResources: aiMetadata?.linkedResources ?? [],
    successCriteria,
    targetLevel: row.target_level ?? null,
    isAiGenerated: row.is_ai_generated,
    createdBy: row.created_by ?? "system",
    competencyNames: Array.isArray(aiMetadata?.competencyNames) ? aiMetadata.competencyNames : [],
  };
}

export function parseCoachingCard(row: DbCoachingCard): CoachingCard {
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
    recommendedImprovements: asStringArray(output.recommendedImprovements ?? output.recommended_improvements),
    score: typeof output.score === "number" ? output.score : 0,
    linkedCompetencies: asStringArray(output.linkedCompetencies ?? output.linked_competencies),
    managerSummary:
      typeof output.managerSummary === "string"
        ? output.managerSummary
        : typeof output.manager_summary === "string"
          ? output.manager_summary
          : "",
    transcript: typeof output.transcript === "string" ? output.transcript : undefined,
    simulationContext:
      output.simulationContext && typeof output.simulationContext === "object" && !Array.isArray(output.simulationContext)
        ? (output.simulationContext as CoachingCard["simulationContext"])
        : undefined,
    seReflection: row.se_reflection,
    isPractice: Boolean((row as { is_practice?: boolean }).is_practice),
    managerReviewStatus: row.manager_review_status,
    managerComments: row.manager_comments,
    managerGrade: row.manager_grade,
    sentToManagerAt: row.sent_to_manager_at ?? row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function parseSessionData(
  value: Json,
): Pick<
  SimulationAssignment,
  "promptSnapshot" | "aiRoleplay" | "startMessage" | "practiceRoundsRequired" | "practiceRoundsCompleted"
> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const record = value as Record<string, unknown>;

  return {
    promptSnapshot: typeof record.promptSnapshot === "string" ? record.promptSnapshot : undefined,
    aiRoleplay: record.aiRoleplay === true || record.simulationKind === "ai_roleplay",
    startMessage: typeof record.startMessage === "string" ? record.startMessage : undefined,
    practiceRoundsRequired:
      typeof record.practiceRoundsRequired === "number" ? record.practiceRoundsRequired : undefined,
    practiceRoundsCompleted:
      typeof record.practiceRoundsCompleted === "number" ? record.practiceRoundsCompleted : undefined,
  };
}

async function fetchSupabaseDashboard(): Promise<DashboardData | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    profilesResult,
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
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at"),
    supabase.from("competencies").select("id, name, category, description"),
    supabase
      .from("challenges")
      .select(
        "id, title, description, steps, success_criteria, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      ),
    supabase
      .from("challenge_submissions")
      .select(
        "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
      ),
    supabase
      .from("simulation_assignments")
      .select(
        "id, assigned_to, assigned_by, persona, vertical, solution_focus, difficulty, status, template_id, session_data",
      ),
    supabase
      .from("coaching_cards")
      .select(
        "id, simulation_assignment_id, user_id, structured_output, se_reflection, manager_review_status, manager_comments, manager_grade, sent_to_manager_at, reviewed_at, created_at, is_practice",
      )
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("activity_logs")
      .select("id, user_id, event_type, title, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(150),
    user
      ? supabase
          .from("notifications")
          .select("id, user_id, title, body, action_url, read_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
    fetchPlansBundle(supabase),
  ]);

  if (profilesResult.error || !profilesResult.data?.length) {
    return null;
  }

  const profiles = profilesResult.data.map(mapProfile);

  const challenges = ((challengesResult.data ?? []) as DbChallenge[]).map(mapChallenge);
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

  const currentUser =
    (user ? profiles.find((profile) => profile.id === user.id) : profiles[0]) ?? profiles[0];

  return {
    currentUser,
    myOrg: getSubtree(currentUser.id, profiles),
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

export const getDashboardData = cache(async (preferredUserId?: string): Promise<{
  data: DashboardData;
  source: DataSource;
}> => {
  try {
    const live = await fetchSupabaseDashboard();

    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // Fall through to demo data when Supabase is unreachable or RLS blocks reads.
  }

  return {
    data: getDemoDashboardData(preferredUserId),
    source: "demo",
  };
});
