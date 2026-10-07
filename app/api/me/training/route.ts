import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { loadAssignedWork } from "@/lib/manager/assigned-work";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";

/** Training assigned to the signed-in person (managers included), with due dates and status. */
export async function GET() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const tenantId = await resolveEffectiveTenantId(session.supabase, session.user.id);
  if (!tenantId) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await loadAssignedWork(tenantId, [session.user.id]) });
}
