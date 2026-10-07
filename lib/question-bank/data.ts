import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { DraftQuestion } from "@/lib/question-bank/generate";
import { completeKnowledgeCheckSteps } from "@/lib/question-bank/plan-completion";
import {
  normalizeSolution,
  pickRotation,
  questionHealth,
  sourceKey,
  type BankQuestion,
  type QuestionHealth,
  type QuestionSourceKind,
  type QuestionStats,
} from "@/lib/question-bank/model";

/** Question bank storage, quizzes and grading (service role; routes check who may do what). */

const COLUMNS =
  "id, solution, source_kind, playbook_id, topic, source_title, source_url, competency, difficulty, stem, choices, correct_index, explanation, status, batch_id, replaces_id, created_at";

type Row = {
  id: string;
  solution: string;
  source_kind: QuestionSourceKind;
  playbook_id: string | null;
  topic: string;
  source_title: string | null;
  source_url: string | null;
  competency: string;
  difficulty: BankQuestion["difficulty"];
  stem: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  status: BankQuestion["status"];
  batch_id: string | null;
  replaces_id: string | null;
  created_at: string;
};

function db(): SupabaseClient | null {
  return getTenantAdminClient() as unknown as SupabaseClient | null;
}

function mapRow(row: Row): BankQuestion {
  return {
    id: row.id,
    solution: normalizeSolution(row.solution),
    sourceKind: row.source_kind,
    playbookId: row.playbook_id,
    topic: row.topic,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    competency: row.competency,
    difficulty: row.difficulty,
    stem: row.stem,
    choices: row.choices,
    correctIndex: row.correct_index,
    explanation: row.explanation,
    status: row.status,
    batchId: row.batch_id,
    replacesId: row.replaces_id,
    createdAt: row.created_at,
  };
}

export type QuestionSource = { kind: QuestionSourceKind; playbookId: string | null; topic: string; title: string };

export type BankSource = QuestionSource & {
  key: string;
  /** The solution most of the bank's questions are filed under. */
  solution: string;
  active: number;
  drafts: number;
  retired: number;
  /** Active questions the stats flag for a second look. */
  flagged: number;
};

export type AdminQuestion = BankQuestion & { stats: QuestionStats; health: QuestionHealth };

async function loadStats(admin: SupabaseClient, tenantId: string, questionIds: string[]) {
  const stats = new Map<string, QuestionStats>();
  for (let start = 0; start < questionIds.length; start += 200) {
    const { data } = await admin
      .from("question_attempts")
      .select("question_id, chosen_index, correct")
      .eq("tenant_id", tenantId)
      .in("question_id", questionIds.slice(start, start + 200))
      .limit(20_000);
    for (const row of (data ?? []) as { question_id: string; chosen_index: number; correct: boolean }[]) {
      const entry = stats.get(row.question_id) ?? { shown: 0, correct: 0, picks: [0, 0, 0, 0, 0, 0] };
      entry.shown += 1;
      if (row.correct) entry.correct += 1;
      entry.picks[row.chosen_index] = (entry.picks[row.chosen_index] ?? 0) + 1;
      stats.set(row.question_id, entry);
    }
  }
  return stats;
}

/** Every question with its stats, grouped into sources, for the admin page. */
export async function loadBank(tenantId: string) {
  const admin = db();
  if (!admin) return null;
  const [{ data, error }, playbooks] = await Promise.all([
    admin.from("question_bank").select(COLUMNS).eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    admin.from("capability_playbooks").select("id, title, chapter, status, slug").eq("tenant_id", tenantId).order("chapter"),
  ]);
  if (error) return null;
  const questions = ((data ?? []) as Row[]).map(mapRow);
  const stats = await loadStats(
    admin,
    tenantId,
    questions.filter((question) => question.status !== "draft").map((question) => question.id),
  );
  const playbookRows = (playbooks.data ?? []) as { id: string; title: string; chapter: number; status: string; slug: string }[];
  const playbookTitle = new Map(playbookRows.map((row) => [row.id, `Ch. ${row.chapter} ${row.title}`]));

  const withStats: AdminQuestion[] = questions.map((question) => {
    const entry = stats.get(question.id) ?? { shown: 0, correct: 0, picks: [] };
    return { ...question, stats: entry, health: questionHealth(entry, question.correctIndex) };
  });

  const sources = new Map<string, BankSource>();
  const solutionVotes = new Map<string, Map<string, number>>();
  for (const question of withStats) {
    const key = sourceKey(question);
    const votes = solutionVotes.get(key) ?? new Map<string, number>();
    votes.set(question.solution, (votes.get(question.solution) ?? 0) + 1);
    solutionVotes.set(key, votes);
    const source = sources.get(key) ?? {
      key,
      solution: question.solution,
      kind: question.sourceKind,
      playbookId: question.playbookId,
      topic: question.topic,
      title: question.sourceKind === "playbook" ? (playbookTitle.get(question.playbookId ?? "") ?? "Playbook") : question.topic,
      active: 0,
      drafts: 0,
      retired: 0,
      flagged: 0,
    };
    if (question.status === "active") source.active += 1;
    if (question.status === "draft") source.drafts += 1;
    if (question.status === "retired") source.retired += 1;
    if (question.status === "active" && question.health.flag) source.flagged += 1;
    sources.set(key, source);
  }

  for (const [key, votes] of solutionVotes) {
    sources.get(key)!.solution = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  }

  return {
    questions: withStats,
    sources: [...sources.values()].sort((a, b) => b.drafts - a.drafts || a.title.localeCompare(b.title)),
    playbooks: playbookRows.filter((row) => row.status === "published").map((row) => ({ id: row.id, title: `Ch. ${row.chapter} ${row.title}`, chapter: row.chapter, slug: row.slug })),
  };
}

/** Questions already written for a source (any status), so new drafts don't repeat them. */
export async function existingStems(tenantId: string, source: QuestionSource) {
  const admin = db();
  if (!admin) return [];
  let query = admin.from("question_bank").select("stem").eq("tenant_id", tenantId).eq("source_kind", source.kind);
  query = source.kind === "playbook" ? query.eq("playbook_id", source.playbookId) : query.ilike("topic", source.topic.trim());
  const { data } = await query.order("created_at", { ascending: false }).limit(80);
  return ((data ?? []) as { stem: string }[]).map((row) => row.stem);
}

export async function insertDrafts(input: {
  tenantId: string;
  userId: string;
  source: QuestionSource;
  drafts: DraftQuestion[];
  sourceTitle?: string | null;
  pages?: { title: string; url: string }[];
  replacesId?: string | null;
  solution: string;
}) {
  const admin = db();
  if (!admin || !input.drafts.length) return { batchId: null, count: 0 };
  const batchId = randomUUID();
  const titleFor = (url?: string) => input.pages?.find((page) => page.url === url)?.title ?? input.sourceTitle ?? null;
  const rows = input.drafts.map((draft) => ({
    tenant_id: input.tenantId,
    solution: input.solution,
    source_kind: input.source.kind,
    playbook_id: input.source.playbookId,
    topic: input.source.topic.trim(),
    source_title: titleFor(draft.sourceUrl),
    source_url: draft.sourceUrl || input.pages?.[0]?.url || null,
    competency: draft.competency,
    difficulty: draft.difficulty,
    stem: draft.stem,
    choices: draft.choices,
    correct_index: draft.correctIndex,
    explanation: draft.explanation,
    status: "draft",
    batch_id: batchId,
    replaces_id: input.replacesId ?? null,
    created_by: input.userId,
  }));
  const { error } = await admin.from("question_bank").insert(rows);
  if (error) throw new Error(error.message);
  return { batchId, count: rows.length };
}

/**
 * Approves drafts (they join the rotation) or rejects them (retired, so they're never repeated).
 * "replace" also retires the source's current questions, so the fresh set takes over.
 */
export async function reviewQuestions(input: {
  tenantId: string;
  userId: string;
  ids: string[];
  action: "approve" | "reject";
  mode?: "add" | "replace";
}) {
  const admin = db();
  if (!admin) throw new Error("Service unavailable.");
  const { data } = await admin.from("question_bank").select(COLUMNS).eq("tenant_id", input.tenantId).in("id", input.ids);
  const picked = ((data ?? []) as Row[]).map(mapRow);
  if (!picked.length) return { approved: 0, retired: 0 };
  const now = new Date().toISOString();

  if (input.action === "reject") {
    await admin
      .from("question_bank")
      .update({ status: "retired", retired_at: now, reviewed_by: input.userId, updated_at: now })
      .in(
        "id",
        picked.map((question) => question.id),
      );
    return { approved: 0, retired: picked.length };
  }

  let retired = 0;
  const toRetire = new Set(picked.map((question) => question.replacesId).filter((id): id is string => Boolean(id)));
  if (input.mode === "replace") {
    for (const key of new Set(picked.map(sourceKey))) {
      const sample = picked.find((question) => sourceKey(question) === key)!;
      let query = admin.from("question_bank").select("id").eq("tenant_id", input.tenantId).eq("status", "active").eq("source_kind", sample.sourceKind);
      query = sample.sourceKind === "playbook" ? query.eq("playbook_id", sample.playbookId) : query.ilike("topic", sample.topic);
      const { data: current } = await query;
      for (const row of (current ?? []) as { id: string }[]) toRetire.add(row.id);
    }
  }
  for (const question of picked) toRetire.delete(question.id);
  if (toRetire.size) {
    await admin.from("question_bank").update({ status: "retired", retired_at: now, updated_at: now }).in("id", [...toRetire]);
    retired = toRetire.size;
  }
  await admin
    .from("question_bank")
    .update({ status: "active", reviewed_by: input.userId, updated_at: now })
    .in(
      "id",
      picked.map((question) => question.id),
    );
  return { approved: picked.length, retired };
}

/** What a learner sees: no answer key, choices in a fresh order each time. */
export type QuizQuestion = {
  id: string;
  stem: string;
  difficulty: string;
  choices: { index: number; text: string }[];
};

/** Quizzes people can take: every source with enough approved questions. */
export async function loadAvailableChecks(tenantId: string, userId: string) {
  const bank = await loadBank(tenantId);
  if (!bank) return [];
  const admin = db()!;
  const { data } = await admin
    .from("question_attempts")
    .select("question_id, correct, quiz_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  const attempts = (data ?? []) as { question_id: string; correct: boolean; quiz_id: string; created_at: string }[];
  const keyOf = new Map(bank.questions.map((question) => [question.id, sourceKey(question)]));

  return bank.sources
    .filter((source) => source.active >= 3)
    .map((source) => {
      const mine = attempts.filter((attempt) => keyOf.get(attempt.question_id) === source.key);
      const lastQuiz = mine[0]?.quiz_id;
      const last = mine.filter((attempt) => attempt.quiz_id === lastQuiz);
      return {
        key: source.key,
        kind: source.kind,
        solution: source.solution,
        title: source.title,
        // Playbook checks link back to their chapter.
        chapter: bank.playbooks.find((playbook) => playbook.id === source.playbookId)?.chapter ?? null,
        playbookSlug: bank.playbooks.find((playbook) => playbook.id === source.playbookId)?.slug ?? null,
        questions: source.active,
        lastScore: last.length ? Math.round((last.filter((attempt) => attempt.correct).length / last.length) * 100) : null,
        lastTakenAt: mine[0]?.created_at ?? null,
      };
    });
}

export async function serveQuiz(tenantId: string, userId: string, key: string): Promise<{ title: string; questions: QuizQuestion[] } | null> {
  const admin = db();
  if (!admin) return null;
  const bank = await loadBank(tenantId);
  const source = bank?.sources.find((item) => item.key === key);
  if (!bank || !source) return null;
  const pool = bank.questions.filter((question) => question.status === "active" && sourceKey(question) === key);

  const { data } = await admin
    .from("question_attempts")
    .select("question_id, created_at")
    .eq("user_id", userId)
    .in(
      "question_id",
      pool.map((question) => question.id),
    )
    .order("created_at", { ascending: false });
  const lastSeen = new Map<string, string>();
  for (const row of (data ?? []) as { question_id: string; created_at: string }[]) {
    if (!lastSeen.has(row.question_id)) lastSeen.set(row.question_id, row.created_at);
  }

  const picked = pickRotation(pool, lastSeen);
  return {
    title: source.title,
    questions: picked.map((question) => ({
      id: question.id,
      stem: question.stem,
      difficulty: question.difficulty,
      choices: question.choices
        .map((text, index) => ({ index, text, order: Math.random() }))
        .sort((a, b) => a.order - b.order)
        .map(({ index, text }) => ({ index, text })),
    })),
  };
}

export async function gradeQuiz(input: { tenantId: string; userId: string; answers: { questionId: string; chosenIndex: number }[] }) {
  const admin = db();
  if (!admin) throw new Error("Service unavailable.");
  const { data } = await admin
    .from("question_bank")
    .select(COLUMNS)
    .eq("tenant_id", input.tenantId)
    .in(
      "id",
      input.answers.map((answer) => answer.questionId),
    );
  const byId = new Map(((data ?? []) as Row[]).map((row) => [row.id, mapRow(row)]));
  const quizId = randomUUID();
  const results = input.answers
    .filter((answer) => byId.has(answer.questionId))
    .map((answer) => {
      const question = byId.get(answer.questionId)!;
      return {
        questionId: question.id,
        chosenIndex: answer.chosenIndex,
        correctIndex: question.correctIndex,
        correct: answer.chosenIndex === question.correctIndex,
        explanation: question.explanation,
        sourceTitle: question.sourceTitle,
        sourceUrl: question.sourceUrl,
      };
    });
  if (results.length) {
    await admin.from("question_attempts").insert(
      results.map((result) => ({
        tenant_id: input.tenantId,
        question_id: result.questionId,
        user_id: input.userId,
        chosen_index: result.chosenIndex,
        correct: result.correct,
        quiz_id: quizId,
      })),
    );
  }
  const score = results.length ? Math.round((results.filter((result) => result.correct).length / results.length) * 100) : 0;

  // A quiz comes from one bank; passing it can complete knowledge check steps on the person's plans.
  const keys = new Set(results.map((result) => sourceKey(byId.get(result.questionId)!)));
  const completedSteps =
    keys.size === 1
      ? await completeKnowledgeCheckSteps({ tenantId: input.tenantId, userId: input.userId, sourceKey: [...keys][0]!, score }).catch(() => [])
      : [];
  return { score, results, completedSteps };
}

export async function loadQuestion(tenantId: string, id: string) {
  const admin = db();
  if (!admin) return null;
  const { data } = await admin.from("question_bank").select(COLUMNS).eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!data) return null;
  const question = mapRow(data as Row);
  const stats = (await loadStats(admin, tenantId, [id])).get(id) ?? { shown: 0, correct: 0, picks: [] };
  return { ...question, stats, health: questionHealth(stats, question.correctIndex) };
}

export async function updateQuestion(tenantId: string, id: string, fields: Record<string, unknown>) {
  const admin = db();
  if (!admin) throw new Error("Service unavailable.");
  const { error } = await admin
    .from("question_bank")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Moves a whole bank (every question from one source) to another solution. */
export async function setSourceSolution(tenantId: string, source: Pick<QuestionSource, "kind" | "playbookId" | "topic">, solution: string) {
  const admin = db();
  if (!admin) throw new Error("Service unavailable.");
  let query = admin
    .from("question_bank")
    .update({ solution, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("source_kind", source.kind);
  query = source.kind === "playbook" ? query.eq("playbook_id", source.playbookId) : query.ilike("topic", source.topic.trim());
  const { error } = await query;
  if (error) throw new Error(error.message);
}

/** The solution a source is already filed under, so fresh sets land in the same group. */
export async function existingSolution(tenantId: string, source: QuestionSource) {
  const admin = db();
  if (!admin) return null;
  let query = admin.from("question_bank").select("solution").eq("tenant_id", tenantId).eq("source_kind", source.kind);
  query = source.kind === "playbook" ? query.eq("playbook_id", source.playbookId) : query.ilike("topic", source.topic.trim());
  const { data } = await query.order("created_at", { ascending: false }).limit(1);
  return ((data ?? []) as { solution: string }[])[0]?.solution ?? null;
}
