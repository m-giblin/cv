import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { resolveAiProvider } from "@/lib/ai/provider";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import { defaultMarketPulseQuestions } from "@/lib/market-pulse/seed-week";
import { currentWeekId } from "@/lib/market-pulse/week";
import type { ProfileRole } from "@/lib/types";

const questionSchema = z.object({
 questions: z
 .array(
 z.object({
 id: z.string(),
 topic: z.enum(["agentic", "genai", "competitive", "sailpoint"]),
 question: z.string().min(20),
 options: z.array(z.string().min(3)).length(4),
 correctIndex: z.number().int().min(0).max(3),
 explanation: z.string().min(20),
 }),
 )
 .length(5),
});

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 const { data: profile } = await session.supabase
 .from("profiles")
 .select("role")
 .eq("id", session.user.id)
 .maybeSingle();

 const tier = profile ? getAccessTier((profile as { role: ProfileRole }).role) : "se";
 if (tier === "se") {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
 if (rateLimited) return rateLimited;

 const body = (await request.json().catch(() => ({}))) as { weekId?: string };
 const weekId = body.weekId ?? currentWeekId();

 const { model } = await resolveAiProvider();

 let questions = defaultMarketPulseQuestions();

 if (model) {
 const result = await generateObject({
 model,
 schema: questionSchema,
 prompt: `Generate exactly 5 multiple-choice questions for SailPoint SE weekly market pulse.
Topics: Agentic Fabric, AIS, GenAI vs Agentic AI, competitive positioning (Mindtickle/Seismic), ISC governance.
Each question needs 4 options, one correct answer, and a teaching explanation.
Use ids pulse-1 through pulse-5. Focus on 2026 agentic identity messaging.`,
 });
 questions = result.object.questions;
 }

 const { error } = await session.supabase.from("market_pulse_weeks").upsert(
 {
 week_id: weekId,
 questions,
 source: model ? "ai" : "seed",
 },
 { onConflict: "week_id" },
 );

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ weekId, questionCount: questions.length, source: model ? "ai" : "seed" });
}
