import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import { loadTodayMentees } from "@/lib/mentoring/today-mentees";

/** People the signed-in person mentors, for the "You're mentoring" card on a manager's Today. */
export async function GET() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const admin = getTenantAdminClient() as unknown as SupabaseClient<Database> | null;
  if (!admin) return NextResponse.json({ mentees: [] });
  return NextResponse.json({ mentees: await loadTodayMentees(admin, session.user.id).catch(() => []) });
}
