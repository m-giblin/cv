/**
 * Help Center content. Articles are data, not documents: the Help Center renders them, search
 * ranks them, and the AI assistant answers from them. Audience gates who can see an article:
 * SEs see "se"; managers see "se" and "manager"; tenant admins and operators see everything.
 */
export type HelpAudience = "se" | "manager" | "admin";

export type HelpStep = {
  /** Short imperative, e.g. "Open the program". */
  title: string;
  /** One to three sentences of exact instructions: what to click, what you'll see, what happens next. */
  body: string;
  /** Optional caution or shortcut shown under the step. */
  tip?: string;
};

export type HelpArticle = {
  /** Stable kebab-case id, unique across all articles (used in URLs: /help?article=<id>). */
  id: string;
  title: string;
  /** One or two sentences: what this is and when you'd use it. Shown in search results. */
  summary: string;
  audience: HelpAudience[];
  category: string;
  /** Extra search terms people might type (synonyms, old names, error text). */
  keywords: string[];
  /** Optional plain-language explanation shown before the steps (how it works, rules, limits). */
  overview?: string[];
  steps: HelpStep[];
  /** Deep links into the product, e.g. { label: "Open Programs", href: "/manager/programs" }. */
  links?: { label: string; href: string }[];
  /** Ids of related articles. */
  related?: string[];
};

export const HELP_AUDIENCE_LABELS: Record<HelpAudience, string> = {
  se: "Sales engineers",
  manager: "Managers",
  admin: "Admins",
};
