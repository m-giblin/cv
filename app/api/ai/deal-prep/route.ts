import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dealPrepPrompt } from "@/lib/ai/prompts";
import { dealPrepSchema } from "@/lib/ai/schemas";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

const requestSchema = z.object({
 accountName: z.string().min(2),
 industry: z.string().min(2),
 solutions: z.array(z.string()).min(1),
 accountContext: z.string().min(20),
 level: z.enum(["Basic", "Senior", "Advisory"]).default("Basic"),
 meetingType: z.string().optional(),
 dealStage: z.string().optional(),
 attendees: z.string().optional(),
 competitors: z.string().optional(),
 regenerateFocus: z.string().optional(),
});

function demoDealPrep(parsed: z.infer<typeof requestSchema>) {
 return {
 accountName: parsed.accountName,
 industry: parsed.industry,
 solutions: parsed.solutions,
 accountContext: parsed.accountContext,
 meetingType: parsed.meetingType,
 likelyObjections: [
 "We already have Microsoft Entra governance — why add SailPoint?",
 "Implementation timeline seems long for our team size.",
 ],
 discoveryQuestions: [
 "Which identity decisions still require manual approval today?",
 "How do you certify access for contractors and machine identities?",
 "What audit findings are driving urgency this quarter?",
 ],
 stakeholderMap: [
 "CISO — cares about audit readiness and board-level risk metrics; lead with compliance outcomes",
 "IAM Director — owns day-to-day access reviews; map ISC workflows to their manual processes",
 ],
 competitiveLandmines: [
 "If they mention Okta: reframe from app SSO to enterprise-wide identity governance and non-human identities",
 ],
 proofPoints: [
 "Similar healthcare IDN reduced certification cycle time by 40% post-consolidation",
 "Demo flow: access review campaign → manager attestation → audit report export",
 ],
 riskFlags: [
 "No executive sponsor identified yet — validate economic buyer in first 15 minutes",
 "Active audit findings may compress timeline — confirm remediation deadline",
 ],
 talkTrackOutline: [
 "Open with their stated pain and business outcome, not product modules.",
 "Map ISC workflows to their top two identity risks.",
 "Close with a concrete next step: workshop, POC scope, or stakeholder map.",
 ],
 oneThingToNail: `Secure a follow-on workshop with the IAM lead to scope a targeted access review use case for ${parsed.accountName}.`,
 linkedResources: ["Identity Security Cloud overview", "Vertical reference architecture"],
 executiveSummary: `For ${parsed.accountName}, lead with measurable risk reduction and audit readiness in ${parsed.industry}. Tie ${parsed.solutions.join(" and ")} to outcomes the CISO and IAM lead care about.`,
 };
}

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

 const { model, provider, modelName } = await resolveAiProviderForUser(session.supabase, session.user.id);

 if (!model) {
 return NextResponse.json({
 provider,
 modelName,
 object: demoDealPrep(parsed.data),
 });
 }

 const result = await generateObject({
 model,
 schema: dealPrepSchema,
 prompt: dealPrepPrompt(parsed.data),
 experimental_telemetry: { isEnabled: true, functionId: "deal-prep" },
 });

 await logAiUsage(session.supabase, {
 feature: "deal_prep",
 provider,
 model: modelName,
 userId: session.user.id,
 usage: result.usage,
 });

 return NextResponse.json({ provider, modelName, object: result.object, usage: result.usage });
}
