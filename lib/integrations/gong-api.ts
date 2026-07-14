export type GongAuthMode = "api_key" | "oauth" | "none";

export type GongCallRecord = {
  id: string;
  title: string;
  startedAt: string;
  durationSeconds: number;
  seTalkRatio: number | null;
  topics: string[];
};

export type GongCallIntel = {
  accountName: string;
  callCount: number;
  avgTalkRatio: number | null;
  objectionThemes: string[];
  summary: string;
  talkTrackHints: string[];
  riskSignals: string[];
  calls: GongCallRecord[];
  source: "gong" | "template";
};

function accountKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function basicAuthHeader() {
  const key = process.env.GONG_ACCESS_KEY ?? process.env.GONG_API_KEY;
  const secret = process.env.GONG_ACCESS_SECRET ?? process.env.GONG_API_SECRET ?? "";
  if (!key) return null;
  const encoded = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${encoded}`;
}

function bearerAuthHeader(token: string) {
  return `Bearer ${token}`;
}

async function gongFetch(path: string, init: RequestInit, authHeader: string) {
  const response = await fetch(`https://api.gong.io${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Gong API ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function parseCalls(body: Record<string, unknown>, accountName: string): GongCallRecord[] {
  const calls = (body.calls as Array<Record<string, unknown>> | undefined) ?? [];
  const key = accountKey(accountName);

  return calls
    .filter((call) => {
      const meta = call.metaData as Record<string, unknown> | undefined;
      const title = String(meta?.title ?? "").toLowerCase();
      return title.includes(key) || key.split(" ").some((word) => word.length > 3 && title.includes(word));
    })
    .slice(0, 5)
    .map((call) => {
      const meta = call.metaData as Record<string, unknown>;
      const interaction = call.interaction as Record<string, unknown> | undefined;
      const speakers = (interaction?.speakers as Array<Record<string, unknown>> | undefined) ?? [];
      const seSpeaker = speakers.find((s) => /sales|rep|se|engineer/i.test(String(s.name ?? s.affiliation ?? "")));
      const totalTalk = speakers.reduce((sum, s) => sum + Number(s.talkTime ?? 0), 0);
      const seTalk = seSpeaker ? Number(seSpeaker.talkTime ?? 0) : null;
      const content = call.content as Record<string, unknown> | undefined;
      const topics = ((content?.topics as Array<Record<string, unknown>> | undefined) ?? [])
        .map((t) => String(t.name ?? ""))
        .filter(Boolean);

      return {
        id: String(meta.id ?? crypto.randomUUID()),
        title: String(meta.title ?? "Call"),
        startedAt: String(meta.started ?? new Date().toISOString()),
        durationSeconds: Number(meta.duration ?? 0),
        seTalkRatio: seTalk !== null && totalTalk > 0 ? Math.round((seTalk / totalTalk) * 100) : null,
        topics,
      };
    });
}

function templateIntel(accountName: string): GongCallIntel {
  return {
    accountName,
    callCount: 0,
    avgTalkRatio: null,
    objectionThemes: ["Competitor evaluation", "Timeline pressure", "Budget cycle"],
    summary: `Template intel for ${accountName} — connect Gong to unlock live call analytics.`,
    talkTrackHints: [
      "Open with last-call follow-up on governance drivers",
      "Confirm executive sponsor and procurement path",
      "Anchor agentic identity if AI tools surfaced",
    ],
    riskSignals: ["Champion turnover risk", "Parallel competitor eval"],
    calls: [],
    source: "template",
  };
}

function intelFromCalls(accountName: string, calls: GongCallRecord[]): GongCallIntel {
  const ratios = calls.map((c) => c.seTalkRatio).filter((r): r is number => r !== null);
  const avgTalkRatio =
    ratios.length > 0 ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null;

  const objectionThemes = [
    ...new Set(
      calls
        .flatMap((c) => c.topics)
        .filter((t) => /objection|competitor|concern|risk|budget|timeline/i.test(t)),
    ),
  ].slice(0, 5);

  const talkTrackHints: string[] = [];
  if (avgTalkRatio !== null && avgTalkRatio > 55) {
    talkTrackHints.push("SE talk ratio high — ask more discovery questions on the next call.");
  } else if (avgTalkRatio !== null) {
    talkTrackHints.push("Healthy talk balance — deepen executive storyline on outcomes.");
  }
  if (objectionThemes.length > 0) {
    talkTrackHints.push(`Revisit themes from Gong: ${objectionThemes.slice(0, 2).join(", ")}`);
  }
  talkTrackHints.push("Reference specific moments from the last recorded call.");

  return {
    accountName,
    callCount: calls.length,
    avgTalkRatio,
    objectionThemes: objectionThemes.length > 0 ? objectionThemes : ["Governance drivers", "Integration complexity"],
    summary: `${calls.length} Gong call${calls.length === 1 ? "" : "s"} matched ${accountName}. Avg SE talk ratio: ${avgTalkRatio ?? "n/a"}%.`,
    talkTrackHints,
    riskSignals:
      objectionThemes.length > 0
        ? objectionThemes
        : ["Review last call for competitive mentions", "Validate champion still engaged"],
    calls,
    source: "gong",
  };
}

export async function fetchGongCallIntel(
  accountName: string,
  options?: { oauthToken?: string | null },
): Promise<GongCallIntel> {
  const authHeader = options?.oauthToken
    ? bearerAuthHeader(options.oauthToken)
    : basicAuthHeader();

  if (!authHeader) {
    return templateIntel(accountName);
  }

  try {
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const body = await gongFetch(
      "/v2/calls/extensive",
      {
        method: "POST",
        body: JSON.stringify({
          filter: { fromDateTime: fromDate },
          contentSelector: {
            exposedFields: {
              parties: true,
              content: true,
              interaction: { speakers: true },
              media: false,
            },
          },
        }),
      },
      authHeader,
    );

    const calls = parseCalls(body, accountName);
    if (calls.length === 0) {
      return {
        ...templateIntel(accountName),
        source: "gong",
        summary: `Gong connected — no calls matched "${accountName}" in the last 90 days.`,
      };
    }

    return intelFromCalls(accountName, calls);
  } catch {
    return templateIntel(accountName);
  }
}

export { accountKey as gongAccountKey };
