import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { uniqueIds } from "@/lib/utils";

export type ReadinessFlag = {
  id: string;
  userId: string;
  dimName: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
};

/** Open score-dispute flags for the manager's team, most recent first. */
export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { data: org } = await session.supabase.rpc("get_profile_subtree", {
    root_profile_id: session.user.id,
  });
  const userIds = uniqueIds((org ?? []).map((row: { id: string }) => row.id));
  if (!userIds.length) {
    return NextResponse.json({ flags: [] });
  }

  const { data } = await session.supabase
    .from("readiness_signal_flags")
    .select("id, user_id, dim_name, reason, status, created_at")
    .in("user_id", userIds)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const flags: ReadinessFlag[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    dimName: row.dim_name,
    reason: row.reason,
    status: row.status as "open" | "resolved",
    createdAt: row.created_at,
  }));

  return NextResponse.json({ flags });
}
