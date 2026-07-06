/**
 * Upserts the full curated SailPoint challenge library (100+) into Supabase.
 * Run: npm run seed:challenges
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SAILPOINT_CHALLENGE_LIBRARY } from "../lib/challenges/sailpoint-challenge-library";
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

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = SAILPOINT_CHALLENGE_LIBRARY.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    steps: entry.steps,
    success_criteria: entry.successCriteria,
    linked_solutions: entry.linkedSolutions,
    difficulty: entry.difficulty,
    estimated_minutes: entry.estimatedMinutes,
    target_level: entry.targetLevel,
    is_ai_generated: false,
    ai_metadata: {
      linkedResources: entry.linkedResources ?? [],
      competencyNames: entry.competencyNames ?? [],
      library: "sailpoint-challenge-library",
    },
  }));

  const { error } = await admin.from("challenges").upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const { count, error: countError } = await admin
    .from("challenges")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("Count check failed:", countError.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} curated challenges. Database now has ${count} total challenge rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
