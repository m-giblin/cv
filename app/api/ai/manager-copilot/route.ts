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
 managerSummary: z.string().max(4000).optional(),
 recommendedImprovements: z.array(z.string()).max(8).optional(),
 transcript: z.string().max(24_000).optional(),
 context: z.string().max(8000).optional(),
});

function templateDraft(
 strengths: string[],
 gaps: string[],
 managerSummary?: string,
 recommendedImprovements?: string[],
) {
 const opener = managerSummary?.trim()
 ? `${managerSummary.trim()}\n\n`
 : strengths.length
 ? `Strongest moments: ${strengths.slice(0, 2).join("; ")}.\n\n`
 : "";

 const gapLine = gaps.length
 ? `Focus next on: ${gaps.slice(0, 2).join("; ")}.`
 : "Keep tightening discovery before jumping to product.";

 const moments =
 recommendedImprovements && recommendedImprovements.length > 0
 ? `\n\nTry this on your next round: ${recommendedImprovements[0]}`
 : "\n\nFor the next round, open with two customer-context questions, then map one SailPoint outcome to their stated risk.";

 return `${opener}${gapLine}${moments}`;
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

 const { strengths, gaps, transcript, context, managerSummary, recommendedImprovements } = parsed.data;
 const { model } = await resolveAiProvider();

 if (!model) {
 return NextResponse.json({
 draft: templateDraft(strengths, gaps, managerSummary, recommendedImprovements),
 source: "template",
 });
 }

 const prompt = `You are a sales engineering manager writing feedback after a simulation review.
You did NOT read the full transcript — use the session brief and coaching notes below.

Session brief: ${managerSummary?.trim() || "Not provided"}
Strengths: ${strengths.join("; ") || "none listed"}
Gaps: ${gaps.join("; ") || "none listed"}
Coaching moments to consider relaying: ${(recommendedImprovements ?? []).join("; ") || "none listed"}
${context ? `\nExtra context:\n${context.slice(0, 2000)}` : ""}
${!managerSummary && transcript ? `\nTranscript excerpt (only if brief missing):\n${transcript.slice(0, 3000)}` : ""}

Write manager-ready feedback in 3-5 sentences:
1) One sentence on what went well (specific, not generic)
2) One sentence on the highest-impact gap
3) One concrete coaching moment / phrase they should practice on the next round

Tone: direct, supportive, field-ready. No bullet lists. No markdown.`;

 const result = await generateText({ model, prompt });

 return NextResponse.json({ draft: result.text.trim(), source: "ai" });
}
