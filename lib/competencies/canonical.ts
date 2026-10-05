/**
 * Canonical competency taxonomy shared across all practice features.
 *
 * Every feature today names competencies slightly differently (free text in
 * Flight Check questions, pitch scenario seeds, team-readiness heatmap, and
 * the DB-seeded `competencies` table). This module is the single place that
 * reconciles those variants onto one canonical name, so cross-feature
 * aggregation (Readiness Map competency summary) compares like with like.
 */

export const CANONICAL_COMPETENCIES = [
  "Discovery",
  "Objection Handling",
  "Executive Demo Storytelling",
  "ISC Workflows and Forms",
  "Governance",
  "Agentic AI",
  "SLED Vertical Knowledge",
  "Competitive Positioning",
  "Entra ID / AD Connectors",
] as const;

export type CanonicalCompetency = (typeof CANONICAL_COMPETENCIES)[number];

/**
 * Maps every known free-text variant found across the codebase onto a
 * canonical name. Keys are lowercased for lookup; add new variants here
 * rather than writing another bespoke fuzzy-matcher at a call site.
 */
const ALIASES: Record<string, CanonicalCompetency> = {
  "discovery": "Discovery",
  "objection handling": "Objection Handling",
  "objection handling - shadow ai": "Objection Handling",
  "executive demo storytelling": "Executive Demo Storytelling",
  "isc workflows": "ISC Workflows and Forms",
  "isc workflows and forms": "ISC Workflows and Forms",
  "governance": "Governance",
  "agentic ai": "Agentic AI",
  "sled vertical knowledge": "SLED Vertical Knowledge",
  "competitive positioning": "Competitive Positioning",
  "entra id / ad connectors": "Entra ID / AD Connectors",
};

/**
 * Resolves a free-text competency string (from any feature) to a canonical
 * name. Tries an exact alias match first, then falls back to substring
 * matching against canonical names (mirrors the tolerance the older
 * per-feature fuzzy-matchers had, so existing loosely-tagged data still
 * resolves). Returns null when nothing reasonably matches, rather than
 * guessing.
 */
export function resolveCanonicalCompetency(raw: string | null | undefined): CanonicalCompetency | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;

  const exact = ALIASES[key];
  if (exact) return exact;

  for (const canonical of CANONICAL_COMPETENCIES) {
    const canonicalKey = canonical.toLowerCase();
    if (canonicalKey.includes(key) || key.includes(canonicalKey.split(" ")[0] ?? canonicalKey)) {
      return canonical;
    }
  }

  return null;
}
