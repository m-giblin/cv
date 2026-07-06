/**
 * Seeds 20 additional simulation templates from lib/simulations/simulation-template-library.ts
 * Run: npm run seed:simulations
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SIMULATION_TEMPLATE_LIBRARY } from "../lib/simulations/simulation-template-library";
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

  const { data: existing } = await admin.from("simulation_templates").select("name");
  const existingNames = new Set((existing ?? []).map((row) => row.name));

  let inserted = 0;
  let skipped = 0;

  for (const template of SIMULATION_TEMPLATE_LIBRARY) {
    if (existingNames.has(template.name)) {
      skipped += 1;
      continue;
    }

    const { error } = await admin.from("simulation_templates").insert({
      name: template.name,
      persona: template.persona,
      vertical: template.vertical,
      solution_focus: template.solutionFocus,
      difficulty: template.difficulty,
      prompt_body: template.promptBody,
      practice_rounds_before_submit: template.practiceRoundsBeforeSubmit ?? 1,
    });

    if (error) {
      console.error(`Failed to insert "${template.name}":`, error.message);
      process.exit(1);
    }

    inserted += 1;
    existingNames.add(template.name);
  }

  const { count } = await admin.from("simulation_templates").select("id", { count: "exact", head: true });

  console.log(
    `Simulation library: inserted ${inserted}, skipped ${skipped} (already present). Database has ${count} templates total.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
