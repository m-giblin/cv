/**
 * Applies the Edition 9.1 question review to every tenant with the field guide:
 *  - retires Part 2 questions that 9.1 contradicts,
 *  - replaces outdated ones with a rewrite (the original is retired; the rewrite points at it, so its
 *    answer history stays with the old wording),
 *  - adds questions for new 9.1 material and for Part 3 (Ch 26–29).
 * The review was made against the SailPoint tenant; the other tenants' copies are matched by chapter and
 * question text. Questions already added (same chapter and text) are skipped, so a rerun is safe.
 *
 * Run: npx tsx scripts/apply-question-updates-9-1.ts <part2-review.json> <part3-a.json> [<part3-b.json> ...]   (dry run)
 *      add --apply to write.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const REVIEWED_TENANT = "00000000-0000-4000-8000-000000000001";

type Draft = { chapter: number; stem: string; choices: string[]; correctIndex: number; explanation: string; difficulty: string; competency: string };
type Review = {
  keep: string[];
  retire: { id: string; reason: string }[];
  rewrite: ({ id: string; reason: string } & Omit<Draft, "chapter">)[];
  add: Draft[];
};
type Question = { id: string; tenant_id: string; playbook_id: string; stem: string; status: string; replaces_id: string | null };
type Chapter = { id: string; tenant_id: string; chapter: number; title: string };

function check(draft: Omit<Draft, "chapter">) {
  if (draft.choices.length !== 4 || draft.correctIndex < 0 || draft.correctIndex > 3 || !draft.stem.trim() || !draft.explanation.trim()) {
    throw new Error(`Bad question: ${draft.stem}`);
  }
  if (!["easy", "medium", "hard"].includes(draft.difficulty)) throw new Error(`Bad difficulty on: ${draft.stem}`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const apply = process.argv.includes("--apply");
  const [reviewPath, ...newPaths] = args;
  if (!reviewPath) throw new Error("Pass the review JSON and the Part 3 question files.");
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const ok = <T,>(result: { data: T; error: { message: string } | null }, what: string): T => {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    return result.data;
  };

  const review = JSON.parse(readFileSync(reviewPath, "utf8")) as Review;
  const part3 = newPaths.flatMap((path) => JSON.parse(readFileSync(path, "utf8")) as Draft[]);
  [...review.rewrite, ...review.add, ...part3].forEach(check);

  const chapters = ok(await db.from("capability_playbooks").select("id, tenant_id, chapter, title, slug").gte("chapter", 18).lte("chapter", 29), "load chapters") as (Chapter & { slug: string })[];
  // Until 9.1 is imported, Ch 26 is the Master Narrative: Risk Center questions would land on it.
  const stale = chapters.filter((chapter) => chapter.chapter === 26 && chapter.slug !== "risk-center");
  if (stale.length) throw new Error("Import Edition 9.1 first (scripts/import-field-guide-9-1.ts): Ch 26 is not Risk Center yet.");
  const tenantIds = [...new Set(chapters.map((chapter) => chapter.tenant_id))];
  const tenants = ok(await db.from("tenants").select("id, name").in("id", tenantIds), "load tenants") as { id: string; name: string }[];
  const questions = ok(
    await db.from("question_bank").select("id, tenant_id, playbook_id, stem, status, replaces_id").in("playbook_id", chapters.map((chapter) => chapter.id)),
    "load questions",
  ) as Question[];
  const chapterOf = new Map(chapters.map((chapter) => [chapter.id, chapter]));

  // The reviewed tenant's question ids, as (chapter, stem) keys that every tenant's copy shares.
  const keyOf = (question: Question) => `${chapterOf.get(question.playbook_id)?.chapter}|${question.stem}`;
  const reviewed = new Map(questions.filter((q) => q.tenant_id === REVIEWED_TENANT).map((q) => [q.id, keyOf(q)]));
  for (const id of [...review.keep, ...review.retire.map((r) => r.id), ...review.rewrite.map((r) => r.id)]) {
    if (!reviewed.has(id)) throw new Error(`Review names a question that isn't in the SailPoint tenant: ${id}`);
  }
  const retireKeys = new Set(review.retire.map((r) => reviewed.get(r.id)!));
  const rewriteByKey = new Map(review.rewrite.map((r) => [reviewed.get(r.id)!, r]));
  const now = new Date().toISOString();

  for (const tenant of tenants) {
    const mine = questions.filter((q) => q.tenant_id === tenant.id);
    const live = mine.filter((q) => q.status !== "retired");
    const byChapter = new Map(chapters.filter((c) => c.tenant_id === tenant.id).map((c) => [c.chapter, c]));
    const existing = new Set(mine.map(keyOf));
    const toRetire = live.filter((q) => retireKeys.has(keyOf(q)));
    // A rewrite that keeps the old wording shares its key; skip questions that are already someone's rewrite or already replaced.
    const replaced = new Set(mine.map((q) => q.replaces_id).filter(Boolean));
    const toRewrite = live.filter((q) => rewriteByKey.has(keyOf(q)) && !q.replaces_id && !replaced.has(q.id));
    const batchId = randomUUID();
    const row = (chapter: Chapter, draft: Omit<Draft, "chapter">, replacesId?: string) => ({
      tenant_id: tenant.id,
      source_kind: "playbook",
      playbook_id: chapter.id,
      topic: "",
      source_title: `Ch. ${chapter.chapter} ${chapter.title}`,
      competency: draft.competency,
      difficulty: draft.difficulty,
      stem: draft.stem,
      choices: draft.choices,
      correct_index: draft.correctIndex,
      explanation: draft.explanation,
      status: "active",
      batch_id: batchId,
      replaces_id: replacesId ?? null,
    });
    const inserts: Record<string, unknown>[] = [];
    for (const question of toRewrite) {
      const rewrite = rewriteByKey.get(keyOf(question))!;
      const chapter = chapterOf.get(question.playbook_id)!;
      inserts.push(row(chapter, rewrite, question.id));
    }
    let missingChapter = 0;
    for (const draft of [...review.add, ...part3]) {
      const chapter = byChapter.get(draft.chapter);
      if (!chapter) {
        missingChapter += 1;
        continue;
      }
      if (!existing.has(`${draft.chapter}|${draft.stem}`)) inserts.push(row(chapter, draft));
    }
    const retireIds = [...toRetire, ...toRewrite].map((q) => q.id);
    console.log(
      `${tenant.name}: retire ${toRetire.length}, rewrite ${toRewrite.length}, add ${inserts.length - toRewrite.length}${missingChapter ? ` (${missingChapter} skipped: chapter not imported yet)` : ""}`,
    );
    if (!apply) continue;

    for (let i = 0; i < retireIds.length; i += 50) {
      ok(
        await db.from("question_bank").update({ status: "retired", retired_at: now, updated_at: now }).in("id", retireIds.slice(i, i + 50)),
        "retire",
      );
    }
    for (let i = 0; i < inserts.length; i += 50) ok(await db.from("question_bank").insert(inserts.slice(i, i + 50)), "insert");
    const after = ok(
      await db.from("question_bank").select("playbook_id").eq("tenant_id", tenant.id).eq("status", "active").in("playbook_id", [...byChapter.values()].map((c) => c.id)),
      "count",
    ) as { playbook_id: string }[];
    for (const chapter of [...byChapter.values()].sort((a, b) => a.chapter - b.chapter)) {
      console.log(`  Ch ${chapter.chapter}`.padEnd(8), after.filter((q) => q.playbook_id === chapter.id).length, "active");
    }
  }
  if (!apply) console.log("\nDry run. Add --apply to write these changes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
