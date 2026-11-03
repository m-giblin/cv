/**
 * What a tenant calls the people it trains: "SE" and "SEs" by default, "AE" and "AEs" in an AE
 * tenant. Page text, help and emails use these instead of writing "SE". Safe for the browser.
 */
export type LearnerTerms = { one: string; many: string };

export const DEFAULT_LEARNER_TERMS: LearnerTerms = { one: "SE", many: "SEs" };
export const LEARNER_TERM_MAX_LENGTH = 24;

/** The tenant's terms, falling back to SE/SEs; a singular with no plural gets an "s". */
export function resolveLearnerTerms(tenant: { learnerTerm?: string | null; learnerTermPlural?: string | null } | null): LearnerTerms {
  const one = tenant?.learnerTerm?.trim();
  if (!one) return DEFAULT_LEARNER_TERMS;
  return { one, many: tenant?.learnerTermPlural?.trim() || `${one}s` };
}

/** Letters whose spoken name starts with a vowel sound ("an SE", "an MBA"). */
const VOWEL_SOUND_LETTERS = new Set(["A", "E", "F", "H", "I", "L", "M", "N", "O", "R", "S", "X"]);

/** "an SE", "an AE", "a rep", "an account executive". */
export function withArticle(term: string) {
  const word = term.trim();
  const acronym = /^[A-Z]{2,}\b/.test(word);
  const vowel = acronym ? VOWEL_SOUND_LETTERS.has(word[0]!) : /^[aeiou]/i.test(word);
  return `${vowel ? "an" : "a"} ${word}`;
}

/** Possessive: "SE's" / "AEs'". */
export function possessive(term: string) {
  return term.endsWith("s") ? `${term}'` : `${term}'s`;
}

/**
 * Fills learner placeholders in fixed text (help articles, emails, AI prompts):
 * {learner} → "AE", {learners} → "AEs", {a learner} → "an AE", {learner's} → "AE's",
 * {learners'} → "AEs'". Text without placeholders comes back unchanged.
 */
export function fillLearnerTerms(text: string, terms: LearnerTerms = DEFAULT_LEARNER_TERMS) {
  return text
    .replaceAll("{a learner}", withArticle(terms.one))
    .replaceAll("{learners'}", possessive(terms.many))
    .replaceAll("{learner's}", possessive(terms.one))
    .replaceAll("{learners}", terms.many)
    .replaceAll("{learner}", terms.one);
}

/** fillLearnerTerms over every string inside a value (an article object, a list of steps). */
export function fillLearnerTermsDeep<T>(value: T, terms: LearnerTerms = DEFAULT_LEARNER_TERMS): T {
  if (typeof value === "string") return fillLearnerTerms(value, terms) as T;
  if (Array.isArray(value)) return value.map((item) => fillLearnerTermsDeep(item, terms)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, fillLearnerTermsDeep(inner, terms)])) as T;
  }
  return value;
}
