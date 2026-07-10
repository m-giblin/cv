import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCoachingAttestation } from "@/lib/ai/coaching-attestation";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { coachingCardPrompt } from "@/lib/ai/prompts";
import { coachingCardSchema } from "@/lib/ai/schemas";
import { resolveAiProvider } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/log-usage";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

const requestSchema = z.object({
 persona: z.string().min(2),
 vertical: z.string().min(2),
 solutionFocus: z.string().min(2),
 level: z.enum(["Basic", "Senior", "Advisory"]).default("Basic"),
 transcript: z.string().min(10),
 sledDebrief: z.boolean().optional(),
});

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = requestSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
 if (rateLimited) {
 return rateLimited;
 }

 const { model, provider, modelName } = await resolveAiProvider();

 if (!model) {
 const demoObject = {
 strengths: [
 "Connected the customer concern to identity governance outcomes.",
 "Kept the response concise and mostly persona-specific.",
 ],
 gaps: [
 "Missed an opportunity to ask a follow-up discovery question before recommending a path.",
 ],
 recommendedImprovements: [
 "Lead with one clarification question, then map the answer to a SailPoint capability and a measurable risk outcome.",
 ],
 score: 80,
 linkedCompetencies: ["Discovery", "Executive Demo Storytelling", "Objection Handling"],
 recommendedNextPractice:
 "Repeat the scenario with a tougher procurement or compliance objection and produce a two-minute close.",
 managerSummary:
 "The SE is progressing well and should focus the next practice rep on discovery depth and quantified business value.",
 };

 return NextResponse.json({
 provider,
 modelName,
 object: demoObject,
 attestationToken: createCoachingAttestation(session.user.id, demoObject),
 });
 }

 const result = await generateObject({
 model,
 schema: coachingCardSchema,
 prompt: coachingCardPrompt(parsed.data),
 experimental_telemetry: {
 isEnabled: true,
 functionId: "generate-coaching-card",
 },
 });

 await logAiUsage(session.supabase, {
 feature: "coaching_card",
 provider,
 model: modelName,
 userId: session.user.id,
 usage: result.usage,
 });

 return NextResponse.json({
 provider,
 modelName,
 object: result.object,
 usage: result.usage,
 attestationToken: createCoachingAttestation(session.user.id, result.object),
 });
}
