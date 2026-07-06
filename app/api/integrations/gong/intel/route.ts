import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchGongCallIntel, gongAccountKey } from "@/lib/integrations/gong-api";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  accountName: z.string().min(2),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  let oauthToken: string | null = null;

  if (supabase) {
    const { data: connection } = await supabase
      .from("integration_connections")
      .select("access_token, expires_at")
      .eq("user_id", session.user.id)
      .eq("provider", "gong")
      .maybeSingle();

    if (connection?.access_token) {
      const expired = connection.expires_at && new Date(connection.expires_at) < new Date();
      if (!expired) oauthToken = connection.access_token;
    }
  }

  const intel = await fetchGongCallIntel(parsed.data.accountName, { oauthToken });

  if (supabase) {
    await supabase.from("gong_call_intel").upsert(
      {
        user_id: session.user.id,
        account_name: parsed.data.accountName,
        account_key: gongAccountKey(parsed.data.accountName),
        call_count: intel.callCount,
        avg_talk_ratio: intel.avgTalkRatio,
        objection_themes: intel.objectionThemes,
        brief_summary: intel.summary,
        talk_track_hints: intel.talkTrackHints,
        risk_signals: intel.riskSignals,
        source: intel.source,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "account_key,user_id" },
    );
  }

  return NextResponse.json({ intel });
}

export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const accountName = url.searchParams.get("accountName");
  if (!accountName) {
    return NextResponse.json({ error: "accountName required" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    const intel = await fetchGongCallIntel(accountName);
    return NextResponse.json({ intel });
  }

  const { data: cached } = await supabase
    .from("gong_call_intel")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("account_key", gongAccountKey(accountName))
    .maybeSingle();

  if (cached) {
    return NextResponse.json({
      intel: {
        accountName: cached.account_name,
        callCount: cached.call_count,
        avgTalkRatio: cached.avg_talk_ratio,
        objectionThemes: cached.objection_themes,
        summary: cached.brief_summary,
        talkTrackHints: cached.talk_track_hints,
        riskSignals: cached.risk_signals,
        source: cached.source,
        calls: [],
      },
      cached: true,
    });
  }

  return NextResponse.json({ intel: null, cached: false });
}
