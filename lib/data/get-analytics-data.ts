import { createClient } from "@/lib/supabase/server";

export type AnalyticsData = {
  totalUsers: number;
  seCount: number;
  managerCount: number;
  activePlans: number;
  completedPlans: number;
  avgPlanProgress: number;
  pendingReviews: number;
  submissionsThisMonth: number;
  avgDaysToComplete: number | null;
  recentActivityCount: number;
  certPendingSignoffs: number;
  certApprovedTotal: number;
  certClearanceRate: number;
};

export async function getAnalyticsData(): Promise<AnalyticsData | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const [
    profilesResult,
    assignmentsResult,
    submissionsResult,
    coachingResult,
    activityResult,
    certificationsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role"),
    supabase.from("plan_assignments").select("id, status, progress_percent, start_date, target_completion"),
    supabase.from("challenge_submissions").select("id, status, submitted_at"),
    supabase.from("coaching_cards").select("id, manager_review_status"),
    supabase
      .from("activity_logs")
      .select("id")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("readiness_certifications").select("status"),
  ]);

  const profiles = profilesResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const submissions = submissionsResult.data ?? [];
  const coachingCards = coachingResult.data ?? [];
  const certifications = certificationsResult.data ?? [];

  const certPendingSignoffs = certifications.filter((cert) => cert.status === "submitted").length;
  const certApprovedTotal = certifications.filter((cert) => cert.status === "approved").length;
  const certClearanceRate =
    certifications.length > 0 ? Math.round((certApprovedTotal / certifications.length) * 100) : 0;

  const seRoles = ["basic_se", "senior_se", "advisory_solutions_consultant"];
  const managerRoles = ["manager", "mentor", "director", "admin"];

  const activePlans = assignments.filter((a) => a.status !== "completed").length;
  const completedPlans = assignments.filter((a) => a.status === "completed").length;
  const avgPlanProgress = assignments.length
    ? Math.round(
        assignments.reduce((sum, a) => sum + Number(a.progress_percent ?? 0), 0) / assignments.length,
      )
    : 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const submissionsThisMonth = submissions.filter(
    (s) => s.submitted_at && new Date(s.submitted_at) >= monthStart,
  ).length;

  const pendingReviews =
    submissions.filter((s) => s.status === "submitted").length +
    coachingCards.filter((c) => c.manager_review_status === "pending").length +
    certPendingSignoffs;

  const completedAssignments = assignments.filter((a) => a.status === "completed" && a.start_date && a.target_completion);
  const avgDaysToComplete =
    completedAssignments.length > 0
      ? Math.round(
          completedAssignments.reduce((sum, a) => {
            const start = new Date(a.start_date);
            const end = new Date(a.target_completion!);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / completedAssignments.length,
        )
      : null;

  return {
    totalUsers: profiles.length,
    seCount: profiles.filter((p) => seRoles.includes(p.role)).length,
    managerCount: profiles.filter((p) => managerRoles.includes(p.role)).length,
    activePlans,
    completedPlans,
    avgPlanProgress,
    pendingReviews,
    submissionsThisMonth,
    avgDaysToComplete,
    recentActivityCount: activityResult.data?.length ?? 0,
    certPendingSignoffs,
    certApprovedTotal,
    certClearanceRate,
  };
}
