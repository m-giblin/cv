import { PracticeThisWeekCard } from "@/components/practice/practice-this-week-card";
import { ReleaseTrainingSpotlight } from "@/components/corpus/release-training-spotlight";
import { SeGamificationHubLoader } from "@/components/gamification/se-gamification-hub-loader";
import { SeSkillTrendPanel } from "@/components/se/se-skill-trend-panel";
import { buildPracticeWeekPlan } from "@/lib/practice/practice-this-week";
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
import { planStepTypeLabel } from "@/lib/plans/step-labels";
import { rampWeekLabel } from "@/lib/plans/ramp-week";
import type { CertNextAction } from "@/lib/se/cert-next-action";
import type { DashboardData } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

function stepRowStatus(status: string): Pick<HandoffListRow, "dotClass" | "status" | "badgeBg" | "badgeColor"> {
  if (status === "reviewed" || status === "completed") {
    return { dotClass: "dot-green", status: "Done", badgeBg: "#dcfce7", badgeColor: "#15803d" };
  }
  if (status === "submitted" || status === "under_review") {
    return { dotClass: "dot-amber", status: "Pending", badgeBg: "#fef3c7", badgeColor: "#b45309" };
  }
  if (status === "in_progress") {
    return { dotClass: "dot-blue", status: "Active", badgeBg: "#dbeafe", badgeColor: "#1d4ed8" };
  }
  return { dotClass: "dot-blue", status: "Draft", badgeBg: "#e8f2fc", badgeColor: "#0057a8" };
}

function stepProgress(status: string) {
  if (status === "reviewed" || status === "completed") return 100;
  if (status === "in_progress" || status === "submitted") return 50;
  return 20;
}

export function SeDashboardHandoff({
  data,
  certNextAction,
  approvedCertCount = 0,
  releaseProjectTags = [],
}: {
  data: DashboardData;
  certNextAction?: CertNextAction | null;
  approvedCertCount?: number;
  releaseProjectTags?: string[];
}) {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const manager = data.profiles.find((p) => p.id === data.currentUser.managerId);
  const cards = data.coachingCards.filter((c) => c.userId === userId && !c.isPractice);
  const simAvg =
    cards.length > 0
      ? Math.round(cards.slice(0, 7).reduce((t, c) => t + c.score, 0) / Math.min(7, cards.length))
      : null;
  const needsReviewCards = cards.filter((c) => c.managerReviewStatus === "pending").length;

  const metrics: HandoffMetric[] = [
    {
      label: "Plan progress",
      icon: "📋",
      value: `${plan?.progress ?? 0}%`,
      sub: plan ? rampWeekLabel(plan) : "No ramp plan assigned",
    },
    {
      label: "Sim score",
      icon: "🤖",
      value: simAvg !== null ? String(simAvg) : "—",
      sub: "Last 7 days avg",
    },
    {
      label: "Cert gates",
      icon: "🏆",
      value: `${approvedCertCount}/8`,
      sub: certNextAction?.label ?? "All gates complete",
    },
    {
      label: "Coaching cards",
      icon: "💬",
      value: String(cards.length),
      sub: needsReviewCards > 0 ? `${needsReviewCards} needs review` : "On record",
    },
  ];

  const mainRows: HandoffListRow[] = (plan?.steps ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((step) => ({
      title: step.title,
      sub: [step.dueDate ? `Due ${step.dueDate}` : null, planStepTypeLabel(step.type)]
        .filter(Boolean)
        .join(" · "),
      ...stepRowStatus(step.status),
      progress: stepProgress(step.status),
    }));

  const activityIcons: Record<string, { icon: string; bg: string }> = {
    simulation_completed: { icon: "🤖", bg: "#e8f2fc" },
    challenge_submitted: { icon: "⚡", bg: "#ede9fe" },
    plan_step_completed: { icon: "📋", bg: "#dcfce7" },
    deal_prep_completed: { icon: "✨", bg: "#fef9c3" },
    manager_feedback_received: { icon: "💬", bg: "#fdf0fa" },
    default: { icon: "💬", bg: "#fdf0fa" },
  };

  const sideRows: HandoffSideRow[] = data.activity
    .filter((a) => a.userId === userId)
    .slice(0, 4)
    .map((item) => {
      const visual = activityIcons[item.eventType] ?? activityIcons.default;
      return {
        icon: visual.icon,
        iconBg: visual.bg,
        label: item.title,
        time: formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }),
      };
    });

  const firstName = data.currentUser.fullName.split(" ")[0];
  const practiceWeek = buildPracticeWeekPlan(data, userId);

  return (
    <div>
      <HandoffPageHero
        eyebrow={`SE Dashboard · ${plan ? "Onboarding" : "Field ready"}`}
        greeting={`Good morning, ${firstName} — here's what's next`}
        subline={[
          plan ? rampWeekLabel(plan) : "No active ramp",
          manager ? `Manager: ${manager.fullName}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <ReleaseTrainingSpotlight projectTags={releaseProjectTags} />

      <PracticeThisWeekCard items={practiceWeek} />

      <SeGamificationHubLoader />

      <HandoffMetricGrid metrics={metrics} />

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <HandoffListCard rows={mainRows} title="Ramp plan steps" viewAllHref={plan ? "/my-plan" : undefined} />
        <div className="space-y-3.5">
          <SeSkillTrendPanel cards={cards} />
          <HandoffSideCard rows={sideRows} title="Recent activity" />
        </div>
      </div>

      <HandoffBottomBar
        ctaHref="/simulations"
        ctaLabel="Run a simulation →"
        label="Ramp Readiness"
        stats={[
          { value: `${plan?.progress ?? 0}%`, label: "Readiness" },
          { value: String(simAvg ?? "—"), label: "Sim avg" },
          { value: String(cards.length), label: "Coaching cards" },
        ]}
        text={
          plan && (plan.progress ?? 0) >= 60
            ? "You're tracking ahead of the 60-day target — keep it up"
            : "Stay on your ramp rhythm — knock out the next plan step"
        }
      />
    </div>
  );
}
