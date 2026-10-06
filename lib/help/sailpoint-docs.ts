/**
 * SailPoint's public documentation, which Bosun may search live. Only these domains are ever
 * searched; the provider enforces the allowlist on its side, and we re-check every cited URL.
 */
export const SAILPOINT_DOC_DOMAINS = ["documentation.sailpoint.com", "developer.sailpoint.com"] as const;

/** Product, API and config terms that are worth a (paid) docs search. Platform how-to never is. */
const DOCS_WORTHY =
  /\b(sailpoint|identitynow|identity ?now|identity ?security ?cloud|isc|identityiq|iiq|nerm|atlas|api|apis|endpoint|sdk|cli|connector|connectors|transform|transforms|workflow|workflows|role mining|access profile|entitlement|certification campaign|lifecycle state|identity profile|saas connectivity|virtual appliance|beanshell|scim|oauth|personal access token)\b/i;

export function wantsDocsSearch(question: string): boolean {
  return DOCS_WORTHY.test(question);
}

export function isSailPointDocUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && SAILPOINT_DOC_DOMAINS.some((domain) => hostname === domain);
  } catch {
    return false;
  }
}

/** Unique, allowlisted doc links from the model's search sources, capped. */
export function docSourcesFrom(
  sources: { sourceType?: string; url?: string; title?: string }[] | undefined,
  limit = 4,
): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const source of sources ?? []) {
    if (!source.url || !isSailPointDocUrl(source.url) || seen.has(source.url)) continue;
    seen.add(source.url);
    out.push({ title: source.title?.trim() || new URL(source.url).pathname, url: source.url });
    if (out.length >= limit) break;
  }
  return out;
}
