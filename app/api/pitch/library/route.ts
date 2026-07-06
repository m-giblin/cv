import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPeerPitches } from "@/lib/pitch/fetch-peer-pitches";

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ pitches: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pitches = await fetchPeerPitches(supabase, user.id);
  return NextResponse.json({ pitches });
}
