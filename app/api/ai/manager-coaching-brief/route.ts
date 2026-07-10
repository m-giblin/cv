import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { resolveAiProvider } from "@/lib/ai/provider";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import type { ProfileRole } from "@/lib/types";

const requestSchema = z.object({
  reviewType: z.string(),
  personName: z.string().max(200),
  title: z.string().max(500),
  strengths: z.array(z.string()).max(12).optional(),
  gaps: z.array(z.string()).max(12).optional(),
  managerSummary: z.string().max(4000).optional(),
  recommendedImprovements: z.array(z.string()).max(8).optional(),
  context: z.string().max(8000).optional(),
  isManagerGate: z.boolean().optional(),
});

function templateBrief(parsed: z.infer<typeof requestSchema>) {
  const strength =
    parsed.strengths?.[0] ??
    "Shows engagement with the scenario and willingness to practice.";
  const gap =
    parsed.gaps?.[0] ?? "Tighten discovery before jumping to product narrative.";
  const next =
    parsed.recommendedImprovements?.[0] ??
    "On the next rep, open with two customer-context questions before positioning.";
  return {
    brief: parsed.managerSummary?.trim()
      ? `${parsed.personName} submitted "${parsed.title}". ${parsed.managerSummary.trim()}`
      : `${parsed.personName} submitted "${parsed.title}" for your coaching sign-off.`,
    suggestedStrength: strength,
    suggestedGap: gap,
    suggestedNextAction: next,
    coachingQuestion: `What one behavior would you want ${parsed.personName.split(" ")[0]} to demonstrate on their next customer call?`,
    source: "template" as const,
  };
}

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile || getAccessTier((profile as { role: ProfileRole }).role) === "se") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  const fallback = templateBrief(parsed.data);
  const { model } = await resolveAiProvider();
  if (!model) {
    return NextResponse.json(fallback);
  }

  const prompt = `You are preparing a sales engineering manager to coach ${parsed.data.personName}.
Review type: ${parsed.data.reviewType}${parsed.data.isManagerGate ? " (segment gate — high stakes)" : ""}
Item: ${parsed.data.title}
Brief: ${parsed.data.managerSummary ?? "n/a"}
Strengths: ${(parsed.data.strengths ?? []).join("; ") || "n/a"}
Gaps: ${(parsed.data.gaps ?? []).join("; ") || "n/a"}
Coaching moments: ${(parsed.data.recommendedImprovements ?? []).join("; ") || "n/a"}
${parsed.data.context ? `Context:\n${parsed.data.context.slice(0, 2000)}` : ""}

Return JSON only with keys:
brief (2-3 sentences on what happened and what to validate),
suggestedStrength (one specific strength, max 120 chars),
suggestedGap (one specific gap, max 120 chars),
suggestedNextAction (one concrete next behavior, max 140 chars),
coachingQuestion (one question for a live 1:1, max 120 chars)`;

  try {
    const result = await generateText({ model, prompt });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(fallback);
    }
    const body = JSON.parse(match[0]) as {
      brief?: string;
      suggestedStrength?: string;
      suggestedGap?: string;
      suggestedNextAction?: string;
      coachingQuestion?: string;
    };
    return NextResponse.json({
      brief: body.brief ?? fallback.brief,
      suggestedStrength: body.suggestedStrength ?? fallback.suggestedStrength,
      suggestedGap: body.suggestedGap ?? fallback.suggestedGap,
      suggestedNextAction: body.suggestedNextAction ?? fallback.suggestedNextAction,
      coachingQuestion: body.coachingQuestion ?? fallback.coachingQuestion,
      source: "ai",
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
