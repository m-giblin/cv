import { formatDistanceToNowStrict } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { KeepSkillsSharp, type SharpRow } from "@/components/practice/keep-skills-sharp";
import { PreflightCard, type PreflightTool } from "@/components/practice/preflight-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { formatShortDate, isStepValidated } from "@/lib/se/ramp-model";

export const metadata = { title: "Practice" };

/** Generic buyer roles offered after the SE's own assigned simulation personas. */
const DEFAULT_AUDIENCES = ["CISO", "CIO", "IAM lead", "IT director", "Procurement lead"];

function ago(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
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
  const toolCount = Object.values(flags).filter(Boolean).length;

  const plan = data.plans.find((item) => item.userId === userId);
  const assigned = (plan?.steps ?? []).filter(
    (step) =>
      !isStepValidated(step.status) &&
      (step.type === "challenge" || step.type === "simulation" || step.type === "deal_prep"),
  ).length;

  const personas = [
    ...new Set(
      data.simulations
        .filter((simulation) => simulation.assignedTo === userId && simulation.persona)
        .map((simulation) => simulation.persona.replace(/\s*\(.*\)\s*$/, "").trim())
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

  const cards = data.coachingCards
    .filter((card) => card.userId === userId && !card.isPractice)
    .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime());
  const lastCard = cards[0];

  const active = data.submissions.filter(
    (submission) =>
      submission.userId === userId && (submission.status === "in_progress" || submission.status === "submitted"),
  );
  const firstActive = active[0] ? data.challenges.find((challenge) => challenge.id === active[0]!.challengeId) : null;
  const linkedStep = firstActive ? plan?.steps.find((step) => step.challengeId === firstActive.id) : undefined;

  const lastPitch = data.activity
    .filter((item) => item.userId === userId && item.eventType === "pitch_submitted")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const rows: SharpRow[] = [];
  if (flags.simulations) {
    rows.push({
      id: "simulations",
      tool: "Simulations",
      last: lastCard
        ? `Last: ${lastCard.simulationContext?.persona ?? "roleplay"} · ${lastCard.score}`
        : "No scored simulations yet",
      meta: lastCard ? ago(lastCard.sentToManagerAt) : "—",
      href: "/practice/simulations",
      action: "Start",
    });
  }
  if (flags.challenges) {
    rows.push({
      id: "challenges",
      tool: "Challenges",
      last: firstActive ? `${active.length} active: ${firstActive.title}` : "No active challenges",
      meta: linkedStep?.dueDate ? `Due ${formatShortDate(linkedStep.dueDate)}` : active.length ? "In progress" : "—",
      href: firstActive ? `/practice/challenges?challenge=${firstActive.id}` : "/practice/challenges",
      action: "Open",
    });
  }
  if (flags.pitch) {
    rows.push({
      id: "pitch",
      tool: "Pitch Studio",
      last: lastPitch ? `Last: ${lastPitch.title}` : "No recordings yet",
      meta: lastPitch ? ago(lastPitch.createdAt) : "—",
      href: "/practice/pitch",
      action: "Record",
    });
  }

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader eyebrow={`${toolCount} tools · ${assigned} assigned`} title="Practice" />
      <div className="flex flex-col gap-6 px-[var(--gutter)] pb-7">
        {tools.length > 0 ? <PreflightCard personas={personas} tools={tools} /> : null}
        <KeepSkillsSharp rows={rows} />
      </div>
    </AppShell>
  );
}
