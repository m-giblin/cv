/**
 * Applies the Edition 9.0 question-bank review: retires questions that conflict with 9.0,
 * moves a few to a better chapter, and adds new questions for the 9.0 chapters and corrections.
 * Run: npx tsx scripts/apply-question-updates.ts <stale.json> <new-a.json> <new-b.json>
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

type Draft = { chapter: number; stem: string; choices: string[]; correctIndex: number; explanation: string; difficulty: string; competency: string };

async function main() {
  const [stalePath, ...newPaths] = process.argv.slice(2);
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const chapters = ((await db.from("capability_playbooks").select("id, chapter, title").eq("tenant_id", TENANT_ID)).data ?? []) as { id: string; chapter: number; title: string }[];
  const byChapter = new Map(chapters.map((c) => [c.chapter, c]));
  const now = new Date().toISOString();

  const stale = JSON.parse(readFileSync(stalePath!, "utf8")) as { retire: { id: string }[]; rechapter: { id: string; newChapter: number }[] };
  const retireIds = stale.retire.map((r) => r.id);
  for (let i = 0; i < retireIds.length; i += 50) {
    const r = await db.from("question_bank").update({ status: "retired", retired_at: now, updated_at: now }).in("id", retireIds.slice(i, i + 50)).eq("tenant_id", TENANT_ID);
    if (r.error) throw new Error(r.error.message);
  }
  console.log("Retired", retireIds.length);
  for (const move of stale.rechapter) {
    const target = byChapter.get(move.newChapter);
    if (!target) continue;
    const r = await db.from("question_bank").update({ playbook_id: target.id, updated_at: now }).eq("id", move.id);
    if (r.error) throw new Error(r.error.message);
  }
  console.log("Moved", stale.rechapter.length);

  const existing = new Set(((await db.from("question_bank").select("stem").eq("tenant_id", TENANT_ID).eq("source_kind", "playbook")).data ?? []).map((q: { stem: string }) => q.stem));
  const batchId = randomUUID();
  const rows: Record<string, unknown>[] = [];
  for (const path of newPaths) {
    for (const q of JSON.parse(readFileSync(path, "utf8")) as Draft[]) {
      const target = byChapter.get(q.chapter);
      if (!target || existing.has(q.stem)) continue;
      if (q.choices.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Bad question: ${q.stem}`);
      rows.push({
        tenant_id: TENANT_ID,
        source_kind: "playbook",
        playbook_id: target.id,
        topic: "",
        source_title: `Ch. ${target.chapter} ${target.title}`,
        competency: q.competency,
        difficulty: q.difficulty,
        stem: q.stem,
        choices: q.choices,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        status: "active",
        batch_id: batchId,
      });
    }
  }
  for (let i = 0; i < rows.length; i += 50) {
    const r = await db.from("question_bank").insert(rows.slice(i, i + 50));
    if (r.error) throw new Error(r.error.message);
  }
  console.log("Added", rows.length);

  const live = ((await db.from("question_bank").select("playbook_id").eq("tenant_id", TENANT_ID).eq("source_kind", "playbook").eq("status", "active")).data ?? []) as { playbook_id: string }[];
  for (const c of chapters.sort((a, b) => a.chapter - b.chapter)) {
    console.log(`Ch ${c.chapter}`.padEnd(6), live.filter((q) => q.playbook_id === c.id).length, c.title);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
