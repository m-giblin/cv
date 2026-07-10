import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";
import type { ProfileRole } from "@/lib/types";

const cachedTenantSettings = (tenantId: string) =>
 unstable_cache(() => loadPlatformSettings(tenantId), [`platform-settings-${tenantId}`], {
 revalidate: 120,
 });

export async function GET() {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ featureFlags: {} });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { data: profile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).maybeSingle();
 const role = (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role ?? "basic_se";
 const profileTenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
 const access = await getEffectiveAccess(role, profileTenantId);

 if (access.actualTier === "super_admin" && !access.isShadowing) {
 const settings = await cachedTenantSettings(DEFAULT_TENANT_ID)();
 return NextResponse.json({ featureFlags: settings.featureFlags, tenantId: null });
 }

 const tenantId = access.tenantId ?? profileTenantId ?? DEFAULT_TENANT_ID;
 const settings = await cachedTenantSettings(tenantId)();
 return NextResponse.json({ featureFlags: settings.featureFlags, tenantId });
}
