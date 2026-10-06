import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";

const bodySchema = z.object({
  dimName: z.string().min(1).max(40),
  reason: z.string().min(3).max(500),
});

/** SE flags a readiness dimension score as inaccurate — visible to their manager for review. */
export async function POST(request: Request) {
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tenantId = await resolveProfileTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant on profile" }, { status: 400 });
  }

  const { error } = await supabase.from("readiness_signal_flags").insert({
    tenant_id: tenantId,
    user_id: user.id,
    dim_name: parsed.data.dimName,
    reason: parsed.data.reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
