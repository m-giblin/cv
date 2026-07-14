import { NextResponse } from "next/server";
import { ensurePitchQueueForUser } from "@/lib/pitch/pitch-queue";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ queue: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await resolveProfileTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.json({ queue: [] });
  }

  const queue = await ensurePitchQueueForUser(supabase, user.id, tenantId);
  return NextResponse.json({ queue });
}
