import { SupabaseClient } from "@supabase/supabase-js";
import { DevelopmentPlan, GoalQuarterlyReview, DevelopmentGoal } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type DbPlan = Database["public"]["Tables"]["development_plans"]["Row"];
type DbGoal = Database["public"]["Tables"]["development_goals"]["Row"];
type DbReview = Database["public"]["Tables"]["goal_quarterly_reviews"]["Row"];

function mapReview(row: DbReview): GoalQuarterlyReview {
  return {
    id: row.id,
    goalId: row.goal_id,
    quarter: row.quarter as GoalQuarterlyReview["quarter"],
    year: row.year,
    dueDate: row.due_date,
    status: row.status,
    seEvidence: row.se_evidence,
    seEvidenceUrl: row.se_evidence_url,
    managerComments: row.manager_comments,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

function mapGoal(row: DbGoal, reviews: DbReview[]): DevelopmentGoal {
  return {
    id: row.id,
    planId: row.plan_id,
    competencyId: row.competency_id,
    title: row.title,
    description: row.description,
    evidenceType: row.evidence_type as DevelopmentGoal["evidenceType"],
    sortOrder: row.sort_order,
    overallStatus: row.overall_status,
    quarterlyReviews: reviews
      .filter((review) => review.goal_id === row.id)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map(mapReview),
  };
}

function mapPlan(row: DbPlan, goals: DevelopmentGoal[]): DevelopmentPlan {
  return {
    id: row.id,
    userId: row.user_id,
    managerId: row.manager_id,
    year: row.year,
    status: row.status as DevelopmentPlan["status"],
    goals,
    createdAt: row.created_at,
  };
}

export async function fetchDevelopmentPlans(
  userIds?: string[],
  client?: SupabaseClient<Database>,
): Promise<DevelopmentPlan[]> {
  const supabase = client ?? (await createClient());

  if (!supabase) {
    return [];
  }

  let planQuery = supabase
    .from("development_plans")
    .select("*")
    .eq("status", "active")
    .order("year", { ascending: false });

  if (userIds?.length) {
    planQuery = planQuery.in("user_id", userIds);
  }

  const { data: plans, error: plansError } = await planQuery;

  if (plansError || !plans?.length) {
    return [];
  }

  const planIds = plans.map((plan) => plan.id);

  const { data: goalRows } = await supabase
    .from("development_goals")
    .select("*")
    .in("plan_id", planIds)
    .order("sort_order");

  const goals = (goalRows ?? []) as DbGoal[];
  const goalIds = goals.map((goal) => goal.id);

  const { data: reviewRows } =
    goalIds.length > 0
      ? await supabase.from("goal_quarterly_reviews").select("*").in("goal_id", goalIds)
      : { data: [] as DbReview[] };

  const reviews = (reviewRows ?? []) as DbReview[];

  return (plans as DbPlan[]).map((plan) => {
    const planGoals = goals.filter((goal) => goal.plan_id === plan.id);
    return mapPlan(
      plan,
      planGoals.map((goal) => mapGoal(goal, reviews)),
    );
  });
}

export async function fetchDevelopmentPlanForUser(userId: string, year?: number): Promise<DevelopmentPlan | null> {
  const targetYear = year ?? new Date().getFullYear();
  const plans = await fetchDevelopmentPlans([userId]);
  return (
    plans.find((plan) => plan.userId === userId && plan.year === targetYear) ??
    plans.find((plan) => plan.userId === userId) ??
    null
  );
}
