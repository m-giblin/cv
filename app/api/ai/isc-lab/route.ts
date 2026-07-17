import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { createNotification } from "@/lib/notifications/create-notification";
import { buildIscLabSystemPrompt, retrieveIscLabContext } from "@/lib/isc-lab/retrieve-context";
import { logIscLabInteraction, type IscLabMode } from "@/lib/isc-lab/session-log";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { requireUserFeature } from "@/lib/platform/require-feature";

const requestSchema = z.object({
 message: z.string().min(2).max(4000),
 mode: z.enum(["chat", "account_prep", "voice_objection", "battlecard", "pre_call_brief"]).default("chat"),
 accountName: z.string().max(200).optional(),
 history: z
 .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
 .max(12)
 .optional(),
});

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 const entitlement = await requireUserFeature(session.supabase, session.user.id, "isc-lab");
 if (entitlement) return entitlement;
 const aiEntitlement = await requireUserFeature(session.supabase, session.user.id, "ai-features");
 if (aiEntitlement) return aiEntitlement;

 const parsed = requestSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
 if (rateLimited) return rateLimited;

 const { message, history = [], mode, accountName } = parsed.data;
 const labMode = mode as IscLabMode;

 const retrieval = await retrieveIscLabContext({
 query: message,
 supabase: session.supabase,
 userId: session.user.id,
 mode: labMode,
 accountName: accountName ?? null,
 });

 const { provider, model, modelName } = await resolveAiProviderForUser(session.supabase, session.user.id);

 if (!model) {
 return NextResponse.json({
 reply:
 "ISC Lab needs Grok (xAI) or OpenAI configured in Admin → Settings. Offline tip: use competitive battlecards for Entra/Okta and position Agentic Fabric as discover-govern-protect.",
 source: "template",
 provider: null,
 model: null,
 sources: retrieval.sources,
 platform: retrieval.platform,
 nudges: retrieval.nudges,
 accountContext: retrieval.accountContext,
 });
 }

 const transcript = history.map((turn) => `${turn.role === "user" ? "SE" : "Assistant"}: ${turn.content}`).join("\n");

 const result = await generateText({
 model,
 system: buildIscLabSystemPrompt(retrieval.contextBlock),
 prompt: `${transcript ? `${transcript}\n` : ""}SE: ${message}\n\nAssistant:`,
 });

 const reply = result.text.trim();

 await logAiUsage(session.supabase, {
 feature: "isc_lab",
 provider,
 model: modelName,
 userId: session.user.id,
 usage: result.usage,
 });

 await logIscLabInteraction(session.supabase, {
 userId: session.user.id,
 mode: labMode,
 query: message,
 accountName,
 reply,
 sources: retrieval.sources,
 model: modelName,
 provider,
 recommendedChallengeId: retrieval.nudges.challenge?.challengeId ?? null,
 recommendedCertType: retrieval.nudges.cert?.certType ?? null,
 });

 if (retrieval.nudges.challenge) {
 await createNotification(session.supabase, {
 userId: session.user.id,
 title: "ISC Lab — practice challenge",
 body: retrieval.nudges.challenge.reason,
 actionUrl: retrieval.nudges.challenge.href,
 });
 }

 if (retrieval.nudges.cert) {
 await createNotification(session.supabase, {
 userId: session.user.id,
 title: "ISC Lab — certification path",
 body: retrieval.nudges.cert.reason,
 actionUrl: retrieval.nudges.cert.href,
 });
 }

 return NextResponse.json({
 reply,
 source: "ai",
 provider,
 model: modelName,
 sources: retrieval.sources,
 platform: retrieval.platform,
 nudges: retrieval.nudges,
 accountContext: retrieval.accountContext,
 goldenAnswers: retrieval.goldenAnswers,
 });
}
