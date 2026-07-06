import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGongAuthorizeUrl, isGongOAuthConfigured } from "@/lib/integrations/gong-oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  if (!isGongOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Gong OAuth not configured",
        hint: "Set GONG_CLIENT_ID, GONG_CLIENT_SECRET, and GONG_REDIRECT_URI — or use GONG_API_KEY for workspace-level sync.",
      },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gong_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.json({ authorizeUrl: buildGongAuthorizeUrl(state) });
}
