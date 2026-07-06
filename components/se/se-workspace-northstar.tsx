import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  Briefcase,
  Check,
  ChevronRight,
  MessageSquare,
  Mic,
  TrendingUp,
  Video,
} from "lucide-react";
import { AnimatedProgressFill, ScoreRing } from "@/components/se/northstar-animated";
import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import type { CertNextAction } from "@/lib/se/cert-next-action";
import { currentRampWeek } from "@/lib/plans/ramp-week";
import { doThisNowCopy, planStepTypeLabel } from "@/lib/plans/step-labels";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";
import type { CoachingCard, DashboardData, PlanStep } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { SP_BLUE_BTN } from "@/components/se/sp-form-primitives";
import { cn } from "@/lib/utils";

const COMPETENCY_SNAPSHOT = [
  "Discovery",
  "Objection handling",
  "Competitive positioning",
  "Demo execution",
  "Value articulation",
];

const CARD_SHELL =
  "rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

function stepIsValidated(status: PlanStep["status"]) {
  return status === "reviewed" || status === "completed";
}

function daysRemaining(plan: { startDate: string; targetCompletion: string }) {
  const end = new Date(`${plan.targetCompletion}T12:00:00`);
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

function competencyAverages(cards: CoachingCard[]) {
  const recent = cards.slice(0, 7);
  const buckets: Record<string, number[]> = {};

  for (const card of recent) {
    for (const name of card.linkedCompetencies) {
      const key = name.trim();
      if (!key) continue;
      buckets[key] ??= [];
      buckets[key].push(card.score);
    }
  }

  return COMPETENCY_SNAPSHOT.map((name) => {
    const match = Object.entries(buckets).find(([key]) =>
      key.toLowerCase().includes(name.split(" ")[0]!.toLowerCase()),
    );
    const values = match?.[1] ?? [];
    const avg =
      values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    return { name, avg };
  });
}

function simScoreDelta(cards: CoachingCard[]) {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const thisWeek = cards.filter((card) => now - new Date(card.sentToManagerAt).getTime() <= weekMs);
  const lastWeek = cards.filter((card) => {
    const age = now - new Date(card.sentToManagerAt).getTime();
    return age > weekMs && age <= weekMs * 2;
  });
  if (thisWeek.length === 0 || lastWeek.length === 0) return null;
  const thisAvg = Math.round(thisWeek.reduce((sum, card) => sum + card.score, 0) / thisWeek.length);
  const lastAvg = Math.round(lastWeek.reduce((sum, card) => sum + card.score, 0) / lastWeek.length);
  const delta = thisAvg - lastAvg;
  if (delta === 0) return null;
  return delta;
}

function activityStreakDays(activity: DashboardData["activity"], userId: string) {
  const days = new Set(
    activity
      .filter((item) => item.userId === userId)
      .map((item) => item.createdAt.slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 30; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function competencyBarColor(score: number | null) {
  if (score === null) return "#94a3b8";
  if (score >= 80) return "#10b981";
  if (score >= 70) return "#0071ce";
  return "#f59e0b";
}

const ACTIVITY_VISUAL: Record<string, { icon: typeof Bot; bg: string; color: string }> = {
  simulation_completed: { icon: Bot, bg: "#e8f2fc", color: "#0071ce" },
  challenge_submitted: { icon: BrainCircuit, bg: "#ede9fe", color: "#7c3aed" },
  plan_step_completed: { icon: Check, bg: "#dcfce7", color: "#16a34a" },
  deal_prep_completed: { icon: Briefcase, bg: "#fef3c7", color: "#d97706" },
  manager_feedback_received: { icon: MessageSquare, bg: "#fdf0fa", color: "#cc27b0" },
  coaching_card_reviewed: { icon: MessageSquare, bg: "#fdf0fa", color: "#cc27b0" },
  plan_assigned: { icon: Briefcase, bg: "#e8f2fc", color: "#0071ce" },
};

const PRACTICE_TOOLS = [
  {
    title: "Simulations",
    description: "AI roleplay with coaching",
    href: "/simulations",
    topGradient: "linear-gradient(90deg,#0033a1,#0071ce)",
    accent: "#0071ce",
    iconBg: "bg-[#e8f2fc]",
    icon: Bot,
    cta: "Start sim →",
  },
  {
    title: "Challenges",
    description: "Curated field scenarios",
    href: "/challenges",
    topGradient: "linear-gradient(90deg,#5b21b6,#7c3aed)",
    accent: "#7c3aed",
    iconBg: "bg-[#ede9fe]",
    icon: BrainCircuit,
    cta: "View challenge →",
  },
  {
    title: "Deal Prep",
    description: "AI-powered call prep",
    href: "/prep",
    topGradient: "linear-gradient(90deg,#b45309,#d97706)",
    accent: "#d97706",
    iconBg: "bg-[#fef3c7]",
    icon: Briefcase,
    cta: "Open prep →",
  },
  {
    title: "Market Pulse",
    description: "Competitive intel quizzes",
    href: "/market-pulse",
    topGradient: "linear-gradient(90deg,#0369a1,#0891b2)",
    accent: "#0891b2",
    iconBg: "bg-[#cffafe]",
    icon: TrendingUp,
    cta: "Take quiz →",
  },
  {
    title: "Pitch Studio",
    description: "Record & review your pitch",
    href: "/pitch",
    topGradient: "linear-gradient(90deg,#9d174d,#be185d)",
    accent: "#be185d",
    iconBg: "bg-[#fce7f3]",
    icon: Video,
    cta: "Record pitch →",
  },
] as const;

const WORKFLOW_CONNECTORS = [
  "linear-gradient(90deg,#0891b2,#a5b4fc)",
  "linear-gradient(90deg,#a5b4fc,#fbbf24)",
  "linear-gradient(90deg,#fbbf24,#34d399)",
] as const;

const WORKFLOW_STEPS = [
  { num: "1", title: "Market Pulse", sub: "Know the competition", bg: "bg-[#e0f5fa]", titleColor: "text-[#0369a1]", subColor: "text-[#0891b2]", circle: "bg-[#0891b2]" },
  { num: "2", title: "Deal Prep", sub: "Prepare brief", bg: "bg-[#ede9fe]", titleColor: "text-[#5b21b6]", subColor: "text-[#7c3aed]", circle: "bg-[#7c3aed]" },
  { num: "3", title: "Simulation", sub: "Roleplay the call", bg: "bg-[#fef3c7]", titleColor: "text-[#b45309]", subColor: "text-[#d97706]", circle: "bg-[#d97706]" },
  { num: "✓", title: "Field Ready", sub: "Own the call", bg: "bg-[#dcfce7]", titleColor: "text-[#15803d]", subColor: "text-[#16a34a]", circle: "bg-[#16a34a]" },
] as const;

export function SeWorkspaceNorthstar({
  data,
  certNextAction,
  approvedCertCount = 0,
}: {
  data: DashboardData;
  certNextAction?: CertNextAction | null;
  approvedCertCount?: number;
}) {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);
  const firstName = data.currentUser.fullName.split(" ")[0] ?? "there";
  const cards = data.coachingCards
    .filter((card) => card.userId === userId && !card.isPractice)
    .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime());
  const latestCard = cards[0];
  const simAvg =
    cards.length > 0
      ? Math.round(cards.slice(0, 7).reduce((total, card) => total + card.score, 0) / Math.min(7, cards.length))
      : null;
  const pendingReviewCards = cards.filter((card) => card.managerReviewStatus === "pending").length;
  const sortedSteps = [...(plan?.steps ?? [])].sort((a, b) => a.order - b.order);
  const nextStep =
    sortedSteps.find((step) => step.status === "in_progress" || step.status === "not_started") ?? null;
  const validatedCount = sortedSteps.filter((step) => stepIsValidated(step.status)).length;
  const stepNumber = nextStep ? sortedSteps.findIndex((step) => step.id === nextStep.id) + 1 : validatedCount;
  const nowCopy = nextStep ? doThisNowCopy(nextStep) : null;
  const rampWeek = plan?.startDate ? currentRampWeek(plan.startDate) : null;
  const remainingDays = plan ? daysRemaining(plan) : null;
  const competencyRows = competencyAverages(cards);
  const myActivity = data.activity
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const openChallenge = data.submissions.find(
    (submission) =>
      submission.userId === userId &&
      (submission.status === "in_progress" || submission.status === "not_started"),
  );
  const activeChallenge = openChallenge
    ? data.challenges.find((challenge) => challenge.id === openChallenge.challengeId)
    : null;
  const openSimulation = data.simulations.find((simulation) => simulation.assignedTo === userId);
  const simDelta = simScoreDelta(cards);
  const practiceStreak = activityStreakDays(data.activity, userId);

  const toolMeta: Record<string, { badge?: string; badgeClass?: string; activity?: string }> = {
    Simulations: {
      badge: simAvg !== null ? `Score: ${simAvg}` : undefined,
      badgeClass: "bg-[#dcfce7] text-[#15803d]",
      activity: latestCard?.simulationContext?.persona
        ? `${latestCard.simulationContext.persona} · ${formatDistanceToNow(new Date(latestCard.sentToManagerAt), { addSuffix: true })}`
        : "No recent sim",
    },
    Challenges: {
      badge: activeChallenge ? "1 active" : undefined,
      badgeClass: "bg-[#dbeafe] text-[#1d4ed8]",
      activity: activeChallenge
        ? `${activeChallenge.title.slice(0, 28)}${activeChallenge.title.length > 28 ? "…" : ""}`
        : "Browse library",
    },
    "Deal Prep": {
      badge: "Draft saved",
      badgeClass: "bg-[#fef3c7] text-[#b45309]",
      activity: "Pre-call workflow",
    },
    "Market Pulse": {
      badge: "New quiz",
      badgeClass: "bg-[#cffafe] text-[#0e7490]",
      activity: "Competitive positioning",
    },
    "Pitch Studio": {
      badge: "Not started",
      badgeClass: "bg-[#f1f5f9] text-[#64748b]",
      activity: "No recordings yet",
    },
  };

  const categoryBars =
    latestCard?.linkedCompetencies.slice(0, 5).map((label) => ({
      label,
      score: latestCard.score,
      color: competencyBarColor(latestCard.score),
    })) ?? [];

  return (
    <div className="space-y-3.5">
      {/* Dark hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001228] via-[#001f4a] to-[#002468] p-5 lg:p-6">
        <div className="pointer-events-none absolute -right-8 -top-12 h-[200px] w-[200px] rounded-full bg-[#0071ce]/10" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-[140px] w-[140px] rounded-full bg-[#cc27b0]/[0.06]" />
        <div className="relative flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <SailPointLogoMark variant="flat-white" />
              <span className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-white/90">
                SailPoint
              </span>
              <div className="h-3.5 w-px bg-white/20" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
                {plan ? `Onboarding · Week ${rampWeek ?? 1}` : "Field ready"}
                {manager ? ` · Manager: ${manager.fullName}` : ""}
              </span>
            </div>
            <h1 className="font-display text-[20px] font-extrabold text-white">
              Good morning, {firstName}
            </h1>

            {nextStep ? (
              <div className="mt-3.5 flex max-w-[660px] flex-col gap-3 rounded-xl border border-white/[0.12] bg-white/[0.07] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-[#60a5fa] animate-pulse-dot" />
                  <div className="min-w-0">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/40">
                      Do this now · Step {stepNumber} of {sortedSteps.length} ·{" "}
                      {planStepTypeLabel(nextStep.type)}
                    </p>
                    <p className="font-display text-sm font-bold leading-snug text-white">{nextStep.title}</p>
                    {(nowCopy?.hint ?? nextStep.description) ? (
                      <p className="mt-0.5 text-[11px] text-white/50">
                        {nowCopy?.hint ?? nextStep.description}
                        {nextStep.dueDate ? ` · Due ${nextStep.dueDate}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link className={cn(SP_BLUE_BTN, "shrink-0 gap-1")} href={planStepHref(nextStep)}>
                  {nowCopy?.cta ?? planStepActionLabel(nextStep)}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : certNextAction ? (
              <div className="mt-3.5 max-w-[660px] rounded-xl border border-white/[0.12] bg-white/[0.07] p-3">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/40">
                  Field readiness
                </p>
                <p className="mt-1 font-display text-sm font-bold text-white">{certNextAction.label}</p>
                <Link className={cn(SP_BLUE_BTN, "mt-2")} href={certNextAction.href}>
                  Submit evidence →
                </Link>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 text-center">
            <ScoreRing
              centerSub="ramp"
              centerValue={`${plan?.progress ?? 0}%`}
              percent={plan?.progress ?? 0}
            />
            {remainingDays !== null ? (
              <p className="mt-1 text-[10px] text-white/40">{remainingDays}d left</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cn(CARD_SHELL, "border-l-[3px] border-l-[#0071ce] p-4")}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Ramp progress</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {plan?.progress ?? 0}%
          </p>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[#e8f2fc]">
            <AnimatedProgressFill percent={plan?.progress ?? 0} />
          </div>
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">
            {validatedCount} of {sortedSteps.length || "—"} steps validated
          </p>
        </div>
        <div className={cn(CARD_SHELL, "border-l-[3px] border-l-[#10b981] p-4")}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Avg sim score</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {simAvg ?? "—"}
          </p>
          <p className="mt-2 text-[10px] font-semibold text-[#10b981]">
            {simDelta !== null
              ? `${simDelta > 0 ? "↑" : "↓"} ${Math.abs(simDelta)} pts this week`
              : "Last 7 coaching cards"}
          </p>
        </div>
        <div className={cn(CARD_SHELL, "border-l-[3px] border-l-[#cc27b0] p-4")}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Cert gates</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {approvedCertCount}
            <span className="text-base font-medium text-[#94a3b8]"> / 5</span>
          </p>
          <p className="mt-2 text-[10px] font-semibold text-[#cc27b0]">
            {certNextAction?.label ?? "All gates complete"}
          </p>
        </div>
        <div className={cn(CARD_SHELL, "border-l-[3px] border-l-[#f59e0b] p-4")}>
          <p className="mb-2 text-[10px] font-semibold text-[#64748b]">Coaching cards</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">
            {cards.length}
          </p>
          <p className="mt-2 text-[10px] text-[#94a3b8]">
            {pendingReviewCards > 0
              ? `${pendingReviewCards} awaiting your review`
              : "On record"}
          </p>
        </div>
      </div>

      {/* Practice toolkit */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[14px] font-bold text-[#0a1628]">Practice toolkit</p>
            <p className="text-[11px] text-[#64748b]">Your full training suite — pick up where you left off</p>
          </div>
          {practiceStreak >= 2 ? (
            <span className="text-[11px] font-bold text-[#f59e0b]">{practiceStreak}-day streak</span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {PRACTICE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const meta = toolMeta[tool.title];
            return (
              <div className={cn(CARD_SHELL, "overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,20,58,0.1)]")} key={tool.title}>
                <div className="h-[3px]" style={{ background: tool.topGradient }} />
                <div className="px-3.5 pb-3 pt-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tool.iconBg)}>
                      <Icon className="h-4 w-4" style={{ color: tool.accent }} />
                    </div>
                    {meta.badge ? (
                      <span className={cn("rounded-full px-[7px] py-0.5 text-[9px] font-bold", meta.badgeClass)}>
                        {meta.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12.5px] font-bold text-[#0a1628]">{tool.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-[#64748b]">{tool.description}</p>
                  <p className="mb-2.5 mt-2 text-[10px] text-[#94a3b8]">{meta.activity}</p>
                  <Link className={cn(SP_BLUE_BTN, "w-full justify-center")} href={tool.href}>
                    {tool.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pre-call workflow strip */}
        <div className={cn(CARD_SHELL, "mt-3 flex flex-col gap-3 overflow-hidden p-3.5 lg:flex-row lg:items-center")}>
          <div className="mr-0 shrink-0 lg:mr-4 lg:min-w-[120px]">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#64748b]">
              Pre-call workflow
            </p>
            <p className="text-[10.5px] text-[#94a3b8]">
              {openSimulation?.persona ? `For ${openSimulation.persona}` : "Market Pulse → Deal Prep → Sim"}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0 lg:flex-nowrap">
            {WORKFLOW_STEPS.map((step, index) => (
              <div className="flex min-w-0 flex-1 items-center" key={step.title}>
                <div className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2", step.bg)}>
                  <div
                    className={cn(
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold text-white",
                      step.circle,
                    )}
                  >
                    {step.num}
                  </div>
                  <div>
                    <p className={cn("text-[11px] font-bold", step.titleColor)}>{step.title}</p>
                    <p className={cn("text-[9.5px]", step.subColor)}>{step.sub}</p>
                  </div>
                </div>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <div
                    className="hidden h-[2px] min-w-4 flex-1 lg:block"
                    style={{ background: WORKFLOW_CONNECTORS[index] }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 3-col */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr_0.9fr]">
        {/* Coaching card */}
        <div className={cn(CARD_SHELL, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-[#0a1628]">Latest coaching card</p>
              <p className="text-[10px] text-[#94a3b8]">
                {latestCard?.simulationContext?.persona ?? "No coaching cards yet"}
                {latestCard
                  ? ` · ${formatDistanceToNow(new Date(latestCard.sentToManagerAt), { addSuffix: true })}`
                  : ""}
              </p>
            </div>
            {latestCard ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9.5px] font-bold",
                  latestCard.managerReviewStatus === "reviewed"
                    ? "bg-[#dcfce7] text-[#15803d]"
                    : latestCard.managerReviewStatus === "needs_revision"
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-[#dbeafe] text-[#1d4ed8]",
                )}
              >
                {latestCard.managerReviewStatus.replace("_", " ")}
              </span>
            ) : null}
          </div>
          <div className="p-4">
            {latestCard ? (
              <>
                <div className="mb-3 flex items-center gap-3.5">
                  <ScoreRing
                    centerSub="/100"
                    centerValue={String(latestCard.score)}
                    labelClassName="text-[#0a1628]"
                    percent={latestCard.score}
                    progressClassName="stroke-[#0071ce]"
                    size={60}
                    strokeWidth={12}
                    subClassName="text-[#94a3b8]"
                    trackClassName="stroke-[#f1f5f9]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {(categoryBars.length > 0 ? categoryBars : [{ label: "Overall", score: latestCard.score, color: "#0071ce" }]).map(
                      (bar) => (
                        <div key={bar.label}>
                          <div className="mb-0.5 flex justify-between">
                            <span className="truncate text-[10px] text-[#64748b]">{bar.label}</span>
                            <span className="text-[10px] font-semibold text-[#0a1628]">{bar.score}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${bar.score}%`, background: bar.color }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                {(latestCard.managerComments ?? latestCard.managerSummary) ? (
                  <div className="rounded-lg border-l-[3px] border-l-[#0071ce] bg-[#f8fafd] px-3 py-2.5">
                    <p className="text-[11px] italic leading-relaxed text-[#475569]">
                      &ldquo;{latestCard.managerComments ?? latestCard.managerSummary}&rdquo;
                    </p>
                    {manager ? (
                      <p className="mt-1 text-[10px] text-[#94a3b8]">Manager: {manager.fullName}</p>
                    ) : null}
                  </div>
                ) : null}
                <Link className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071ce]" href="/simulations">
                  Run another simulation →
                </Link>
              </>
            ) : (
              <p className="text-sm text-[#94a3b8]">Complete a simulation to receive your first coaching card.</p>
            )}
          </div>
        </div>

        {/* Competency snapshot */}
        <div className={cn(CARD_SHELL, "overflow-hidden")}>
          <div className="border-b border-[#f1f5f9] px-4 py-3">
            <p className="text-xs font-bold text-[#0a1628]">Competency snapshot</p>
            <p className="text-[10px] text-[#94a3b8]">Based on last 7 coaching cards</p>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {competencyRows.map((row) => {
              const color = competencyBarColor(row.avg);
              return (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-[#1e293b]">{row.name}</span>
                    <span className="text-[10.5px] font-bold" style={{ color }}>
                      {row.avg !== null ? `${row.avg}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${row.avg ?? 0}%`, background: color }}
                    />
                  </div>
                  <p className="mt-0.5 text-[9.5px] text-[#94a3b8]">
                    {row.avg !== null ? "Scored from sims" : "Not enough data"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className={cn(CARD_SHELL, "overflow-hidden")}>
          <div className="border-b border-[#f1f5f9] px-4 py-3">
            <p className="text-xs font-bold text-[#0a1628]">Recent activity</p>
          </div>
          <div className="py-1">
            {myActivity.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#94a3b8]">No recent activity yet.</p>
            ) : (
              myActivity.map((item) => {
                const visual = ACTIVITY_VISUAL[item.eventType] ?? {
                  icon: Mic,
                  bg: "#fdf0fa",
                  color: "#cc27b0",
                };
                const Icon = visual.icon;
                const person = data.profiles.find((profile) => profile.id === item.userId);
                return (
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5" key={item.id}>
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: visual.bg }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: visual.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold leading-snug text-[#1e293b]">{item.title}</p>
                      <p className="text-[10px] text-[#94a3b8]">
                        {person?.fullName ?? "You"} ·{" "}
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
