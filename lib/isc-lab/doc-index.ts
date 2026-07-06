import { SAILPOINT_CHALLENGE_LIBRARY } from "@/lib/challenges/sailpoint-challenge-library";

export type DocSourceKind = "documentation" | "developer" | "marketing" | "platform";

export type DocIndexEntry = {
  url: string;
  title: string;
  keywords: string[];
  source: DocSourceKind;
};

/** High-value pages beyond challenge library links. */
const CURATED_ENTRIES: DocIndexEntry[] = [
  {
    url: "https://documentation.sailpoint.com/saas/help/workflows/index.html",
    title: "ISC Workflows",
    keywords: ["workflow", "joiner", "leaver", "mover", "automation", "provision"],
    source: "documentation",
  },
  {
    url: "https://documentation.sailpoint.com/saas/help/certifications/certifications.html",
    title: "Access certifications",
    keywords: ["certification", "campaign", "attestation", "governance", "audit"],
    source: "documentation",
  },
  {
    url: "https://documentation.sailpoint.com/saas/help/provisioning/provisioning.html",
    title: "Provisioning",
    keywords: ["provision", "access profile", "entitlement", "lifecycle"],
    source: "documentation",
  },
  {
    url: "https://documentation.sailpoint.com/saas/help/search/search.html",
    title: "ISC Search",
    keywords: ["search", "query", "identity", "report", "stale", "admin"],
    source: "documentation",
  },
  {
    url: "https://developer.sailpoint.com/docs/tools/cli/",
    title: "SailPoint CLI",
    keywords: ["cli", "sail", "deploy", "workflow", "devops", "promotion"],
    source: "developer",
  },
  {
    url: "https://developer.sailpoint.com/docs/tools/cli/workflow",
    title: "CLI workflow commands",
    keywords: ["workflow", "cli", "export", "import", "pipeline"],
    source: "developer",
  },
  {
    url: "https://developer.sailpoint.com/docs/api/",
    title: "SailPoint APIs",
    keywords: ["api", "rest", "integration", "oauth", "token"],
    source: "developer",
  },
  {
    url: "https://www.sailpoint.com/products/agent-identity-security",
    title: "Agent Identity Security (AIS)",
    keywords: ["ais", "agent", "ai agent", "non-human", "machine identity"],
    source: "marketing",
  },
  {
    url: "https://www.sailpoint.com/products/identity-security-cloud",
    title: "Identity Security Cloud",
    keywords: ["isc", "identity security cloud", "governance", "iam"],
    source: "marketing",
  },
  {
    url: "https://www.sailpoint.com/solutions/zero-trust",
    title: "Zero Trust",
    keywords: ["zero trust", "zsp", "standing privilege", "least privilege"],
    source: "marketing",
  },
];

function titleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "resource";
    return path.replace(/[-_]/g, " ").replace(/\.html?$/i, "");
  } catch {
    return "SailPoint resource";
  }
}

function sourceFromUrl(url: string): DocSourceKind {
  if (url.includes("developer.sailpoint.com")) return "developer";
  if (url.includes("documentation.sailpoint.com")) return "documentation";
  if (url.includes("sailpoint.com")) return "marketing";
  return "documentation";
}

function keywordsFromChallenge(title: string, solutions: string[]): string[] {
  const tokens = `${title} ${solutions.join(" ")}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  return [...new Set(tokens)];
}

function buildLibraryIndex(): DocIndexEntry[] {
  const byUrl = new Map<string, DocIndexEntry>();

  for (const entry of CURATED_ENTRIES) {
    byUrl.set(entry.url, entry);
  }

  for (const challenge of SAILPOINT_CHALLENGE_LIBRARY) {
    for (const url of challenge.linkedResources ?? []) {
      if (!url.startsWith("http")) continue;
      if (byUrl.has(url)) continue;
      byUrl.set(url, {
        url,
        title: challenge.title,
        keywords: keywordsFromChallenge(challenge.title, challenge.linkedSolutions),
        source: sourceFromUrl(url),
      });
    }
  }

  return [...byUrl.values()];
}

export const ISC_LAB_DOC_INDEX: DocIndexEntry[] = buildLibraryIndex();

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

export function scoreDocEntry(entry: DocIndexEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  const haystack = `${entry.title} ${entry.keywords.join(" ")} ${entry.url}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 2;
    if (entry.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) score += 3;
  }

  return score;
}

export function rankDocEntries(query: string, limit = 4): DocIndexEntry[] {
  const tokens = tokenizeQuery(query);
  return [...ISC_LAB_DOC_INDEX]
    .map((entry) => ({ entry, score: scoreDocEntry(entry, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}
