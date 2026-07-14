import { NextResponse } from "next/server";
import { listPitchScenarios } from "@/lib/pitch/pitch-queue";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ scenarios: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await resolveProfileTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.json({ scenarios: [] });
  }

  const url = new URL(request.url);
  const track = url.searchParams.get("track") ?? undefined;

  const scenarios = await listPitchScenarios(supabase, tenantId, { track });
  return NextResponse.json({ scenarios });
}
