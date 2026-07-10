import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGongCode } from "@/lib/integrations/gong-oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.redirect(new URL("/prep?gong=error", request.url));
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.redirect(new URL("/login", request.url));
 }

 const url = new URL(request.url);
 const code = url.searchParams.get("code");
 const state = url.searchParams.get("state");
 const cookieStore = await cookies();
 const expectedState = cookieStore.get("gong_oauth_state")?.value;

 if (!code || !state || state !== expectedState) {
 return NextResponse.redirect(new URL("/prep?gong=denied", request.url));
 }

 cookieStore.delete("gong_oauth_state");

 try {
 const tokens = await exchangeGongCode(code);
 const expiresAt = tokens.expires_in
 ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
 : null;

 await supabase.from("integration_connections").upsert(
 {
 user_id: user.id,
 provider: "gong",
 access_token: tokens.access_token,
 refresh_token: tokens.refresh_token ?? null,
 expires_at: expiresAt,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "user_id,provider" },
 );
 } catch {
 return NextResponse.redirect(new URL("/prep?gong=error", request.url));
 }

 return NextResponse.redirect(new URL("/prep?gong=connected", request.url));
}
