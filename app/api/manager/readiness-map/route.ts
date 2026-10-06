import { after, NextResponse } from "next/server";
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

  // after() keeps the serverless context alive until the nudges finish, without making the
  // response wait on them. Operators shadowing the tenant aren't the SEs' manager, so skip.
  if (!session.isShadowing) {
    after(() =>
      checkAndNotifyThresholdCrossings(session.supabase, session.user.id, payload.rows).catch(() => undefined),
    );
  }

  return NextResponse.json(payload);
}
