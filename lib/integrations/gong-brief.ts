import { fetchGongCallIntel } from "@/lib/integrations/gong-api";

export type GongCallBrief = {
  accountName: string;
  summary: string;
  talkTrackHints: string[];
  riskSignals: string[];
  source: "gong" | "template";
  avgTalkRatio?: number | null;
  callCount?: number;
  objectionThemes?: string[];
};

export function isGongConfigured() {
  return Boolean(
    process.env.GONG_API_KEY ||
      process.env.GONG_ACCESS_KEY ||
      process.env.GONG_CLIENT_ID,
  );
}

export function isSlackConfigured() {
  return Boolean(process.env.SLACK_BOT_TOKEN);
}

export async function fetchGongCallBrief(
  accountName: string,
  options?: { oauthToken?: string | null },
): Promise<GongCallBrief> {
  const intel = await fetchGongCallIntel(accountName, options);
  return {
    accountName: intel.accountName,
    summary: intel.summary,
    talkTrackHints: intel.talkTrackHints,
    riskSignals: intel.riskSignals,
    source: intel.source,
    avgTalkRatio: intel.avgTalkRatio,
    callCount: intel.callCount,
    objectionThemes: intel.objectionThemes,
  };
}
