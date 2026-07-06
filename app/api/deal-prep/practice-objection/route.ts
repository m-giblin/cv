import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import {
  buildObjectionPracticePrompt,
  resolveVerticalFromIndustry,
} from "@/lib/simulations/objection-practice-prompt";
import { resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";

const schema = z.object({
  objection: z.string().min(5),
  accountName: z.string().min(2),
  industry: z.string().min(2),
  solutionFocus: z.string().min(2).optional(),
  prepSessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vertical = resolveVerticalFromIndustry(parsed.data.industry);
  const solutionFocus = parsed.data.solutionFocus ?? "Identity Security Cloud";
  const difficulty = "intermediate" as const;
  const promptBody = buildObjectionPracticePrompt({
    objection: parsed.data.objection,
    accountName: parsed.data.accountName,
    industry: parsed.data.industry,
    vertical,
    solutionFocus,
    difficulty,
  });

  const sessionData = {
    promptSnapshot: promptBody,
    aiRoleplay: true,
    simulationKind: "objection_practice",
    startMessage: resolveSimulationStartMessage(
      `Objection practice — ${parsed.data.accountName}`,
      promptBody,
    ),
    practiceRoundsRequired: 1,
    practiceRoundsCompleted: 0,
    sourcePrepSessionId: parsed.data.prepSessionId ?? null,
    sourceObjection: parsed.data.objection,
  };

  const { data, error } = await session.supabase
    .from("simulation_assignments")
    .insert({
      assigned_to: session.user.id,
      assigned_by: session.user.id,
      persona: "Skeptical buyer (objection practice)",
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
    assignmentId: data.id,
    redirectUrl: `/simulations?focus=simulation&assignment=${data.id}`,
  });
}
