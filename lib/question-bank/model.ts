/** Question bank types and pure logic (safe for the browser). */

export type QuestionSourceKind = "playbook" | "docs" | "developer" | "manual";
export type QuestionStatus = "draft" | "active" | "retired";
export type QuestionDifficulty = "easy" | "medium" | "hard";

/**
 * How banks are grouped, mirroring the two SailPoint sites (checked October 2026):
 * documentation.sailpoint.com's product list and developer.sailpoint.com's sections.
 * Topics are suggestions for the generate form; any topic can be typed.
 */
export type SolutionArea = { name: string; site: "docs" | "developer" | "field"; topics: string[] };

export const SOLUTION_AREAS: SolutionArea[] = [
  {
    name: "Identity Security Cloud (Human Fabric)",
    site: "docs",
    topics: [
      "Managing access: access profiles, roles and entitlements",
      "Access requests",
      "Certifications",
      "Provisioning",
      "Managing sources and aggregation",
      "Loading identity data and identity profiles",
      "Virtual appliances",
      "Workflows",
      "Forms",
      "Identity Graph",
      "Separation of duties",
      "Adaptive approvals",
      "Password management",
      "Response and remediation",
      "Shared Signals Framework",
      "Search",
      "Email notifications",
      "Slack and Teams integrations",
    ],
  },
  { name: "Machine Identity Security", site: "docs", topics: ["Machine accounts and ownership", "Machine identity discovery"] },
  { name: "Agent Identity Security", site: "docs", topics: ["AI agent discovery", "Governing AI agents"] },
  { name: "Agentic Fabric", site: "docs", topics: [] },
  { name: "Entro", site: "docs", topics: ["Secrets and non-human identity discovery"] },
  { name: "Privileged Task Automation", site: "docs", topics: [] },
  { name: "Shadow AI Remediation", site: "docs", topics: [] },
  { name: "Data Access Security", site: "docs", topics: ["Data classification", "Access reviews for unstructured data"] },
  { name: "Access Risk Management", site: "docs", topics: ["SoD for ERP applications", "Emergency access"] },
  { name: "Non-Employee Risk Management", site: "docs", topics: ["Non-employee lifecycle", "Risk scoring"] },
  { name: "Cloud Infrastructure Entitlement Management", site: "docs", topics: ["Cloud access governance for AWS, Azure and GCP"] },
  { name: "Accelerated Application Management", site: "docs", topics: [] },
  { name: "Identity Security Connectors", site: "docs", topics: ["Active Directory connector", "Workday connector", "Web Services connector"] },
  { name: "IdentityIQ", site: "docs", topics: [] },
  { name: "File Access Manager", site: "docs", topics: [] },
  { name: "APIs and authentication", site: "developer", topics: ["Authentication and personal access tokens", "Search API", "Identities API and pagination"] },
  { name: "Transforms", site: "developer", topics: ["Transform operations", "Nested and conditional transforms"] },
  { name: "Rules", site: "developer", topics: ["Cloud rules vs connector rules", "Rule Development Kit"] },
  { name: "MCP Server", site: "developer", topics: [] },
  { name: "Event triggers", site: "developer", topics: [] },
  { name: "Configuration management", site: "developer", topics: [] },
  { name: "SaaS connectivity", site: "developer", topics: ["Building a SaaS connector"] },
  { name: "UI plugins and UI Development Kit", site: "developer", topics: [] },
  { name: "SDKs and CLI", site: "developer", topics: [] },
  { name: "Selling and discovery", site: "field", topics: [] },
];

export const QUESTION_SOLUTIONS = SOLUTION_AREAS.map((area) => area.name);

export const DEFAULT_SOLUTION = QUESTION_SOLUTIONS[0]!;

/** Older banks were filed under names that have since changed. */
const SOLUTION_ALIASES: Record<string, string> = {
  "Identity Security Cloud": "Identity Security Cloud (Human Fabric)",
};

export function normalizeSolution(name: string) {
  return SOLUTION_ALIASES[name] ?? name;
}

/** Areas that fit a source: docs products for docs, developer sections for the developer portal. */
export function areasFor(kind: QuestionSourceKind) {
  if (kind === "docs") return SOLUTION_AREAS.filter((area) => area.site !== "developer");
  if (kind === "developer") return SOLUTION_AREAS.filter((area) => area.site === "developer");
  return SOLUTION_AREAS;
}

/** Sort key: the taxonomy order, unknown names last. */
export function solutionOrder(name: string) {
  const index = QUESTION_SOLUTIONS.indexOf(normalizeSolution(name));
  return index === -1 ? QUESTION_SOLUTIONS.length : index;
}

export type BankQuestion = {
  id: string;
  solution: string;
  sourceKind: QuestionSourceKind;
  playbookId: string | null;
  topic: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  competency: string;
  difficulty: QuestionDifficulty;
  stem: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  status: QuestionStatus;
  batchId: string | null;
  replacesId: string | null;
  createdAt: string;
};

export type QuestionStats = {
  shown: number;
  correct: number;
  /** How often each choice was picked, by index. */
  picks: number[];
};

export type QuestionHealth = { flag: "too_easy" | "too_hard" | "answer_key" | null; label: string };

/** Answers needed before a question's numbers mean anything. */
export const MIN_ATTEMPTS_FOR_HEALTH = 5;

/** Questions per quiz. */
export const QUIZ_LENGTH = 5;

/** A question seen within this many days goes to the back of the line. */
export const RECENT_DAYS = 21;

export const SOURCE_LABEL: Record<QuestionSourceKind, string> = {
  playbook: "Playbook",
  docs: "SailPoint docs",
  developer: "Developer portal",
  manual: "Written by hand",
};

/** A stable key for "the questions about one thing": a playbook, or a docs topic. */
export function sourceKey(question: Pick<BankQuestion, "sourceKind" | "playbookId" | "topic">) {
  return question.sourceKind === "playbook" ? `playbook:${question.playbookId}` : `${question.sourceKind}:${question.topic.trim().toLowerCase()}`;
}

/**
 * Flags questions worth a second look: nearly everyone gets it right (too easy), nearly nobody does
 * (too hard or unclear), or most people pick the same wrong answer (the key may be wrong).
 */
export function questionHealth(stats: QuestionStats | undefined, correctIndex: number): QuestionHealth {
  if (!stats || stats.shown < MIN_ATTEMPTS_FOR_HEALTH) {
    return { flag: null, label: stats?.shown ? `${stats.shown} answers so far` : "Not answered yet" };
  }
  const rate = stats.correct / stats.shown;
  const percent = `${Math.round(rate * 100)}% correct`;
  const wrong = stats.picks.map((count, index) => (index === correctIndex ? 0 : count));
  const topWrong = Math.max(0, ...wrong);
  if (topWrong / stats.shown > 0.5) return { flag: "answer_key", label: `${percent}; most pick the same wrong answer` };
  if (rate >= 0.95) return { flag: "too_easy", label: `${percent}; too easy` };
  if (rate <= 0.25) return { flag: "too_hard", label: `${percent}; too hard or unclear` };
  return { flag: null, label: percent };
}

/**
 * Picks a quiz so people don't see the same questions every time: never-seen questions first, then
 * the ones seen longest ago, with a shuffle inside each group and a spread of difficulties.
 * `lastSeen` maps question id to when this person last answered it (ISO).
 */
export function pickRotation<T extends Pick<BankQuestion, "id" | "difficulty">>(
  questions: T[],
  lastSeen: Map<string, string>,
  count = QUIZ_LENGTH,
  now = Date.now(),
  random: () => number = Math.random,
): T[] {
  const recentCutoff = now - RECENT_DAYS * 86_400_000;
  const ranked = questions
    .map((question) => {
      const seen = lastSeen.get(question.id);
      const seenAt = seen ? Date.parse(seen) : null;
      // 0: never seen, 1: seen a while ago, 2: seen recently. Within a tier, older first, then random.
      const tier = seenAt === null ? 0 : seenAt < recentCutoff ? 1 : 2;
      return { question, tier, seenAt: seenAt ?? 0, jitter: random() };
    })
    .sort((a, b) => a.tier - b.tier || a.seenAt - b.seenAt || a.jitter - b.jitter);

  // Take the best-ranked question of each difficulty in turn, so a quiz isn't all easy or all hard.
  const byDifficulty = new Map<string, typeof ranked>();
  for (const entry of ranked) byDifficulty.set(entry.question.difficulty, [...(byDifficulty.get(entry.question.difficulty) ?? []), entry]);
  const picked: typeof ranked = [];
  while (picked.length < count && [...byDifficulty.values()].some((list) => list.length)) {
    const heads = [...byDifficulty.values()]
      .filter((list) => list.length)
      .map((list) => list[0]!)
      .sort((a, b) => a.tier - b.tier || a.seenAt - b.seenAt || a.jitter - b.jitter);
    for (const head of heads) {
      if (picked.length >= count) break;
      picked.push(head);
      byDifficulty.get(head.question.difficulty)!.shift();
    }
  }
  // Shuffle the final order so difficulty doesn't follow a pattern.
  return picked
    .map((entry) => ({ entry, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ entry }) => entry.question);
}

/** Shuffles answer choices per quiz so the right answer isn't always in the same spot. */
export function shuffleChoices(choices: string[], correctIndex: number, random: () => number = Math.random) {
  const order = choices.map((_, index) => ({ index, key: random() })).sort((a, b) => a.key - b.key).map((item) => item.index);
  return { choices: order.map((index) => choices[index]!), order, correctIndex: order.indexOf(correctIndex) };
}

/** Groups answers into sittings (one quiz_id each) and scores them, oldest first. */
export function quizAttemptScores(attempts: { quiz_id: string; correct: boolean; created_at: string }[]) {
  const byQuiz = new Map<string, { correct: number; total: number; at: string }>();
  for (const row of attempts) {
    const entry = byQuiz.get(row.quiz_id) ?? { correct: 0, total: 0, at: row.created_at };
    entry.total += 1;
    if (row.correct) entry.correct += 1;
    byQuiz.set(row.quiz_id, entry);
  }
  return [...byQuiz.entries()]
    .map(([quizId, entry]) => ({ quizId, score: Math.round((entry.correct / entry.total) * 100), at: entry.at }))
    .sort((a, b) => a.at.localeCompare(b.at));
}
