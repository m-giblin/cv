import { NextResponse } from "next/server";
import { buildSeScorecard } from "@/lib/gamification/se-scorecard";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await getDashboardData(user.id);
  const org = data.myOrg.length > 0 ? data.myOrg : [data.currentUser];

  const reviewedChallengeCountByUser: Record<string, number> = {};
  const reviewedSimCountByUser: Record<string, number> = {};
  const reviewedPitchCountByUser: Record<string, number> = {};
  const flightCheckScoresByUser: Record<string, number> = {};

  for (const profile of org) {
    reviewedChallengeCountByUser[profile.id] = data.submissions.filter(
      (s) => s.userId === profile.id && s.status === "reviewed",
    ).length;
    reviewedSimCountByUser[profile.id] = data.coachingCards.filter(
      (c) => c.userId === profile.id && c.managerReviewStatus === "reviewed" && !c.isPractice,
    ).length;
  }

  const orgIds = org.map((p) => p.id);
  const { data: pitches } = await supabase
    .from("pitch_submissions")
    .select("user_id")
    .in("user_id", orgIds)
    .eq("status", "reviewed");

  for (const row of pitches ?? []) {
    reviewedPitchCountByUser[row.user_id] = (reviewedPitchCountByUser[row.user_id] ?? 0) + 1;
  }

  const { data: probes } = await supabase
    .from("adaptive_probe_sessions")
    .select("user_id, field_signal_score")
    .in("user_id", orgIds)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  for (const row of probes ?? []) {
    if (row.field_signal_score !== null && flightCheckScoresByUser[row.user_id] === undefined) {
      flightCheckScoresByUser[row.user_id] = row.field_signal_score;
    }
  }

  const scorecard = buildSeScorecard({
    profileId: user.id,
    org,
    coachingCards: data.coachingCards,
    reviewedChallengeCountByUser,
    reviewedSimCountByUser,
    reviewedPitchCountByUser,
    flightCheckScoresByUser,
  });

  return NextResponse.json({ scorecard });
}
