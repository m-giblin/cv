/**
 * The product is called Credentials Management: rewords the two documentation-sourced questions whose
 * visible text still names Entro hosts, in every tenant. Source links (documentation.sailpoint.com/entro/…)
 * are real addresses and stay. Rerunnable.
 * Run: npx tsx scripts/remove-entro-from-docs-questions.ts [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const EDITS = [
  {
    stem: "How does Human Fabric pull non-human identities from Credentials Management?",
    explanation:
      "The integration is a pull. The documented source type is Web Services SaaS, authentication is API token, and the base URL is your Credentials Management API environment. The connection timeout in the guide is 120 seconds. ownerEmail is mapped to a human identity.",
  },
  {
    stem: "What must a Credentials Management connector be able to reach, and what must a proxy not do?",
    choice: { index: 0, text: "Only the Credentials Management UI, and the proxy should intercept TLS" },
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  for (const edit of EDITS) {
    const { data, error } = await db.from("question_bank").select("id, tenant_id, choices, explanation").eq("stem", edit.stem).neq("status", "retired");
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as { id: string; tenant_id: string; choices: string[]; explanation: string }[]) {
      const choices = [...row.choices];
      if (edit.choice) choices[edit.choice.index] = edit.choice.text;
      const explanation = edit.explanation ?? row.explanation;
      if (JSON.stringify(choices) === JSON.stringify(row.choices) && explanation === row.explanation) continue;
      console.log(`${apply ? "update" : "would update"} ${row.tenant_id.slice(0, 8)} "${edit.stem.slice(0, 60)}…"`);
      if (apply) {
        const result = await db.from("question_bank").update({ choices, explanation, updated_at: new Date().toISOString() }).eq("id", row.id);
        if (result.error) throw new Error(result.error.message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
