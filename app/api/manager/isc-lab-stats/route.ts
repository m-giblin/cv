import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";

export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { data: team } = await session.supabase
    .from("profiles")
    .select("id, full_name")
    .eq("manager_id", session.user.id);

  const teamIds = (team ?? []).map((row) => row.id);
  if (teamIds.length === 0) {
    return NextResponse.json({ interactions: [], summary: { total: 0, last7Days: 0, topUsers: [] } });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: interactions } = await session.supabase
    .from("isc_lab_interactions")
    .select("id, user_id, mode, query, account_name, reply_preview, sources, model, created_at, recommended_cert_type, recommended_challenge_id")
    .in("user_id", teamIds)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  const nameById = new Map((team ?? []).map((row) => [row.id, row.full_name]));
  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);

  const countsByUser = new Map<string, number>();
  for (const row of interactions ?? []) {
    countsByUser.set(row.user_id, (countsByUser.get(row.user_id) ?? 0) + 1);
  }

  const topUsers = [...countsByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({ name: nameById.get(userId) ?? "SE", count }));

  return NextResponse.json({
    interactions: (interactions ?? []).map((row) => ({
      id: row.id,
      personName: nameById.get(row.user_id) ?? "SE",
      mode: row.mode,
      query: row.query,
      accountName: row.account_name,
      replyPreview: row.reply_preview,
      sourceCount: Array.isArray(row.sources) ? row.sources.length : 0,
      model: row.model,
      createdAt: row.created_at,
      recommendedCert: row.recommended_cert_type,
    })),
    summary: {
      total: interactions?.length ?? 0,
      last7Days: (interactions ?? []).filter((row) => new Date(row.created_at) >= last7).length,
      topUsers,
    },
  });
}
