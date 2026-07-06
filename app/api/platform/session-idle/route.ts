import { NextResponse } from "next/server";
import { DEFAULT_SESSION_IDLE_MINUTES, sessionIdleMsFromMinutes } from "@/lib/platform/settings-shared";
import { getSessionIdleMs } from "@/lib/platform/settings";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({
      idleMs: sessionIdleMsFromMinutes(DEFAULT_SESSION_IDLE_MINUTES),
      idleMinutes: DEFAULT_SESSION_IDLE_MINUTES,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idleMs = await getSessionIdleMs();
  return NextResponse.json({
    idleMs,
    idleMinutes: Math.round(idleMs / 60_000),
  });
}
