import { cache } from "react";
import { getDemoDashboardData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
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
async function fetchSupabaseDashboardPageData(): Promise<DashboardData | null> {
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
    competenciesResult,
    challengesResult,
    submissionsResult,
    simulationsResult,
    coachingCardsResult,
    activityResult,
    plans,
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
    supabase.from("competencies").select("id, name, category, description"),
    supabase
      .from("challenges")
      .select(
        "id, title, description, difficulty, estimated_minutes, linked_solutions, target_level, is_ai_generated, created_by, ai_metadata",
      ),
    supabase
      .from("challenge_submissions")
      .select(
        "id, user_id, challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, submitted_at, reviewed_at",
      )
      .eq("user_id", user.id),
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
      .from("activity_logs")
      .select("id, user_id, event_type, title, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    fetchPlansForUsers(supabase, [user.id]),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const currentUser = mapProfile(profileResult.data);
  const profiles: Profile[] = [currentUser];

  if (currentUser.managerId) {
    const { data: managerProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .eq("id", currentUser.managerId)
      .maybeSingle();
    if (managerProfile) {
      profiles.push(mapProfile(managerProfile));
    }
  }

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
    myOrg: [],
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

export const getDashboardPageData = cache(async (): Promise<{ data: DashboardData; source: DataSource }> => {
  try {
    const live = await fetchSupabaseDashboardPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  const demo = getDemoDashboardData();
  return { data: demo, source: "demo" };
});
