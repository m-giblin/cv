import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PITCH_SCENARIOS } from "@/lib/pitch/pitch-scenarios";

function competenciesFromTitle(title: string) {
  const match = PITCH_SCENARIOS.find((s) => title.toLowerCase().includes(s.label.toLowerCase().slice(0, 8)));
  return match?.competencies ?? [];
}

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ pitches: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();

  let teammateIds: string[] = [];

  if (profile?.manager_id) {
    const { data: teammates } = await supabase
      .from("profiles")
      .select("id")
      .eq("manager_id", profile.manager_id);
    teammateIds = (teammates ?? []).map((row) => row.id).filter((id) => id !== user.id);
  }

  if (teammateIds.length === 0) {
    return NextResponse.json({ pitches: [] });
  }

  const { data: rows } = await supabase
    .from("pitch_submissions")
    .select("id, title, user_id, manager_grade, created_at, status")
    .in("user_id", teammateIds)
    .eq("status", "reviewed")
    .order("created_at", { ascending: false })
    .limit(20);

  const pitchIds = (rows ?? []).map((row) => row.id);
  const { data: peerReviews } = pitchIds.length
    ? await supabase.from("pitch_peer_reviews").select("pitch_id, clarity_score, storyline_score, differentiation_score, endorsed").in("pitch_id", pitchIds)
    : { data: [] };

  const reviewsByPitch = new Map<string, typeof peerReviews>();
  for (const review of peerReviews ?? []) {
    const list = reviewsByPitch.get(review.pitch_id) ?? [];
    list.push(review);
    reviewsByPitch.set(review.pitch_id, list);
  }

  const userIds = [...new Set((rows ?? []).map((row) => row.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const pitches = (rows ?? []).map((row) => {
    const reviews = reviewsByPitch.get(row.id) ?? [];
    const peerScores = reviews.map((r) => (r.clarity_score + r.storyline_score + r.differentiation_score) / 3);
    const peerAvg = peerScores.length > 0 ? peerScores.reduce((a, b) => a + b, 0) / peerScores.length : null;
    const endorsementCount = reviews.filter((r) => r.endorsed).length;

    return {
      id: row.id,
      title: row.title,
      personName: nameById.get(row.user_id) ?? "Teammate",
      manager_grade: row.manager_grade,
      peer_avg: peerAvg,
      endorsement_count: endorsementCount,
      competencies: competenciesFromTitle(row.title),
      created_at: row.created_at,
    };
  });

  pitches.sort((a, b) => {
    if (b.endorsement_count !== a.endorsement_count) return b.endorsement_count - a.endorsement_count;
    return (b.peer_avg ?? 0) - (a.peer_avg ?? 0);
  });

  return NextResponse.json({ pitches });
}
