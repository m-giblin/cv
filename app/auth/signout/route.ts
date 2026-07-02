import { NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const redirectUrl = new URL(AUTH_ROUTES.login, request.url);
  return NextResponse.redirect(redirectUrl);
}
