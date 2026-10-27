/**
 * Imports SailPoint SLED Field Guide Edition 9.0, publishes every chapter, moves everything that
 * pointed at an old chapter (question bank, drills, assignments, plan steps, quiz assignments) to
 * the matching 9.0 chapter, then removes the previous edition.
 *
 * Run: npx tsx scripts/import-field-guide-9.ts "<path to .docx>" [--dry-run]
 * Safe to rerun: if a 9.0 guide already exists it only repoints and removes older editions.
 */
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseFieldGuide } from "@/lib/playbooks/parse-field-guide";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

/** Old (8.x) chapter slug → 9.0 chapter number. Chapters that were split or merged map to the closest home. */
const OLD_TO_NEW_CHAPTER: Record<string, number> = {
  "the-sailpoint-isc-atlas-platform": 1,
  "adaptive-identity-lifecycle-security": 3,
  "continuous-compliance-and-audit-mastery": 4,
  "identity-graph": 5,
  "intelligent-access-requests": 6,
  "securing-machine-identities-at-scale": 20,
  "governing-ai-agents": 19,
  "workflow-solutions": 7,
  "non-employee-risk-management": 8,
  "data-access-security": 9,
  "privileged-task-automation": 10,
  "application-onboarding": 12,
  "password-management": 13,
  "model-context-protocol": 14,
  "shared-signals-framework": 15,
  "sailpoint-agentic-fabric": 18,
  "entro-by-sailpoint": 21,
  "the-master-narrative": 26,
};

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

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!file) throw new Error("Pass the path to the Edition 9.0 .docx");

  const env = loadEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const ok = <T,>(result: { data: T; error: { message: string } | null }, what: string): T => {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    return result.data;
  };

  const { value } = await mammoth.extractRawText({ path: file });
  const parsed = parseFieldGuide(value);
  if (parsed.warnings.length) console.log("Parser warnings:", parsed.warnings);
  if (parsed.playbooks.length < 20) throw new Error(`Only ${parsed.playbooks.length} chapters parsed; refusing to import.`);
  console.log(`Parsed ${parsed.playbooks.length} chapters, edition ${parsed.edition}`);

  const guides = ok(
    await db.from("playbook_guides").select("id, edition, title").eq("tenant_id", TENANT_ID),
    "load guides",
  ) as { id: string; edition: string | null }[];
  let newGuide = guides.find((guide) => guide.edition === parsed.edition);
  const oldGuides = guides.filter((guide) => guide.edition !== parsed.edition);

  if (dryRun) {
    console.log("Dry run. Existing guides:", guides, "would import:", !newGuide);
    return;
  }

  const now = new Date().toISOString();
  if (!newGuide) {
    const guide = ok(
      await db
        .from("playbook_guides")
        .insert({
          tenant_id: TENANT_ID,
          title: parsed.title,
          segment: parsed.segment,
          segment_label: parsed.segmentLabel || null,
          edition: parsed.edition || null,
          source_name: basename(file),
          body: parsed.body,
        })
        .select("id, edition")
        .single(),
      "insert guide",
    ) as { id: string; edition: string | null };
    newGuide = guide;
    ok(
      await db.from("capability_playbooks").insert(
        parsed.playbooks.map((playbook) => ({
          tenant_id: TENANT_ID,
          guide_id: guide.id,
          chapter: playbook.chapter,
          slug: playbook.slug,
          title: playbook.title,
          body: playbook.body,
          status: "published",
          published_at: now,
        })),
      ),
      "insert chapters",
    );
    console.log("Imported and published", parsed.playbooks.length, "chapters");
  }

  const fresh = ok(
    await db.from("capability_playbooks").select("id, chapter, slug").eq("guide_id", newGuide.id),
    "load new chapters",
  ) as { id: string; chapter: number; slug: string }[];
  const byChapter = new Map(fresh.map((row) => [row.chapter, row]));

  for (const old of oldGuides) {
    const chapters = ok(
      await db.from("capability_playbooks").select("id, slug").eq("guide_id", old.id),
      "load old chapters",
    ) as { id: string; slug: string }[];

    const idMap = new Map<string, { id: string; slug: string }>();
    for (const chapter of chapters) {
      const target = byChapter.get(OLD_TO_NEW_CHAPTER[chapter.slug] ?? -1);
      if (!target) throw new Error(`No 9.0 chapter mapped for old chapter ${chapter.slug}`);
      idMap.set(chapter.id, target);
    }

    for (const [oldId, target] of idMap) {
      for (const [table, column] of [
        ["question_bank", "playbook_id"],
        ["pitch_scenario_templates", "source_playbook_id"],
        ["simulation_templates", "source_playbook_id"],
        ["playbook_assignments", "playbook_id"],
        ["playbook_drill_results", "playbook_id"],
      ] as const) {
        ok(await db.from(table).update({ [column]: target.id }).eq(column, oldId), `repoint ${table}`);
      }
      const quizzes = await db.from("quiz_assignments").update({ source_key: `playbook:${target.id}` }).eq("source_key", `playbook:${oldId}`);
      if (quizzes.error) throw new Error(`repoint quiz_assignments: ${quizzes.error.message}`);
    }

    const steps = ok(await db.from("plan_steps").select("id, metadata"), "load steps") as { id: string; metadata: Record<string, unknown> | null }[];
    let rewired = 0;
    for (const step of steps) {
      const meta = step.metadata ?? {};
      const next = { ...meta } as Record<string, unknown>;
      const playbookId = typeof meta.playbookId === "string" ? meta.playbookId : null;
      const questionSource = typeof meta.questionSource === "string" ? meta.questionSource : null;
      if (playbookId && idMap.has(playbookId)) {
        const target = idMap.get(playbookId)!;
        next.playbookId = target.id;
        next.playbookSlug = target.slug;
      }
      const sourceId = questionSource?.startsWith("playbook:") ? questionSource.slice(9) : null;
      if (sourceId && idMap.has(sourceId)) next.questionSource = `playbook:${idMap.get(sourceId)!.id}`;
      if (JSON.stringify(next) !== JSON.stringify(meta)) {
        ok(await db.from("plan_steps").update({ metadata: next }).eq("id", step.id), "rewire step");
        rewired += 1;
      }
    }
    console.log(`Repointed ${idMap.size} chapters; rewired ${rewired} plan steps`);

    ok(await db.from("playbook_guides").delete().eq("id", old.id), "delete old guide");
    console.log("Removed old guide", old.edition);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
