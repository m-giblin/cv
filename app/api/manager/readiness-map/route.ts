import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import {
  buildReadinessMapPayload,
  coachingCardsFromDb,
} from "@/lib/manager/readiness-map-data";
import { uniqueIds, uniqueProfiles } from "@/lib/utils";

export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { data: org } = await session.supabase.rpc("get_profile_subtree", {
    root_profile_id: session.user.id,
  });
  const userIds = uniqueIds((org ?? []).map((row: { id: string }) => row.id));

  if (!userIds.length) {
    return NextResponse.json(buildReadinessMapPayload({
      profiles: [],
      plans: [],
      coachingCards: [],
      approvedCertCountByUser: {},
      labSessions30dByUser: {},
      pitchGradeByUser: {},
    }));
  }

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [plans, profilesResult, cardsResult, certsResult, labResult, pitchResult] = await Promise.all([
    fetchPlansForUsers(session.supabase, userIds, session.tenantId),
    session.supabase.from("profiles").select("id, email, full_name, role, level, manager_id, avatar_url, created_at").in("id", userIds),
    session.supabase
      .from("coaching_cards")
      .select("user_id, structured_output, is_practice, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    session.supabase
      .from("readiness_certifications")
      .select("user_id, status")
      .in("user_id", userIds)
      .eq("status", "approved"),
    session.supabase
      .from("isc_lab_interactions")
      .select("user_id, created_at")
      .in("user_id", userIds)
      .gte("created_at", since7d),
    session.supabase
      .from("pitch_submissions")
      .select("user_id, manager_grade, created_at")
      .in("user_id", userIds)
      .not("manager_grade", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const profiles = uniqueProfiles((profilesResult.data ?? []).map(mapProfile));
  const approvedCertCountByUser: Record<string, number> = {};
  for (const row of certsResult.data ?? []) {
    approvedCertCountByUser[row.user_id] = (approvedCertCountByUser[row.user_id] ?? 0) + 1;
  }

  const labSessions30dByUser: Record<string, number> = {};
  for (const row of labResult.data ?? []) {
    labSessions30dByUser[row.user_id] = (labSessions30dByUser[row.user_id] ?? 0) + 1;
  }

  const pitchGradeByUser: Record<string, number | null> = {};
  for (const row of pitchResult.data ?? []) {
    if (pitchGradeByUser[row.user_id] == null && row.manager_grade != null) {
      pitchGradeByUser[row.user_id] = row.manager_grade;
    }
  }

  const payload = buildReadinessMapPayload({
    profiles,
    plans,
    coachingCards: coachingCardsFromDb(cardsResult.data ?? []),
    approvedCertCountByUser,
    labSessions30dByUser,
    pitchGradeByUser,
  });

  return NextResponse.json(payload);
}
