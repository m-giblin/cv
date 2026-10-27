import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { MentorAccessError } from "@/lib/mentoring/mentor-records";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MentorSession = { userId: string; admin: SupabaseClient<Database> };

/** Signed-in user plus the service client; every route then checks the mentor or manager relationship itself. */
export async function mentorSession(): Promise<MentorSession | NextResponse> {
  const supabase = await createClient();
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  if (!supabase || !admin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const user = await getVerifiedUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: user.id, admin };
}

export function mentorErrorResponse(error: unknown): NextResponse {
  if (error instanceof MentorAccessError) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ error: "Request failed." }, { status: 500 });
}
