import type { HelpArticle } from "@/lib/help/types";

const STOP_WORDS = new Set(["a", "an", "the", "how", "do", "i", "to", "my", "is", "can", "what", "where", "of", "in", "on", "for", "and", "or", "with", "it", "me"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function haystacks(article: HelpArticle) {
  return {
    title: article.title.toLowerCase(),
    keywords: article.keywords.join(" ").toLowerCase(),
    summary: `${article.summary} ${article.category}`.toLowerCase(),
    body: [...(article.overview ?? []), ...article.steps.flatMap((step) => [step.title, step.body, step.tip ?? ""])]
      .join(" ")
      .toLowerCase(),
  };
}

/** Ranks articles for a query: title and keyword hits outweigh summary and body hits. */
export function searchHelp(articles: HelpArticle[], query: string, limit = 50): HelpArticle[] {
  const terms = tokenize(query);
  if (terms.length === 0) return articles.slice(0, limit);

  const scored = articles.map((article) => {
    const text = haystacks(article);
    let score = 0;
    let matched = 0;
    for (const term of terms) {
      let termScore = 0;
      if (text.title.includes(term)) termScore += 8;
      if (text.keywords.includes(term)) termScore += 6;
      if (text.summary.includes(term)) termScore += 3;
      if (text.body.includes(term)) termScore += 1;
      if (termScore > 0) matched += 1;
      score += termScore;
    }
    // Prefer articles that cover more of the query's words.
    return { article, score: score * (matched / terms.length) };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.article);
}

/** Question words that say nothing about which article fits ("where does X sit between Y and Z"). */
const QUESTION_FILLER = new Set([
  "does", "did", "are", "be", "was", "why", "when", "which", "who", "there", "this", "that", "these", "from", "about",
  "should", "would", "could", "will", "into", "at", "by", "as", "if", "so", "any", "you", "your", "we", "our", "between",
  "sit", "fit", "need", "want", "get", "explain", "tell", "difference", "vs", "versus", "work", "works",
]);

/** A word in the text counts when it is the term, its plural, or (for longer terms) starts with it. */
function hasWord(words: Set<string>, term: string): boolean {
  if (words.has(term) || words.has(`${term}s`) || words.has(`${term}es`)) return true;
  if (term.length < 5) return false;
  for (const word of words) if (word.startsWith(term)) return true;
  return false;
}

function wordSet(text: string): Set<string> {
  return new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
}

/** The score an article needs before the assistant cites it. */
export const HELP_RELEVANCE = { minScore: 6, minCoverage: 0.5, ofBest: 0.4 };

/**
 * How well an article answers a question, or 0 when it doesn't really. Whole words only (so "role" no
 * longer matches "roleplay" and "sit" no longer matches "position"), at least one hit in the title or
 * keywords, and at least half of the question's meaningful words found somewhere.
 */
export function helpRelevance(article: HelpArticle, query: string): number {
  const terms = [...new Set(tokenize(query).flatMap((term) => term.split("-")).filter((term) => term.length > 1 && !QUESTION_FILLER.has(term)))];
  if (terms.length === 0) return 0;
  const text = haystacks(article);
  const title = wordSet(text.title);
  const keywords = wordSet(text.keywords);
  const summary = wordSet(text.summary);
  const body = wordSet(text.body);
  let score = 0;
  let matched = 0;
  let strong = false;
  for (const term of terms) {
    let termScore = 0;
    if (hasWord(title, term)) termScore += 8;
    if (hasWord(keywords, term)) termScore += 6;
    if (termScore > 0) strong = true;
    if (hasWord(summary, term)) termScore += 3;
    if (hasWord(body, term)) termScore += 1;
    if (termScore > 0) matched += 1;
    score += termScore;
  }
  const coverage = matched / terms.length;
  if (!strong || coverage < HELP_RELEVANCE.minCoverage) return 0;
  const weighted = score * coverage;
  return weighted >= HELP_RELEVANCE.minScore ? weighted : 0;
}

/** Articles that genuinely match a question, best first; none rather than filler. */
export function relevantHelpArticles(articles: HelpArticle[], query: string, limit: number): HelpArticle[] {
  const scored = articles
    .map((article) => ({ article, score: helpRelevance(article, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  // Far weaker than the best match is a side hit, not an answer.
  const floor = (scored[0]?.score ?? 0) * HELP_RELEVANCE.ofBest;
  return scored
    .filter((item) => item.score >= floor)
    .slice(0, limit)
    .map((item) => item.article);
}

/** Plain-text rendering of an article, used to ground the assistant. */
export function articleAsText(article: HelpArticle): string {
  const lines = [`# ${article.title}`, article.summary, ...(article.overview ?? [])];
  article.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.title}: ${step.body}${step.tip ? ` (Tip: ${step.tip})` : ""}`);
  });
  if (article.links?.length) lines.push(`Links: ${article.links.map((link) => `${link.label} (${link.href})`).join(", ")}`);
  return lines.join("\n");
}
