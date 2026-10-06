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

/** Plain-text rendering of an article, used to ground the assistant. */
export function articleAsText(article: HelpArticle): string {
  const lines = [`# ${article.title}`, article.summary, ...(article.overview ?? [])];
  article.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.title}: ${step.body}${step.tip ? ` (Tip: ${step.tip})` : ""}`);
  });
  if (article.links?.length) lines.push(`Links: ${article.links.map((link) => `${link.label} (${link.href})`).join(", ")}`);
  return lines.join("\n");
}
