import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";
import { getSpacedReinforcementItems } from "@/lib/practice/spaced-reinforcement";
import {
  buildObjectionPracticePrompt,
  resolveVerticalFromIndustry,
} from "@/lib/simulations/objection-practice-prompt";
import { resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";
import { getDashboardData } from "@/lib/data/get-dashboard-data";

const schema = z.object({
  competency: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data } = await getDashboardData();
  const cards = data.coachingCards.filter((c) => c.userId === session.user.id && !c.isPractice);
  const dueItems = getSpacedReinforcementItems(cards);

  const competency =
    parsed.data.competency ??
    dueItems[0]?.competency ??
    recommendChallengesForGaps(data, session.user.id, new Set(), 1)[0]?.gapCompetency;

  if (!competency) {
    return NextResponse.json({ error: "No reinforcement due." }, { status: 404 });
  }

  const objection = `I'm not convinced our team is ready to govern ${competency.toLowerCase()} at scale — we've struggled with similar initiatives before.`;
  const vertical = "Enterprise";
  const solutionFocus = "Identity Security Cloud";
  const difficulty = "intermediate" as const;
  const promptBody = buildObjectionPracticePrompt({
    objection,
    accountName: "Reinforcement account",
    industry: "Enterprise software",
    vertical,
    solutionFocus,
    difficulty,
  });

  const sessionData = {
    promptSnapshot: promptBody,
    aiRoleplay: true,
    simulationKind: "spaced_reinforcement",
    startMessage: resolveSimulationStartMessage(`Spaced reinforcement — ${competency}`, promptBody),
    practiceRoundsRequired: 1,
    practiceRoundsCompleted: 0,
    sourceCompetency: competency,
  };

  const { data: assignment, error } = await session.supabase
    .from("simulation_assignments")
    .insert({
      assigned_to: session.user.id,
      assigned_by: session.user.id,
      persona: `Skeptical buyer (reinforcement — ${competency})`,
      vertical,
      solution_focus: solutionFocus,
      difficulty,
      status: "not_started",
      session_data: sessionData,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    assignmentId: assignment.id,
    redirectUrl: `/simulations?focus=simulation&assignment=${assignment.id}`,
    competency,
  });
}
