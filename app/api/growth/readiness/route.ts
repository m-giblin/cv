import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReadinessMapPayload } from "@/lib/manager/readiness-map-fetch";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";

/**
 * SE self-view of the same readiness/competency payload the manager
 * Readiness Map uses, scoped to auth.uid() only — no team subtree lookup.
 * Sharing fetchReadinessMapPayload (rather than a parallel implementation)
 * is what keeps the self-view and manager-view numbers from drifting apart.
 */
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

  const tenantId = await resolveProfileTenantId(supabase, user.id);
  const payload = await fetchReadinessMapPayload(supabase, tenantId, [user.id]);

  return NextResponse.json({ row: payload.rows[0] ?? null });
}
