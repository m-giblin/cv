import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Heartbeat from SessionTimeout while the person is clicking or typing. The middleware
 * refreshes the last-activity cookie for this path (or answers 401 if the session already
 * expired); this handler only confirms someone is signed in.
 */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
