import { tenantTable } from "@/lib/data/tenant-scoped-query";
import { fetchPendingReviewBreakdown, pendingReviewTotal } from "@/lib/data/get-pending-review-breakdown";

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

type AssignmentRow = {
  id: string;
  status: string;
  progress_percent: number | null;
  start_date: string;
  target_completion: string | null;
};

type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
};

type CertificationRow = {
  status: string;
};

type ProfileRow = {
  id: string;
  role: string;
};

export async function getAnalyticsData(tenantId: string): Promise<AnalyticsData | null> {
  const scoped = tenantTable(tenantId);
  if (!scoped) {
    return null;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const seRoles = ["basic_se", "senior_se", "advisory_solutions_consultant"];
  const managerRoles = ["manager", "mentor", "director", "admin"];

  const profilesResult = await scoped.select("profiles", "id, role");
  const profiles = (profilesResult.data ?? []) as unknown as ProfileRow[];
  const seUserIds = profiles.filter((p) => seRoles.includes(p.role)).map((p) => p.id);

  const [
    assignmentsResult,
    submissionsResult,
    activityResult,
    certificationsResult,
    pendingReviewBreakdown,
  ] = await Promise.all([
    scoped.select("plan_assignments", "id, status, progress_percent, start_date, target_completion"),
    scoped.select("challenge_submissions", "id, status, submitted_at"),
    scoped.admin.from("activity_logs").select("id").eq("tenant_id", tenantId).gte("created_at", weekAgo),
    scoped.select("readiness_certifications", "status"),
    fetchPendingReviewBreakdown(tenantId, seUserIds),
  ]);

  const assignments = (assignmentsResult.data ?? []) as unknown as AssignmentRow[];
  const submissions = (submissionsResult.data ?? []) as unknown as SubmissionRow[];
  const certifications = (certificationsResult.data ?? []) as unknown as CertificationRow[];

  const certPendingSignoffs = pendingReviewBreakdown.certSignoffs;
  const certApprovedTotal = certifications.filter((cert) => cert.status === "approved").length;
  const certClearanceRate =
    certifications.length > 0 ? Math.round((certApprovedTotal / certifications.length) * 100) : 0;

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

  const pendingReviews = pendingReviewTotal(pendingReviewBreakdown);

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
