import type { SupabaseClient } from "@supabase/supabase-js";
import { gongAccountKey } from "@/lib/integrations/gong-api";
import type { Database } from "@/lib/database.types";

export type AccountPrepContext = {
  accountName: string;
  dealPrepSummary: string | null;
  gongSummary: string | null;
  talkTrackHints: string[];
  objectionThemes: string[];
  competitors: string | null;
  meetingDate: string | null;
  latestPrepSessionId: string | null;
};

export async function loadAccountPrepContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountName: string,
): Promise<AccountPrepContext | null> {
  const trimmed = accountName.trim();
  if (!trimmed) return null;

  const accountKey = gongAccountKey(trimmed);

  const [{ data: sessions }, { data: gongIntel }] = await Promise.all([
    supabase
      .from("deal_prep_sessions")
      .select("id, prep_output, competitors, meeting_date, account_name")
      .eq("user_id", userId)
      .ilike("account_name", trimmed)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("gong_call_intel")
      .select("brief_summary, talk_track_hints, objection_themes, source")
      .eq("user_id", userId)
      .eq("account_key", accountKey)
      .maybeSingle(),
  ]);

  const session = sessions?.[0];
  const prepOutput = session?.prep_output;
  let dealPrepSummary: string | null = null;

  if (prepOutput && typeof prepOutput === "object" && !Array.isArray(prepOutput)) {
    const output = prepOutput as {
      executiveSummary?: string;
      discoveryQuestions?: string[];
      objectionHandling?: Array<{ objection: string; response: string }>;
    };
    const parts = [
      output.executiveSummary,
      output.discoveryQuestions?.length ? `Discovery: ${output.discoveryQuestions.slice(0, 5).join("; ")}` : null,
      output.objectionHandling?.length
        ? `Objections: ${output.objectionHandling.map((o) => o.objection).join("; ")}`
        : null,
    ].filter(Boolean);
    dealPrepSummary = parts.join("\n") || null;
  }

  return {
    accountName: trimmed,
    dealPrepSummary,
    gongSummary: gongIntel?.brief_summary ?? null,
    talkTrackHints: Array.isArray(gongIntel?.talk_track_hints)
      ? (gongIntel.talk_track_hints as string[])
      : [],
    objectionThemes: Array.isArray(gongIntel?.objection_themes)
      ? (gongIntel.objection_themes as string[]).map(String)
      : [],
    competitors: session?.competitors ?? null,
    meetingDate: session?.meeting_date ?? null,
    latestPrepSessionId: session?.id ?? null,
  };
}

export function formatAccountPrepBlock(context: AccountPrepContext): string {
  return [
    `ACCOUNT PREP: ${context.accountName}`,
    context.meetingDate ? `Meeting date: ${context.meetingDate}` : null,
    context.competitors ? `Competitors: ${context.competitors}` : null,
    context.dealPrepSummary ? `Deal prep on file:\n${context.dealPrepSummary}` : null,
    context.gongSummary ? `Gong intel:\n${context.gongSummary}` : null,
    context.talkTrackHints.length ? `Talk track hints: ${context.talkTrackHints.join("; ")}` : null,
    context.objectionThemes.length ? `Objection themes from calls: ${context.objectionThemes.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
