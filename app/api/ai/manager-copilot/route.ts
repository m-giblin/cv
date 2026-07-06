import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { resolveAiProvider } from "@/lib/ai/provider";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import type { ProfileRole } from "@/lib/types";

const requestSchema = z.object({
  strengths: z.array(z.string()).max(12),
  gaps: z.array(z.string()).max(12),
  transcript: z.string().max(24_000).optional(),
  context: z.string().max(8000).optional(),
});

function templateDraft(strengths: string[], gaps: string[]) {
  const strengthLine = strengths.length
    ? `Strongest moments: ${strengths.slice(0, 3).join("; ")}.`
    : "You showed solid engagement in the role-play.";
  const gapLine = gaps.length
    ? `Focus next on: ${gaps.slice(0, 3).join("; ")}.`
    : "Keep tightening discovery before jumping to product.";
  return `${strengthLine}\n\n${gapLine}\n\nFor the next round, open with two customer-context questions, then map one SailPoint outcome to their stated risk.`;
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

  const { strengths, gaps, transcript, context } = parsed.data;
  const { model } = await resolveAiProvider();

  if (!model) {
    return NextResponse.json({ draft: templateDraft(strengths, gaps), source: "template" });
  }

  const prompt = `You are a sales engineering manager drafting concise coaching feedback (3-5 sentences).
Strengths from the simulation: ${strengths.join("; ") || "none listed"}
Gaps: ${gaps.join("; ") || "none listed"}
${transcript ? `Transcript excerpt:\n${transcript.slice(0, 4000)}` : ""}
${context ? `\nAdditional context:\n${context.slice(0, 4000)}` : ""}

Write supportive, specific feedback the manager can edit before sending. No bullet lists.`;

  const result = await generateText({ model, prompt });

  return NextResponse.json({ draft: result.text.trim(), source: "ai" });
}
