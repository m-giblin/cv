import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { wordCount } from "@/lib/playbooks/drills";
import {
  fallbackPitchTips,
  pitchDrillPrompt,
  pitchDrillReviewSchema,
  pitchDrillScoreRows,
  pitchReviewPrompt,
  pitchReviewSchema,
  pitchScoreRows,
} from "@/lib/pitch/coach";

const coachSchema = z.object({
  title: z.string().min(3),
  /** Storyline notes. Required unless the pitch itself (transcript or typed) is sent. */
  reflection: z.string().max(6000).optional().default(""),
  scenario: z.string().min(2),
  scenarioId: z.string().uuid().optional(),
  /** What the rep actually said (transcribed) or typed. */
  pitchText: z.string().max(8000).optional(),
  mode: z.enum(["video", "voice", "text"]).optional(),
  durationSec: z.number().min(0).max(600).optional(),
});

/**
 * AI pitch review. Pitch drills made from a playbook are scored against the guide's own pitch
 * using what the rep said or typed; other scenarios are scored on the written storyline.
 * Without AI, the storyline path returns rule-based tips and no scores.
 */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = coachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add your pitch or a reflection first." }, { status: 400 });
  }
  const input = parsed.data;

  // A playbook drill carries the reference pitch the answer is compared with.
  let drill: { reference: string; maxDurationSec: number } | null = null;
  if (input.scenarioId) {
    const { data } = await session.supabase
      .from("pitch_scenario_templates")
      .select("reference_text, max_duration_sec")
      .eq("id", input.scenarioId)
      .maybeSingle();
    const row = data as { reference_text: string | null; max_duration_sec: number } | null;
    if (row?.reference_text) drill = { reference: row.reference_text, maxDurationSec: row.max_duration_sec };
  }

  const delivered = input.pitchText?.trim() ?? "";
  if (drill && wordCount(delivered) < 8) {
    return NextResponse.json(
      { error: "Record or type your pitch first. The review compares what you say with the guide's pitch." },
      { status: 400 },
    );
  }
  if (!drill && input.reflection.trim().length < 10 && wordCount(delivered) < 8) {
    return NextResponse.json({ error: "Add a reflection first. The AI coach needs your storyline." }, { status: 400 });
  }

  const { model, provider, modelName } = await resolveAiProviderForUser(session.supabase, session.user.id);
  if (!model) {
    return NextResponse.json({
      source: "rules",
      tips: fallbackPitchTips(delivered || input.reflection, input.scenario),
      scores: [],
    });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  try {
    if (drill) {
      const result = await generateObject({
        model,
        schema: pitchDrillReviewSchema,
        prompt: pitchDrillPrompt({
          scenario: input.scenario,
          reference: drill.reference,
          delivered,
          mode: input.mode ?? "text",
          durationSec: input.durationSec,
          maxDurationSec: drill.maxDurationSec,
        }),
        maxOutputTokens: 700,
        temperature: 0.2,
      });
      await logAiUsage(session.supabase, { feature: "pitch_coach", provider, model: modelName, userId: session.user.id, usage: result.usage });
      return NextResponse.json({
        source: "ai",
        kind: "drill",
        tips: result.object.tips,
        missed: result.object.missed,
        scores: pitchDrillScoreRows(result.object.scores),
        overTime: input.durationSec !== undefined && input.durationSec > drill.maxDurationSec + 3,
      });
    }

    const storyline = [input.reflection.trim(), delivered ? `What I said: ${delivered}` : ""].filter(Boolean).join("\n\n");
    const result = await generateObject({
      model,
      schema: pitchReviewSchema,
      prompt: pitchReviewPrompt({ title: input.title, reflection: storyline, scenario: input.scenario }),
      maxOutputTokens: 600,
      temperature: 0.2,
    });
    await logAiUsage(session.supabase, { feature: "pitch_coach", provider, model: modelName, userId: session.user.id, usage: result.usage });
    return NextResponse.json({ source: "ai", kind: "storyline", tips: result.object.tips, scores: pitchScoreRows(result.object.scores) });
  } catch {
    return NextResponse.json({ error: "The AI review couldn't run just now. Try again in a moment." }, { status: 502 });
  }
}
