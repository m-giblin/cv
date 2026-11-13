/**
 * Updates every tenant's Edition 9.0 field guide to Edition 9.1 in place:
 *  - Part 2 chapters (18–25) get the 9.1 text and a new version (drills built on them show as out of date),
 *  - the Master Narrative moves from Ch 26 to Ch 30 with its 9.1 text,
 *  - Part 3 "Agentic Fabric: Protect" (Ch 26–29) is added and published,
 *  - the guide's front matter and routing table become 9.1.
 * Chapters keep their ids and slugs, so assignments, plan steps, reads and quiz history stay attached.
 * Chapters whose text did not change are left alone.
 *
 * Run: npx tsx scripts/import-field-guide-9-1.ts "<path to 9.1 .docx>"            (dry run: prints the plan)
 *      npx tsx scripts/import-field-guide-9-1.ts "<path to 9.1 .docx>" --apply
 *      add --from-json <parsed.json> to import a reviewed copy of the parsed guide instead of the .docx text
 */
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseFieldGuide } from "@/lib/playbooks/parse-field-guide";

/** 9.0 chapter → 9.1 chapter, where it moved. */
const MOVED: Record<number, number> = { 26: 30 };

function loadEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
      }),
  );
}

/** JSON with keys sorted: jsonb stores keys in its own order, so a plain stringify calls every chapter changed. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

type Row = { id: string; chapter: number; slug: string; title: string; version: number; body: unknown };

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!file) throw new Error("Pass the path to the Edition 9.1 .docx");

  const env = loadEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const ok = <T,>(result: { data: T; error: { message: string } | null }, what: string): T => {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    return result.data;
  };

  // A reviewed JSON copy (e.g. with product names edited) can stand in for parsing the .docx.
  const fromJson = process.argv.indexOf("--from-json");
  const parsed: ReturnType<typeof parseFieldGuide> =
    fromJson > 0
      ? JSON.parse(readFileSync(process.argv[fromJson + 1]!, "utf8"))
      : parseFieldGuide((await mammoth.extractRawText({ path: file })).value);
  if (parsed.warnings.length) console.log("Parser warnings:", parsed.warnings);
  if (parsed.edition !== "9.1" || parsed.playbooks.length !== 30) {
    throw new Error(`Expected Edition 9.1 with 30 chapters, got ${parsed.edition} with ${parsed.playbooks.length}.`);
  }
  const next = new Map(parsed.playbooks.map((playbook) => [playbook.chapter, playbook]));

  const guides = ok(
    await db.from("playbook_guides").select("id, tenant_id, edition").in("edition", ["9.0", "9.1"]),
    "load guides",
  ) as { id: string; tenant_id: string; edition: string }[];
  const tenants = ok(await db.from("tenants").select("id, name"), "load tenants") as { id: string; name: string }[];
  const tenantName = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
  const now = new Date().toISOString();

  for (const guide of guides) {
    const rows = ok(
      await db.from("capability_playbooks").select("id, chapter, slug, title, version, body").eq("guide_id", guide.id),
      "load chapters",
    ) as Row[];
    const plan: string[] = [];
    const updates: { row: Row; chapter: number; title: string; body: unknown }[] = [];
    for (const row of rows) {
      // Rerunning after the move: Ch 30 is already the Master Narrative.
      const target = row.chapter === 26 && row.slug !== "the-master-narrative" ? 26 : (MOVED[row.chapter] ?? row.chapter);
      const incoming = next.get(target);
      if (!incoming) throw new Error(`No 9.1 chapter for ${row.chapter} ${row.slug}`);
      if (incoming.slug !== row.slug && target !== 23) throw new Error(`Chapter ${target} slug mismatch: ${row.slug} vs ${incoming.slug}`);
      const changed = stable(incoming.body) !== stable(row.body) || incoming.title !== row.title || target !== row.chapter;
      if (!changed) continue;
      updates.push({ row, chapter: target, title: incoming.title, body: incoming.body });
      plan.push(
        `  update Ch ${row.chapter}${target !== row.chapter ? ` -> Ch ${target}` : ""} ${incoming.title}${incoming.title !== row.title ? ` (was "${row.title}")` : ""} v${row.version} -> v${row.version + 1}`,
      );
    }
    const have = new Set(rows.map((row) => row.slug));
    const inserts = [26, 27, 28, 29].map((chapter) => next.get(chapter)!).filter((playbook) => !have.has(playbook.slug));
    for (const playbook of inserts) plan.push(`  add    Ch ${playbook.chapter} ${playbook.title}`);
    const guideChange = guide.edition !== "9.1";
    if (guideChange) plan.push("  guide  9.0 -> 9.1 (front matter and routing table)");

    console.log(`\n${tenantName.get(guide.tenant_id) ?? guide.tenant_id}: ${plan.length ? "" : "nothing to do"}`);
    for (const line of plan) console.log(line);
    if (!apply) continue;

    // The move first: (guide, chapter) is unique, and Ch 26 is about to be taken by Risk Center.
    for (const update of updates.sort((a, b) => b.chapter - a.chapter)) {
      ok(
        await db
          .from("capability_playbooks")
          .update({ chapter: update.chapter, title: update.title, body: update.body, version: update.row.version + 1, updated_at: now })
          .eq("id", update.row.id),
        `update Ch ${update.row.chapter}`,
      );
      if (update.title !== update.row.title || update.chapter !== update.row.chapter) {
        ok(
          await db
            .from("question_bank")
            .update({ source_title: `Ch. ${update.chapter} ${update.title}`, updated_at: now })
            .eq("playbook_id", update.row.id),
          "retitle questions",
        );
      }
    }
    if (inserts.length) {
      ok(
        await db.from("capability_playbooks").insert(
          inserts.map((playbook) => ({
            tenant_id: guide.tenant_id,
            guide_id: guide.id,
            chapter: playbook.chapter,
            slug: playbook.slug,
            title: playbook.title,
            body: playbook.body,
            status: "published",
            published_at: now,
          })),
        ),
        "insert Part 3",
      );
    }
    if (guideChange) {
      ok(
        await db
          .from("playbook_guides")
          .update({ edition: "9.1", title: parsed.title, source_name: basename(file), body: parsed.body, updated_at: now })
          .eq("id", guide.id),
        "update guide",
      );
    }
    console.log("  applied");
  }
  if (!apply) console.log("\nDry run. Add --apply to write these changes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
