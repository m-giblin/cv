/** Lowercase, accents and punctuation removed, single spaces: "Joiner–Mover" -> "joiner mover". */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Query words, with a trailing plural "s" dropped so "simulations" still finds "simulation". */
export function searchTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(" ")
    .filter(Boolean)
    .map((token) => (token.length > 3 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token));
}

export type Searchable = {
  title: string;
  /** Summary, persona, topic and similar text that should match but rank below the title. */
  fields?: (string | null | undefined)[];
  /** Words that describe the kind of thing ("simulation", "playbook"), so "discovery simulation" works. */
  keywords?: string[];
};

/**
 * How well an item matches a query, or null when it doesn't. Every query word has to appear somewhere
 * (title, fields or keywords); the title counts most, and a word that starts a title word beats one
 * buried inside it.
 */
export function scoreMatch(query: string, item: Searchable): number | null {
  const tokens = searchTokens(query);
  if (!tokens.length) return null;
  const title = normalizeSearchText(item.title);
  const fields = normalizeSearchText((item.fields ?? []).filter(Boolean).join(" "));
  const keywords = normalizeSearchText((item.keywords ?? []).join(" "));
  const titleWords = title.split(" ");

  let score = 0;
  for (const token of tokens) {
    if (titleWords.some((word) => word.startsWith(token))) score += 12;
    else if (title.includes(token)) score += 8;
    else if (fields.includes(token)) score += 4;
    else if (keywords.includes(token)) score += 2;
    else return null;
  }

  const phrase = tokens.join(" ");
  if (title === phrase) score += 40;
  else if (title.startsWith(phrase)) score += 25;
  else if (title.includes(phrase)) score += 15;
  // Several words found together ("access profile") beat the same words scattered through the text.
  else if (tokens.length > 1 && fields.includes(phrase)) score += 6;
  else if (tokens.length > 1 && keywords.includes(phrase)) score += 3;
  return score;
}

/** Items that match, best first (ties keep their original order), at most `limit`. */
export function rankMatches<T>(query: string, items: T[], toSearchable: (item: T) => Searchable, limit = 5): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreMatch(query, toSearchable(item)) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}
