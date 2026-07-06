import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import {
  HandoffBottomBar,
  HandoffListCard,
  HandoffMetricGrid,
  HandoffPageHero,
  HandoffSideCard,
  type HandoffListRow,
  type HandoffMetric,
  type HandoffSideRow,
} from "@/components/dashboard/handoff-dashboard";
import type { TeamReadinessRow } from "@/lib/manager/team-readiness";
import type { Profile, UserPlan } from "@/lib/types";

function readinessBadge(row: TeamReadinessRow): Pick<HandoffListRow, "dotClass" | "status" | "badgeBg" | "badgeColor"> {
  if (row.openReviews > 0) {
    return { dotClass: "dot-amber", status: "Review due", badgeBg: "#dbeafe", badgeColor: "#1d4ed8" };
  }
  if (row.readinessIndex < 70) {
    return { dotClass: "dot-amber", status: "At risk", badgeBg: "#fef3c7", badgeColor: "#b45309" };
  }
  return { dotClass: "dot-green", status: "On track", badgeBg: "#dcfce7", badgeColor: "#15803d" };
}

function inboxIcon(kind: string) {
  if (kind === "coaching") return { icon: "📝", iconBg: "#fdf0fa" };
  if (kind === "submission") return { icon: "⚡", iconBg: "#ede9fe" };
  return { icon: "📋", iconBg: "#e8f2fc" };
}

export function ManagerDashboardHandoff({
  currentUser,
  readinessRows,
  reviewItems,
  certReviewItems,
  planSteps,
  plans,
  teamSize,
  reviewCount,
  pendingCoachingCount,
}: {
  currentUser: Profile;
  readinessRows: TeamReadinessRow[];
  reviewItems: ReviewItem[];
  certReviewItems: CertReviewItem[];
  planSteps: PlanStepReviewItem[];
  plans: UserPlan[];
  teamSize: number;
  reviewCount: number;
  pendingCoachingCount: number;
}) {
  const avgReadiness = readinessRows.length
    ? Math.round(readinessRows.reduce((sum, row) => sum + row.readinessIndex, 0) / readinessRows.length)
    : 0;
  const activeRampPlans = plans.filter((plan) => plan.progress < 100).length;
  const atRiskCount = readinessRows.filter((row) => row.readinessIndex < 70).length;
  const atRiskName = readinessRows.find((row) => row.readinessIndex < 70)?.fullName.split(" ")[0];

  const metrics: HandoffMetric[] = [
    {
      label: "Team readiness",
      icon: "📊",
      value: `${avgReadiness}%`,
      sub: teamSize > 0 ? `Avg across ${teamSize} SE${teamSize === 1 ? "" : "s"}` : "No team members",
    },
    {
      label: "Reviews pending",
      icon: "📝",
      value: String(reviewCount),
      sub: pendingCoachingCount > 0 ? `${pendingCoachingCount} coaching cards` : "Inbox clear",
    },
    {
      label: "Ramp plans",
      icon: "📋",
      value: String(activeRampPlans),
      sub: "Active onboarding",
    },
    {
      label: "At risk",
      icon: "⚠️",
      value: String(atRiskCount),
      sub: atRiskName ? `${atRiskName} below target` : "None flagged",
    },
  ];

  const planByUser = new Map(plans.map((plan) => [plan.userId, plan]));

  const mainRows: HandoffListRow[] = readinessRows.slice(0, 6).map((row) => {
    const plan = planByUser.get(row.profileId);
    const sub = plan
      ? `${plan.progress}% ramp · ${row.openReviews > 0 ? `${row.openReviews} review${row.openReviews === 1 ? "" : "s"} open` : "field rhythm"}`
      : row.level;
    return {
      title: `${row.fullName} · ${row.level}`,
      sub,
      ...readinessBadge(row),
      progress: row.readinessIndex,
    };
  });

  const sideRows: HandoffSideRow[] = [
    ...reviewItems.slice(0, 3).map((item) => {
      const visual = inboxIcon(item.kind);
      return {
        icon: visual.icon,
        iconBg: visual.iconBg,
        label: `Review ${item.personName}'s ${item.kind === "coaching" ? "sim card" : "challenge"}`,
        time: "Due today",
      };
    }),
    ...certReviewItems.slice(0, 2).map((item) => ({
      icon: "🎓",
      iconBg: "#dcfce7",
      label: `Cert sign-off — ${item.personName}`,
      time: "Pending",
    })),
    ...planSteps.slice(0, 2).map((step) => ({
      icon: "📋",
      iconBg: "#e8f2fc",
      label: `${step.personName}: ${step.title}`,
      time: "Plan step",
    })),
  ].slice(0, 4);

  const firstName = currentUser.fullName.split(" ")[0];

  return (
    <div className="mb-8">
      <HandoffPageHero
        eyebrow="Manager Dashboard"
        greeting={
          reviewCount > 0
            ? `Good morning, ${firstName} — your team needs attention`
            : `Good morning, ${firstName} — your team is on track`
        }
        subline={[
          `${teamSize} SE${teamSize === 1 ? "" : "s"}`,
          `${activeRampPlans} ramp plan${activeRampPlans === 1 ? "" : "s"} active`,
          reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} pending` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <HandoffMetricGrid metrics={metrics} />

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <HandoffListCard rows={mainRows} title="Team roster — readiness" viewAllHref="#manager-roster" />
        <HandoffSideCard rows={sideRows} title="Action inbox" />
      </div>

      <HandoffBottomBar
        ctaHref="#manager-roster"
        ctaLabel="View full roster →"
        label="Team Performance"
        stats={[
          { value: `${avgReadiness}%`, label: "Avg readiness" },
          { value: String(reviewCount), label: "Reviews due" },
          { value: String(atRiskCount), label: "At risk" },
        ]}
        text={
          avgReadiness >= 75
            ? "Team average readiness is strong — keep coaching momentum"
            : "Focus on at-risk SEs and clear the review inbox this week"
        }
      />
    </div>
  );
}
