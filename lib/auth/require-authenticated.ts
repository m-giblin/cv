import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";

export type AuthenticatedSession = {
  supabase: SupabaseClient<Database>;
  user: User;
};

export async function requireAuthenticatedSession(): Promise<AuthenticatedSession | NextResponse> {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { supabase, user };
}
