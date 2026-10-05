import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { fetchReadinessMapPayload } from "@/lib/manager/readiness-map-fetch";
import { checkAndNotifyThresholdCrossings } from "@/lib/manager/readiness-nudges";
import { uniqueIds } from "@/lib/utils";

export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { data: org } = await session.supabase.rpc("get_profile_subtree", {
    root_profile_id: session.user.id,
  });
  const userIds = uniqueIds((org ?? []).map((row: { id: string }) => row.id));

  const payload = await fetchReadinessMapPayload(session.supabase, session.tenantId, userIds);

  // Awaited (not fire-and-forget) — serverless request contexts can be torn
  // down as soon as the handler returns, so a detached promise here could
  // silently never run. Don't let a notification failure break the page.
  try {
    await checkAndNotifyThresholdCrossings(session.supabase, session.user.id, payload.rows);
  } catch {
    // best-effort nudge — page load should not fail because of it
  }

  return NextResponse.json(payload);
}
