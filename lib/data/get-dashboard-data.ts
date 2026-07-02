import { createClient } from "@/lib/supabase/server";
import { getDemoDashboardData, getSubtree } from "@/lib/demo-data";
import type {
  ActivityLog,
  Challenge,
  ChallengeSubmission,
  CoachingCard,
  Competency,
  DashboardData,
  Notification,
  PlanStep,
  Profile,
  SimulationAssignment,
  UserPlan,
} from "@/lib/types";
import type { Database, Json } from "@/lib/database.types";

export type DataSource = "supabase" | "demo";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];
type DbPlanStep = Database["public"]["Tables"]["plan_steps"]["Row"];
type DbPlanAssignment = Database["public"]["Tables"]["plan_assignments"]["Row"];
type DbPlanAssignmentStep = Database["public"]["Tables"]["plan_assignment_steps"]["Row"];
type DbOnboardingPlan = Database["public"]["Tables"]["onboarding_plans"]["Row"];
type DbChallengeSubmission = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type DbSimulationAssignment = Database["public"]["Tables"]["simulation_assignments"]["Row"];
type DbCompetency = Database["public"]["Tables"]["competencies"]["Row"];
type DbActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

function mapProfile(row: DbProfile): Profile {
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

function mapChallenge(row: DbChallenge): Challenge {
  const successCriteria = Array.isArray(row.success_criteria)
    ? (row.success_criteria as string[])
    : [];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    linkedSolutions: row.linked_solutions ?? [],
    successCriteria,
    isAiGenerated: row.is_ai_generated,
    createdBy: row.created_by ?? "system",
  };
}

function parseCoachingCard(row: DbCoachingCard): CoachingCard {
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

function parseTranscript(value: Json): SimulationAssignment["transcript"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is { speaker: "se" | "persona" | "coach"; message: string } =>
        typeof entry === "object" &&
        entry !== null &&
        "speaker" in entry &&
        "message" in entry &&
        (entry.speaker === "se" || entry.speaker === "persona" || entry.speaker === "coach") &&
        typeof entry.message === "string",
    )
    .map((entry) => ({ speaker: entry.speaker, message: entry.message }));
}

function parseSessionData(
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

  const [
    profilesResult,
    competenciesResult,
    challengesResult,
    submissionsResult,
    simulationsResult,
    coachingCardsResult,
    activityResult,
    notificationsResult,
    plansResult,
    planStepsResult,
    assignmentsResult,
    assignmentStepsResult,
    contentAssetsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("competencies").select("*"),
    supabase.from("challenges").select("*"),
    supabase.from("challenge_submissions").select("*"),
    supabase.from("simulation_assignments").select("*"),
    supabase.from("coaching_cards").select("*"),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("onboarding_plans").select("*"),
    supabase.from("plan_steps").select("*").order("sort_order"),
    supabase.from("plan_assignments").select("*"),
    supabase.from("plan_assignment_steps").select("*"),
    supabase.from("content_assets").select("id, storage_path"),
  ]);

  if (profilesResult.error || !profilesResult.data?.length) {
    return null;
  }

  const profiles = profilesResult.data.map(mapProfile);
  const planSteps = (planStepsResult.data ?? []) as DbPlanStep[];
  const assignments = (assignmentsResult.data ?? []) as DbPlanAssignment[];
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

  const plans: UserPlan[] = assignments.map((assignment) => {
    const template = onboardingPlans.find((plan) => plan.id === assignment.plan_id);
    const templateSteps = planStepsByPlan.get(assignment.plan_id) ?? [];
    const progressSteps = assignmentStepsByAssignment.get(assignment.id) ?? [];

    const steps: PlanStep[] = templateSteps.map((step) => {
      const progress = progressSteps.find((item) => item.plan_step_id === step.id);

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
      };
    });

    return {
      id: assignment.id,
      userId: assignment.user_id,
      mentorId: assignment.mentor_id,
      name: template?.name ?? "Onboarding plan",
      startDate: assignment.start_date,
      targetCompletion: assignment.target_completion ?? "",
      status: assignment.status,
      progress: Number(assignment.progress_percent),
      steps,
    };
  });

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
    transcript: parseTranscript(row.transcript),
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export async function getDashboardData(preferredUserId?: string): Promise<{
  data: DashboardData;
  source: DataSource;
}> {
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
}
