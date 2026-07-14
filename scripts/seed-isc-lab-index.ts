/**
 * Seeds isc_lab_knowledge_chunks from the curated doc index (FTS corpus).
 * Battlecards are seeded by migration 20260727140000_isc_lab_excellence.sql.
 *
 * Run: npm run seed:isc-lab
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ISC_LAB_DOC_INDEX } from "../lib/isc-lab/doc-index";
import type { Database } from "../lib/database.types";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const FETCH_TIMEOUT_MS = 8000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchExcerpt(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SailPoint-SE-Enablement-ISC-Lab-Seed/1.0", Accept: "text/html" },
    });
    if (!response.ok) return `${url} — curated index entry (live fetch unavailable).`;
    return htmlToText(await response.text()).slice(0, 4000);
  } catch {
    return `${url} — curated index entry (live fetch skipped). Keywords: ${ISC_LAB_DOC_INDEX.find((e) => e.url === url)?.keywords.join(", ") ?? ""}`;
  } finally {
    clearTimeout(timeout);
  }
}

async function upsertChunk(
  supabase: ReturnType<typeof createClient<Database>>,
  row: Database["public"]["Tables"]["isc_lab_knowledge_chunks"]["Insert"],
) {
  if (!row.url) {
    const { error } = await supabase.from("isc_lab_knowledge_chunks").insert(row);
    return error;
  }

  const { data: existing } = await supabase
    .from("isc_lab_knowledge_chunks")
    .select("id")
    .eq("url", row.url)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("isc_lab_knowledge_chunks").update(row).eq("id", existing.id);
    return error;
  }

  const { error } = await supabase.from("isc_lab_knowledge_chunks").insert(row);
  return error;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let upserted = 0;
  for (const entry of ISC_LAB_DOC_INDEX) {
    const excerpt = await fetchExcerpt(entry.url);
    const contentVersion = `index-${new Date().toISOString().slice(0, 10)}`;
    const error = await upsertChunk(supabase, {
      kind: entry.source,
      url: entry.url,
      title: entry.title,
      body: excerpt,
      tags: entry.keywords,
      source_fetched_at: new Date().toISOString(),
      content_version: contentVersion,
    });
    if (error) {
      console.warn(`Skip ${entry.url}: ${error.message}`);
      continue;
    }
    upserted += 1;
    console.log(`Indexed: ${entry.title}`);
  }

  console.log(`Done — ${upserted}/${ISC_LAB_DOC_INDEX.length} doc chunks upserted.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
