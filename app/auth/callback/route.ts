import { NextResponse } from "next/server";
import { getAccessTier } from "@/lib/auth/rbac";
import { clearShadowCookiesOnResponse } from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";
import { validateProfileTenantEmail } from "@/lib/auth/tenant-email";
import type { ProfileRole } from "@/lib/types";

/**
 * Only allow same-origin relative redirect targets. Rejects absolute URLs and
 * protocol-relative/backslash forms (e.g. `//evil.com`, `/\evil.com`, `@evil.com`)
 * that browsers would resolve to an external host — prevents open-redirect phishing.
 */
function safeNextPath(next: string | null): string {
 if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
 return "/dashboard";
 }
 return next;
}

export async function GET(request: Request) {
 const { searchParams, origin } = new URL(request.url);
 const code = searchParams.get("code");
 const next = safeNextPath(searchParams.get("next"));

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
