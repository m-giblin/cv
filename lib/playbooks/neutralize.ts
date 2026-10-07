import { generateObject, type LanguageModel } from "ai";
import { guideBodySchema, playbookBodySchema, type GuideBody, type PlaybookBody } from "@/lib/playbooks/types";

/**
 * Sector-neutral rewrites: the same playbook structure with State, Local and Higher Education
 * specifics generalised so any sales team can use it. Drafts only; an admin reviews and publishes.
 */

export const NEUTRAL_AUDIENCE = "Sales professionals";

const RULES = `Rewrite rules:
- Keep the exact JSON structure, the same number of items in every list, and the same order. Do not add or drop items.
- Remove State, Local and Higher Education (SLED) specifics: "state agencies", "universities", "higher education", "students", "faculty", "CISO at Metro State University", "SLED", "public sector budgets", "fiscal year", "board of regents", "procurement cycles" and similar.
- Replace them with sector-neutral equivalents: "organizations", "enterprises", "employees, contractors and partners", "security leaders", "budget cycles". Keep it concrete and believable; don't make it vaguer than needed.
- Regulations: keep widely applicable ones (SOX, HIPAA, PCI DSS, GDPR, NIST, ISO 27001). Replace sector-only ones (FERPA, CJIS, state privacy acts for agencies) with a general phrase such as "industry regulations" or a widely applicable one that fits the point.
- Stories: keep each story's shape, numbers and outcome, but make the customer a generic organization (for example "a 12,000-employee healthcare network" or "a global manufacturer") instead of a state agency or university. Story segment labels stay as they are.
- Keep every SailPoint product name, capability, fact, number and limitation exactly as written. Do not invent new facts.
- Keep the voice, length and Challenger style. Plain sentences, no marketing fluff.
- Use American English spelling, matching the original (organization, prioritize, behavior).
- Text with nothing sector-specific stays word for word.`;

export async function neutralPlaybook(model: LanguageModel, title: string, body: PlaybookBody) {
  const result = await generateObject({
    model,
    schema: playbookBodySchema,
    prompt: `You are editing a sales playbook chapter titled "${title}" so it works for sales teams in any industry, not only State, Local and Higher Education.

${RULES}

Return the full chapter as JSON in the same shape as the input.

Chapter JSON:
${JSON.stringify(body)}`,
    maxOutputTokens: 16000,
    temperature: 0.2,
  });
  return { body: result.object, usage: result.usage };
}

export async function neutralGuide(model: LanguageModel, title: string, body: GuideBody) {
  const result = await generateObject({
    model,
    schema: guideBodySchema,
    prompt: `You are editing the front matter of a sales field guide titled "${title}" so it works for sales teams in any industry, not only State, Local and Higher Education. Section titles that name SLED should be renamed too (for example "Why Challenger Selling Wins in SLED" becomes "Why Challenger Selling Wins"). Set "audience" to "${NEUTRAL_AUDIENCE}". In the routing table rewrite only "leadWhen"; keep chapter numbers and capability names.

${RULES}

Return the full guide body as JSON in the same shape as the input.

Guide JSON:
${JSON.stringify(body)}`,
    maxOutputTokens: 16000,
    temperature: 0.2,
  });
  return { body: { ...result.object, audience: NEUTRAL_AUDIENCE }, usage: result.usage };
}

/** Every string in a body with its path, for showing what a draft changes. */
export function flattenText(value: unknown, path = ""): { path: string; text: string }[] {
  if (typeof value === "string") return value.trim() ? [{ path, text: value }] : [];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenText(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flattenText(item, path ? `${path}.${key}` : key));
  }
  return [];
}

/** The strings a draft changes, matched by position in the structure. */
export function draftChanges(current: unknown, draft: unknown) {
  const before = new Map(flattenText(current).map((item) => [item.path, item.text]));
  return flattenText(draft)
    .filter((item) => before.get(item.path) !== item.text)
    .map((item) => ({ path: item.path, before: before.get(item.path) ?? "", after: item.text }));
}

/** How many SLED-specific mentions a body has, to show what's left. */
export function sledMentions(value: unknown) {
  const pattern = /\b(SLED|state (?:and|&) local|higher education|higher ed|universit(?:y|ies)|state agenc(?:y|ies)|students?|faculty|FERPA|CJIS|K-12)\b/gi;
  return flattenText(value).reduce((sum, item) => sum + (item.text.match(pattern)?.length ?? 0), 0);
}
