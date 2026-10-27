/**
 * Applies a documentation/developer site review to the question bank: retires inaccurate questions,
 * rewrites ones that only had outdated names, and adds new questions with their source page.
 * Run: npx tsx scripts/apply-site-review.ts <docs|developer> <review.json>
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

type Review = {
  retire?: { id: string }[];
  rename?: { id: string; topic?: string; stem?: string; choices?: string[]; explanation?: string }[];
  questions: {
    solution: string;
    topic?: string;
    sourceUrl: string;
    sourceTitle: string;
    stem: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
    difficulty: string;
    competency: string;
  }[];
};

async function main() {
  const [kind, path] = process.argv.slice(2);
  if (kind !== "docs" && kind !== "developer") throw new Error("First argument must be docs or developer");
  const review = JSON.parse(readFileSync(path!, "utf8")) as Review;
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const now = new Date().toISOString();

  const retire = (review.retire ?? []).map((r) => r.id);
  if (retire.length) {
    const r = await db.from("question_bank").update({ status: "retired", retired_at: now, updated_at: now }).in("id", retire).eq("tenant_id", TENANT_ID);
    if (r.error) throw new Error(r.error.message);
  }
  console.log("Retired", retire.length);

  let renamed = 0;
  for (const item of review.rename ?? []) {
    const patch: Record<string, unknown> = { updated_at: now };
    if (item.stem && item.choices?.length === 4 && item.explanation) Object.assign(patch, { stem: item.stem, choices: item.choices, explanation: item.explanation });
    else if (item.topic) patch.topic = item.topic; // re-filed under another area
    else continue;
    const r = await db.from("question_bank").update(patch).eq("id", item.id).eq("tenant_id", TENANT_ID);
    if (r.error) throw new Error(r.error.message);
    renamed += 1;
  }
  console.log("Rewritten", renamed);

  const existing = new Set(((await db.from("question_bank").select("stem").eq("tenant_id", TENANT_ID)).data ?? []).map((q: { stem: string }) => q.stem));
  const batchId = randomUUID();
  const rows = review.questions
    .filter((q) => !existing.has(q.stem))
    .map((q) => {
      if (q.choices.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Bad question: ${q.stem}`);
      return {
        tenant_id: TENANT_ID,
        source_kind: kind,
        solution: q.solution,
        topic: q.solution,
        source_title: q.sourceTitle || q.topic || null,
        source_url: q.sourceUrl || null,
        competency: q.competency,
        difficulty: q.difficulty,
        stem: q.stem,
        choices: q.choices,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        status: "active",
        batch_id: batchId,
      };
    });
  for (let i = 0; i < rows.length; i += 50) {
    const r = await db.from("question_bank").insert(rows.slice(i, i + 50));
    if (r.error) throw new Error(r.error.message);
  }
  console.log("Added", rows.length);

  const live = ((await db.from("question_bank").select("source_kind, topic").eq("tenant_id", TENANT_ID).eq("status", "active").neq("source_kind", "playbook")).data ?? []) as { source_kind: string; topic: string }[];
  const counts: Record<string, number> = {};
  for (const q of live) counts[`${q.source_kind} · ${q.topic}`] = (counts[`${q.source_kind} · ${q.topic}`] ?? 0) + 1;
  console.log(counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
