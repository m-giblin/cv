import { AppShell } from "@/components/app-shell";
import { PreflightCard } from "@/components/practice/preflight-card";
import {
  AssignedToYou,
  PracticeToolCards,
  type AssignedPractice,
  type PracticeToolCard,
} from "@/components/practice/practice-tool-cards";
import { MainWithRail, PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { PREFLIGHT_MINUTES, type PreflightTool } from "@/lib/se/preflight";
import { daysUntil, formatDay, formatShortDate, isStepValidated } from "@/lib/se/ramp-model";
import { planStepHref } from "@/lib/utils/plan-links";

export const metadata = { title: "Practice" };

/** Generic buyer roles offered after the SE's own assigned simulation personas. */
const DEFAULT_AUDIENCES = ["CISO", "CIO", "IAM lead", "IT director", "Procurement lead"];

function personaName(persona: string): string {
  return persona.replace(/\s*\(.*\)\s*$/, "").trim();
}

export default async function PracticePage() {
  const { data } = await requireAppAccess("/practice");
  const userId = data.currentUser.id;
  const settings = await loadPlatformSettings(data.currentUser.tenantId ?? undefined);
  const on = (flag: string) => isFeatureEnabled(settings.featureFlags, flag);

  const flags = {
    simulations: on("simulations"),
    challenges: on("challenges"),
    pitch: on("pitch-studio"),
    quizzes: on("market-pulse"),
    flightCheck: on("flight-check"),
    dealPrep: on("deal-prep"),
  };

  const plan = data.plans.find((item) => item.userId === userId);
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);
  const nameOf = (id: string) => data.profiles.find((profile) => profile.id === id)?.fullName.split(" ")[0];

  const openSims = data.simulations.filter(
    (simulation) =>
      simulation.assignedTo === userId &&
      (simulation.status === "not_started" || simulation.status === "in_progress"),
  );
  const openChallengeSteps = (plan?.steps ?? []).filter(
    (step) => step.type === "challenge" && !step.locked && !isStepValidated(step.status) && step.status !== "submitted" && step.status !== "under_review",
  );

  const personas = [
    ...new Set(
      data.simulations
        .filter((simulation) => simulation.assignedTo === userId && simulation.persona)
        .map((simulation) => personaName(simulation.persona))
        .filter(Boolean),
    ),
    ...DEFAULT_AUDIENCES,
  ];

  const tools: PreflightTool[] = [
    flags.quizzes ? "market-pulse" : null,
    flags.dealPrep ? "deal-prep" : null,
    flags.simulations ? "simulations" : null,
    flags.flightCheck ? "flight-check" : null,
  ].filter((tool): tool is PreflightTool => tool !== null);
  const preflightMinutes = tools.reduce((sum, tool) => sum + PREFLIGHT_MINUTES[tool], 0);

  // Last activity per tool, from the SE's own data.
  const lastCard = data.coachingCards
    .filter((card) => card.userId === userId && !card.isPractice)
    .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime())[0];
  const activeSubmissions = data.submissions.filter(
    (submission) =>
      submission.userId === userId && (submission.status === "in_progress" || submission.status === "submitted"),
  );
  const firstActive = activeSubmissions[0]
    ? data.challenges.find((challenge) => challenge.id === activeSubmissions[0]!.challengeId)
    : null;
  const lastPitch = data.activity
    .filter((item) => item.userId === userId && item.eventType === "pitch_submitted")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const cards: PracticeToolCard[] = [];
  if (flags.simulations) {
    cards.push({
      id: "simulations",
      title: "Simulations",
      description: "Role-play with an AI buyer and get a scored coaching card.",
      last: lastCard
        ? `Last run ${formatShortDate(lastCard.sentToManagerAt)}, scored ${lastCard.score}`
        : "No scored simulations yet",
      assigned: openSims.length,
      href: "/practice/simulations",
      linkLabel: "Open simulations",
    });
  }
  if (flags.challenges) {
    cards.push({
      id: "challenges",
      title: "Challenges",
      description: "Hands-on builds in the lab, reviewed by your manager.",
      last: firstActive
        ? activeSubmissions.length === 1
          ? `${firstActive.title} is in progress`
          : `${activeSubmissions.length} challenges in progress`
        : "No challenges in progress",
      assigned: openChallengeSteps.length,
      href: firstActive ? `/practice/challenges?challenge=${firstActive.id}` : "/practice/challenges",
      linkLabel: "Open challenges",
    });
  }
  if (flags.pitch) {
    cards.push({
      id: "pitch",
      title: "Pitch",
      description: "Timed, recorded pitches scored against a rubric.",
      last: lastPitch ? `Last pitch ${formatShortDate(lastPitch.createdAt)}` : "No recordings yet",
      assigned: 0,
      href: "/practice/pitch",
      linkLabel: "Open pitch",
    });
  }

  const assigned: AssignedPractice[] = [
    ...openChallengeSteps.map((step) => {
      const days = daysUntil(step.dueDate);
      return {
        id: `step-${step.id}`,
        title: step.title,
        source: "Challenge, from your ramp plan",
        due: formatDay(step.dueDate),
        overdue: days !== null && days < 0,
        href: planStepHref(step),
        sortKey: step.dueDate ?? "9999",
      };
    }),
    ...(flags.simulations
      ? openSims.map((simulation) => {
          const from =
            simulation.assignedBy === data.currentUser.managerId
              ? (manager?.fullName.split(" ")[0] ?? "your manager")
              : simulation.assignedBy === userId
                ? "you"
                : (nameOf(simulation.assignedBy) ?? "enablement");
          return {
            id: `sim-${simulation.id}`,
            title: [personaName(simulation.persona), simulation.vertical].filter(Boolean).join(", "),
            source: `Simulation, from ${from}`,
            due: null,
            overdue: false,
            href: `/practice/simulations?assignment=${simulation.id}`,
            sortKey: "9999",
          };
        })
      : []),
  ]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(0, 4);

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader
        accent="Rehearse before it counts."
        eyebrow="Practice"
        subtitle={
          tools.length > 0
            ? `Pre-flight builds a ${preflightMinutes}-minute plan for a real call. The rest keeps skills warm.`
            : "Keep your skills warm between customer calls."
        }
        title="Practice."
      />
      <PageBody className="pb-7">
        <MainWithRail rail={<AssignedToYou items={assigned} />}>
          <div className="flex flex-col gap-6">
            {tools.length > 0 ? <PreflightCard personas={personas} tools={tools} /> : null}
            <PracticeToolCards cards={cards} />
          </div>
        </MainWithRail>
      </PageBody>
    </AppShell>
  );
}
