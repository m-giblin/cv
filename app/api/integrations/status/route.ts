import { NextResponse } from "next/server";
import { fetchGongCallBrief, isGongConfigured, isSlackConfigured } from "@/lib/integrations/gong-brief";
import { INTEGRATION_SIGNALS } from "@/lib/integrations/activity-signals";
import { createClient } from "@/lib/supabase/server";

async function userHasGongOAuth(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string) {
 const { data } = await supabase
 .from("integration_connections")
 .select("id")
 .eq("user_id", userId)
 .eq("provider", "gong")
 .not("access_token", "is", null)
 .maybeSingle();

 return Boolean(data);
}

export async function GET() {
 const supabase = await createClient();
 const {
 data: { user },
 } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

 const gongWorkspace = isGongConfigured();
 const gongUser = user && supabase ? await userHasGongOAuth(supabase, user.id) : false;
 const gongConnected = gongWorkspace || gongUser;
 const slackConnected = isSlackConfigured();

 const signals = INTEGRATION_SIGNALS.map((signal) => ({
 ...signal,
 status: signal.provider === "gong" && gongConnected ? ("connected" as const) : signal.provider === "slack" && slackConnected ? ("connected" as const) : signal.status,
 lastSync: gongConnected || slackConnected ? new Date().toISOString() : null,
 signalCount: gongConnected && signal.provider === "gong" ? 1 : slackConnected && signal.provider === "slack" ? 1 : 0,
 }));

 return NextResponse.json({
 signals,
 configured: { gong: gongConnected, slack: slackConnected, gongOAuth: gongUser },
 });
}

export async function POST(request: Request) {
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

 const body = (await request.json()) as { provider?: string; accountName?: string };

 if (body.provider === "gong" && body.accountName) {
 const brief = await fetchGongCallBrief(body.accountName);
 return NextResponse.json({ brief });
 }

 return NextResponse.json({
 message: "Set GONG_API_KEY or SLACK_BOT_TOKEN in environment to enable live integrations.",
 configured: { gong: isGongConfigured(), slack: isSlackConfigured() },
 });
}
