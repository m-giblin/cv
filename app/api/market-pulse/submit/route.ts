import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureMarketPulseWeek } from "@/lib/market-pulse/seed-week";
import { reinforceChallengesForAnswers } from "@/lib/market-pulse/reinforcement";
import { currentWeekId } from "@/lib/market-pulse/week";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

const submitSchema = z.object({
 weekId: z.string().min(4),
 answers: z.record(z.string(), z.number().int().min(0)),
});

export async function POST(request: Request) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const parsed = submitSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const weekId = parsed.data.weekId === currentWeekId() ? parsed.data.weekId : currentWeekId();
 const { questions } = await ensureMarketPulseWeek(supabase, weekId);

 const score = questions.filter((q) => parsed.data.answers[q.id] === q.correctIndex).length;
 const total = questions.length;
 const tenantId = await resolveProfileTenantId(supabase, user.id);

 const { error } = await supabase.from("market_pulse_results").upsert(
 {
 user_id: user.id,
 week_id: weekId,
 score,
 total,
 answers: parsed.data.answers,
 tenant_id: tenantId,
 },
 { onConflict: "user_id,week_id" },
 );

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const explanations = questions.map((q) => ({
 id: q.id,
 correctIndex: q.correctIndex,
 explanation: q.explanation,
 }));

 const reinforcements = reinforceChallengesForAnswers(parsed.data.answers);

 return NextResponse.json({ score, total, explanations, reinforcements });
}
