import { NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { shadowCookieOptions, SHADOW_TENANT_COOKIE, SHADOW_TENANT_NAME_COOKIE, SHADOW_MODE_COOKIE } from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
 const supabase = await createClient();

 if (supabase) {
 await supabase.auth.signOut();
 }

 const redirectUrl = new URL(AUTH_ROUTES.login, request.url);
 const response = NextResponse.redirect(redirectUrl);
 const cleared = { ...shadowCookieOptions(0), maxAge: 0 };
 response.cookies.set(SHADOW_TENANT_COOKIE, "", cleared);
 response.cookies.set(SHADOW_TENANT_NAME_COOKIE, "", cleared);
 response.cookies.set(SHADOW_MODE_COOKIE, "", cleared);
 return response;
}
