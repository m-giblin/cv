import { NextResponse } from "next/server";
import { mapChallengeDetail } from "@/lib/data/get-challenges-page-data";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { id } = await context.params;
  const { data, error } = await supabase.from("challenges").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  return NextResponse.json({ challenge: mapChallengeDetail(data as DbChallenge) });
}
