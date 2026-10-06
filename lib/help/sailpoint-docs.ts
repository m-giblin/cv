/**
 * SailPoint's public documentation, which Bosun may search live. Only these domains are ever
 * searched; the provider enforces the allowlist on its side, and we re-check every cited URL.
 */
export const SAILPOINT_DOC_DOMAINS = ["documentation.sailpoint.com", "developer.sailpoint.com"] as const;

/** Product, API and config terms that should always trigger a docs search. */
const DOCS_WORTHY =
  /\b(sailpoint|entro|ciem|cloud infrastructure entitlement|data access security|access risk management|file access manager|accelerated application management|non-human identit(y|ies)|machine identit(y|ies)|identitynow|identity ?now|identity ?security ?cloud|isc|identityiq|iiq|nerm|atlas|api|apis|endpoint|sdk|cli|connector|connectors|transform|transforms|workflow|workflows|role mining|access profile|entitlement|certification campaign|lifecycle state|identity profile|saas connectivity|virtual appliance|beanshell|scim|oauth|personal access token)\b/i;

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
    const title = source.title?.trim();
    out.push({ title: title && !/^\[?\d+\]?$/.test(title) ? title : titleFromDocUrl(source.url), url: source.url });
    if (out.length >= limit) break;
  }
  return out;
}

/** "documentation.sailpoint.com/entro/help/getting-started/about-entro.html" -> "Entro: About entro". */
export function titleFromDocUrl(url: string): string {
  const { hostname, pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  const words = (part: string) => part.replace(/\.html?$/, "").replace(/[-_]+/g, " ").trim();
  const page = words(parts.at(-1) ?? "") || (hostname.startsWith("developer") ? "Developer docs" : "Documentation");
  const product = parts[0] && parts.length > 1 ? words(parts[0]) : "";
  const label = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return product && product !== "docs" ? `${label(product)}: ${label(page)}` : label(page);
}

/** Models sometimes inline citations like "[[1]](https://…)" or "[1]"; sources are listed separately. */
export function stripCitations(text: string): string {
  return text
    .replace(/\s*\[\[\d+\]\]\([^)]*\)/g, "")
    .replace(/\s*\[\d+\]\([^)]*\)/g, "")
    .replace(/\s*\[\d+\](?!\()/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
