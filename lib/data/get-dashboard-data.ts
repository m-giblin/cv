import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { dashboardScopeForContext, resolveTenantContext } from "@/lib/auth/tenant-context";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";
import { fetchTenantDashboard } from "@/lib/data/fetch-tenant-dashboard";
import { getAuthenticatedUser } from "@/lib/data/get-authenticated-user";
import { getDemoDashboardData } from "@/lib/demo-data";
import type {
  Challenge,
  CoachingCard,
  DashboardData,
  Profile,
  SimulationAssignment,
} from "@/lib/types";
import type { Database, Json } from "@/lib/database.types";

export type DataSource = "supabase" | "demo";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbCoachingCard = Database["public"]["Tables"]["coaching_cards"]["Row"];

export function mapProfile(row: Pick<DbProfile, "id" | "email" | "full_name" | "role" | "level" | "manager_id" | "avatar_url" | "created_at"> & { tenant_id?: string | null }): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    level: row.level,
    managerId: row.manager_id,
    tenantId: row.tenant_id ?? null,
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
  const context = await resolveTenantContext();
  if (!context) {
    return null;
  }

  const scope = dashboardScopeForContext(context);
  if (!scope) {
    return null;
  }

  const tenantId = context.tenantId ?? DEFAULT_TENANT_ID;

  return fetchTenantDashboard(tenantId, context.userId, scope, context.role);
}

export const getDashboardData = cache(async (preferredUserId?: string): Promise<{
  data: DashboardData;
  source: DataSource;
}> => {
  const authenticatedUser = await getAuthenticatedUser();

  try {
    const live = await fetchSupabaseDashboard();

    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // Fall through to empty or demo data.
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

    const currentUser = profile
      ? mapProfile(profile)
      : {
          id: authenticatedUser.id,
          email: authenticatedUser.email ?? "",
          fullName: authenticatedUser.user_metadata?.full_name?.toString() ?? "User",
          role: "basic_se" as const,
          level: "Basic" as const,
          managerId: null,
          tenantId: null,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
        };

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

  return {
    data: getDemoDashboardData(preferredUserId),
    source: "demo",
  };
});
