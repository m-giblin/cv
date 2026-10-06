import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { fallbackPitchTips, pitchReviewPrompt, pitchReviewSchema, pitchScoreRows } from "@/lib/pitch/coach";

const coachSchema = z.object({
  title: z.string().min(3),
  reflection: z.string().min(10).max(6000),
  scenario: z.string().min(2),
});

/** AI pitch review: rubric scores and tips both come from the model. Without AI, tips only, no scores. */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = coachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { model, provider, modelName } = await resolveAiProviderForUser(session.supabase, session.user.id);
  if (!model) {
    return NextResponse.json({
      source: "rules",
      tips: fallbackPitchTips(parsed.data.reflection, parsed.data.scenario),
      scores: [],
    });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  try {
    const result = await generateObject({
      model,
      schema: pitchReviewSchema,
      prompt: pitchReviewPrompt(parsed.data),
      maxOutputTokens: 600,
      temperature: 0.2,
    });
    await logAiUsage(session.supabase, {
      feature: "pitch_coach",
      provider,
      model: modelName,
      userId: session.user.id,
      usage: result.usage,
    });
    return NextResponse.json({ source: "ai", tips: result.object.tips, scores: pitchScoreRows(result.object.scores) });
  } catch {
    return NextResponse.json({ error: "The AI review couldn't run just now. Try again in a moment." }, { status: 502 });
  }
}
