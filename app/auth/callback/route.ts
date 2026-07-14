import { NextResponse } from "next/server";
import { getAccessTier } from "@/lib/auth/rbac";
import { clearShadowCookiesOnResponse } from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";
import { validateProfileTenantEmail } from "@/lib/auth/tenant-email";
import type { ProfileRole } from "@/lib/types";

export async function GET(request: Request) {
 const { searchParams, origin } = new URL(request.url);
 const code = searchParams.get("code");
 const next = searchParams.get("next") ?? "/dashboard";

 if (code) {
 const supabase = await createClient();

 if (supabase) {
 const { error } = await supabase.auth.exchangeCodeForSession(code);

 if (!error) {
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (user?.email) {
 const { data: profile } = await supabase
 .from("profiles")
 .select("role, tenant_id")
 .eq("id", user.id)
 .maybeSingle();

 const role = (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role;
 const tenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
 const emailError = await validateProfileTenantEmail(user.email, tenantId);
 if (emailError) {
 await supabase.auth.signOut();
 return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`);
 }

 const redirectPath =
 role && getAccessTier(role) === "super_admin" ? "/platform" : next;
 const response = NextResponse.redirect(`${origin}${redirectPath}`);
 if (role && getAccessTier(role) === "super_admin") {
 clearShadowCookiesOnResponse(response);
 }
 return response;
 }

 return NextResponse.redirect(`${origin}${next}`);
 }
 }
 }

 return NextResponse.redirect(`${origin}/login`);
}
