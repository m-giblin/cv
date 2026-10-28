import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { searchSite } from "@/lib/search/site-search";

/** Top-bar search: playbooks, checks, practice, library, the person's ramp and the people they work with, in the viewer's tenant. */
export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ groups: [] });
  const context = await resolveTenantContext();
  if (!context?.tenantId) return NextResponse.json({ groups: [] });
  const settings = await loadPlatformSettings(context.tenantId);
  const groups = await searchSite(
    {
      supabase: session.supabase,
      userId: session.user.id,
      tenantId: context.tenantId,
      role: context.role,
      tier: context.tier,
      flags: settings.featureFlags,
    },
    query,
  );
  return NextResponse.json({ groups });
}
