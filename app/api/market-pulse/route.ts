import { NextResponse } from "next/server";
import { ensureMarketPulseWeek } from "@/lib/market-pulse/seed-week";
import { currentWeekId } from "@/lib/market-pulse/week";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

 const weekId = currentWeekId();
 const { questions } = await ensureMarketPulseWeek(supabase, weekId);

 const { data: priorResult } = await supabase
 .from("market_pulse_results")
 .select("score, total, submitted_at")
 .eq("user_id", user.id)
 .eq("week_id", weekId)
 .maybeSingle();

 const clientQuestions = questions.map(({ id, topic, question, options }) => ({
 id,
 topic,
 question,
 options,
 }));

 return NextResponse.json({
 weekId,
 questions: clientQuestions,
 submitted: priorResult
 ? {
 score: priorResult.score,
 total: priorResult.total,
 submittedAt: priorResult.submitted_at,
 }
 : null,
 });
}
