import type { SupabaseClient } from "@supabase/supabase-js";
import { SAILPOINT_CHALLENGE_LIBRARY } from "@/lib/challenges/sailpoint-challenge-library";
import { formatAccountPrepBlock, loadAccountPrepContext } from "@/lib/isc-lab/account-context";
import { buildCertificationAndChallengeNudges } from "@/lib/isc-lab/certification-nudges";
import { rankDocEntries, tokenizeQuery, type DocIndexEntry } from "@/lib/isc-lab/doc-index";
import { formatGoldenAnswersBlock, loadGoldenAnswers } from "@/lib/isc-lab/golden-answers";
import { ISC_LAB_SYSTEM_CONTEXT } from "@/lib/isc-lab/knowledge-base";
import { searchKnowledgeChunks } from "@/lib/isc-lab/semantic-search";
import type { IscLabMode } from "@/lib/isc-lab/session-log";
import type { CertificationNudge, ChallengeNudge } from "@/lib/isc-lab/certification-nudges";

export type IscLabSource = {
  url: string;
  title: string;
  source: DocIndexEntry["source"] | "platform" | "battlecard";
  excerpt: string;
  fetchedAt: string;
  contentVersion: string;
  kind?: string;
  rank?: number;
};

const FETCH_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const pageCache = new Map<string, { expiresAt: number; excerpt: string }>();

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageExcerpt(url: string): Promise<string> {
  const cached = pageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.excerpt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SailPoint-SE-Enablement-ISC-Lab/1.0", Accept: "text/html" },
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!response.ok) return "";
    const text = htmlToText(await response.text()).slice(0, 2800);
    pageCache.set(url, { excerpt: text, expiresAt: Date.now() + CACHE_TTL_MS });
    return text;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPlatformContext(
  supabase: SupabaseClient,
  userId: string,
  query: string,
) {
  const [{ data: profile }, { data: cards }] = await Promise.all([
    supabase.from("profiles").select("level").eq("id", userId).maybeSingle(),
    supabase
      .from("coaching_cards")
      .select("structured_output")
      .eq("user_id", userId)
      .eq("is_practice", false)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const coachingGaps = new Set<string>();
  for (const card of cards ?? []) {
    const output = card.structured_output;
    if (!output || typeof output !== "object" || Array.isArray(output)) continue;
    const gaps = (output as { gaps?: unknown }).gaps;
    if (!Array.isArray(gaps)) continue;
    for (const gap of gaps) {
      if (typeof gap === "string" && gap.trim()) coachingGaps.add(gap.trim());
    }
  }

  const tokens = tokenizeQuery(query);
  const practiceChallenges = SAILPOINT_CHALLENGE_LIBRARY.filter((challenge) => {
    const haystack = `${challenge.title} ${(challenge.competencyNames ?? []).join(" ")} ${challenge.linkedSolutions.join(" ")}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  })
    .slice(0, 3)
    .map((challenge) => ({ title: challenge.title, href: `/challenges?challenge=${challenge.id}` }));

  return {
    coachingGaps: [...coachingGaps].slice(0, 5),
    practiceChallenges,
    level: profile?.level ?? "Basic",
  };
}

function mergeSources(...groups: IscLabSource[][]): IscLabSource[] {
  const byKey = new Map<string, IscLabSource>();
  for (const group of groups) {
    for (const source of group) {
      const key = source.url + source.title;
      const existing = byKey.get(key);
      if (!existing || (source.rank ?? 0) > (existing.rank ?? 0)) {
        byKey.set(key, source);
      }
    }
  }
  return [...byKey.values()].slice(0, 8);
}

export async function retrieveIscLabContext(input: {
  query: string;
  supabase: SupabaseClient;
  userId: string;
  mode?: IscLabMode;
  accountName?: string | null;
}): Promise<{
  sources: IscLabSource[];
  platform: Awaited<ReturnType<typeof loadPlatformContext>>;
  accountContext: Awaited<ReturnType<typeof loadAccountPrepContext>>;
  goldenAnswers: Awaited<ReturnType<typeof loadGoldenAnswers>>;
  nudges: { cert: CertificationNudge | null; challenge: ChallengeNudge | null };
  contextBlock: string;
}> {
  const mode = input.mode ?? "chat";
  const searchQuery =
    mode === "battlecard" ? `competitive ${input.query}` : input.query;

  const [ftsChunks, ranked, platform, goldenAnswers, accountContext, nudges] = await Promise.all([
    searchKnowledgeChunks(input.supabase, searchQuery, 6),
    Promise.resolve(rankDocEntries(searchQuery, 4)),
    loadPlatformContext(input.supabase, input.userId, input.query),
    loadGoldenAnswers(input.supabase, input.userId, input.query),
    input.accountName
      ? loadAccountPrepContext(input.supabase, input.userId, input.accountName)
      : Promise.resolve(null),
    buildCertificationAndChallengeNudges(input.supabase, input.userId, input.query),
  ]);

  const liveFetched = await Promise.all(
    ranked.map(async (entry) => {
      const excerpt = await fetchPageExcerpt(entry.url);
      const fetchedAt = new Date().toISOString();
      return {
        url: entry.url,
        title: entry.title,
        source: entry.source,
        excerpt,
        fetchedAt,
        contentVersion: `live-${fetchedAt.slice(0, 10)}`,
        kind: entry.source,
      } satisfies IscLabSource;
    }),
  );

  const goldenSources: IscLabSource[] = goldenAnswers.map((answer, index) => ({
    url: "/pitch",
    title: `Golden pitch: ${answer.title}`,
    source: "platform",
    excerpt: `${answer.reflection}\n${answer.managerFeedback ?? ""}`,
    fetchedAt: new Date().toISOString(),
    contentVersion: `peer-${index + 1}`,
    kind: "golden_pitch",
  }));

  const sources = mergeSources(
    ftsChunks,
    liveFetched.filter((item) => item.excerpt.length > 40),
    goldenSources,
  );

  const docBlock =
    sources.length > 0
      ? sources
          .map(
            (source, index) =>
              `[Source ${index + 1}] ${source.title} (${source.kind ?? source.source})\nURL: ${source.url}\nFetched: ${source.fetchedAt}\nVersion: ${source.contentVersion}\nExcerpt: ${source.excerpt}`,
          )
          .join("\n\n")
      : "No matching sources — use core enablement context and flag what to verify.";

  const goldenBlock = formatGoldenAnswersBlock(goldenAnswers);
  const accountBlock = accountContext ? formatAccountPrepBlock(accountContext) : "";
  const platformBlock = [
    platform.coachingGaps.length > 0 ? `Coaching gaps: ${platform.coachingGaps.join("; ")}` : null,
    platform.practiceChallenges.length > 0
      ? `Related challenges: ${platform.practiceChallenges.map((c) => c.title).join("; ")}`
      : null,
    nudges.cert ? `Certification nudge: ${nudges.cert.label} — ${nudges.cert.reason}` : null,
    nudges.challenge ? `Challenge nudge: ${nudges.challenge.title}` : null,
    `SE level: ${platform.level}`,
  ]
    .filter(Boolean)
    .join("\n");

  const modeInstruction =
    mode === "account_prep"
      ? "MODE: Account prep — produce a tight pre-call brief: executive summary, 5 discovery questions, top 3 objections with responses, and demo recommendation."
      : mode === "battlecard"
        ? "MODE: Competitive battlecard — structure: Acknowledge competitor strength, Gap, Discovery trap questions, SailPoint differentiation, proof point."
        : mode === "voice_objection"
          ? "MODE: Voice objection coach — stay in buyer character for one objection, then give a 2-sentence coaching note with exact words to use."
          : "";

  const contextBlock = [
    modeInstruction,
    `RETRIEVED KNOWLEDGE (cite with markdown links; include fetched date when relevant):\n${docBlock}`,
    goldenBlock ? `GOLDEN ANSWERS FROM PEER LIBRARY:\n${goldenBlock}` : null,
    accountBlock ? accountBlock : null,
    `PLATFORM CONTEXT:\n${platformBlock}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    sources,
    platform,
    accountContext,
    goldenAnswers,
    nudges,
    contextBlock,
  };
}

export function buildIscLabSystemPrompt(contextBlock: string): string {
  return `${ISC_LAB_SYSTEM_CONTEXT}

${contextBlock}

Response rules:
- Answer as a senior SailPoint SE coach.
- Prefer retrieved sources (docs, battlecards, golden pitches, account context) over general knowledge.
- Cite sources inline as [title](url) and mention when content was fetched when using live docs.
- End with one concrete next action (discovery question, demo step, challenge, or certification).`.trim();
}
