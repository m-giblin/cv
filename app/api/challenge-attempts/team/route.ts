import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createAdminClient } from "@/lib/supabase/admin";

/** Canceled challenges in this manager's reporting line that are still waiting on the conversation. */
export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ items: [] });

  const { data: subtree } = await session.supabase.rpc("get_profile_subtree", { root_profile_id: session.user.id });
  const orgIds = (subtree ?? []).map((row) => row.id).filter((id) => id !== session.user.id);
  if (orgIds.length === 0) return NextResponse.json({ items: [] });

  const { data: attempts } = await admin
    .from("challenge_attempts")
    .select("id, user_id, challenge_id, canceled_at")
    .in("user_id", orgIds)
    .eq("status", "canceled")
    .is("restart_allowed_at", null)
    .order("canceled_at", { ascending: true });
  if (!attempts?.length) return NextResponse.json({ items: [] });

  const [{ data: challenges }, { data: people }] = await Promise.all([
    admin.from("challenges").select("id, title").in("id", attempts.map((row) => row.challenge_id)),
    admin.from("profiles").select("id, full_name").in("id", attempts.map((row) => row.user_id)),
  ]);
  const titles = new Map((challenges ?? []).map((row) => [row.id, row.title]));
  const names = new Map((people ?? []).map((row) => [row.id, row.full_name]));

  return NextResponse.json({
    items: attempts.map((row) => ({
      id: row.id,
      person: names.get(row.user_id) ?? "Someone on your team",
      title: titles.get(row.challenge_id) ?? "A challenge",
      canceledAt: row.canceled_at,
    })),
  });
}
