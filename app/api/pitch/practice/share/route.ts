import { NextResponse } from "next/server";
import { z } from "zod";
import { shareWithMentor } from "@/lib/mentoring/share-with-mentor";
import { PITCH_SHARED_EVENT, overallPitchScore, pitchSnippet } from "@/lib/pitch/pitch-step";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ practiceSessionId: z.string().uuid() });

/** "Share with my mentor": sends the SE's mentor a saved free-practice pitch and its score. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Save the pitch first." }, { status: 400 });
  }

  // Read with the SE's own session, so only their pitch can be shared.
  const { data: session } = await supabase
    .from("pitch_practice_sessions")
    .select("id, title, scenario_id, transcript, reflection_text, ai_scores")
    .eq("id", parsed.data.practiceSessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Pitch not found." }, { status: 404 });
  }

  const mentor = await shareWithMentor(admin, {
    menteeId: user.id,
    kind: "pitch",
    title: session.title,
    score: overallPitchScore(session.ai_scores),
    snippet: pitchSnippet(session.transcript ?? session.reflection_text, 20),
    eventType: PITCH_SHARED_EVENT,
    metadata: { practiceSessionId: session.id, scenarioId: session.scenario_id },
  });
  if (!mentor) {
    return NextResponse.json({ error: "You don't have a mentor on an active plan." }, { status: 400 });
  }

  return NextResponse.json({ success: true, mentorName: mentor.mentorName });
}
