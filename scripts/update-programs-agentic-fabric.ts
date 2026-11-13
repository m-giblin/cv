/**
 * Field Guide 9.1 program update, in every tenant that has the 120-day programs:
 *  - "Days 61–90 — Machine and agent identity" becomes "Days 61–100 — SailPoint Agentic Fabric":
 *    adds a read and a knowledge check for each Part 3 "Protect" chapter (Ch 26–29) after the
 *    Credentials Management and connectors checks, and spreads the rest over 40 days.
 *  - "Days 91–120 — Field readiness" becomes "Days 101–130 — Field readiness" (its steps are relative, so only the name moves).
 *  - The Days 31–60 gate and the 61–100 test-out and gate name the renamed stages.
 * Only templates change: nobody is enrolled in these programs, so no one's dates move. Rerunnable.
 *
 * Needs Edition 9.1 imported first (Part 3 chapters). Run:
 *   npx tsx scripts/update-programs-agentic-fabric.ts            (dry run)
 *   npx tsx scripts/update-programs-agentic-fabric.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const OLD_61 = "Days 61–90 — Machine and agent identity";
const NEW_61 = "Days 61–100 — SailPoint Agentic Fabric";
const NEW_61_DESCRIPTION =
  "Days 61–100. Explain human, machine, and agent identity across SailPoint Agentic Fabric — discover, govern and protect — including Credentials Management. A manager approves the gate before Days 101–130 can be assigned.";
const OLD_91 = "Days 91–120 — Field readiness";
const NEW_91 = "Days 101–130 — Field readiness";
const NEW_91_DESCRIPTION =
  "Days 101–130. Lead an executive narrative, a competitive conversation, and a deal-prep package. Manager approval of the last gate is the field-readiness decision.";

/** Part 3 chapters: slug, how the step names it, and what the read is for. */
const PROTECT = [
  { slug: "risk-center", name: "Risk Center", read: "Read how the Risk Center turns agent and credential findings into owned, tracked risks." },
  {
    slug: "behavior-monitoring-and-the-activity-center",
    name: "behavior monitoring",
    read: "Read how behavior monitoring and the Activity Center show what AI agents actually do.",
  },
  {
    slug: "inline-prompt-and-response-security",
    name: "prompt security",
    read: "Read how inline prompt security redacts sensitive data before it leaves the device.",
  },
  { slug: "automated-enforcement", name: "automated enforcement", read: "Read how Policy Center rules and agent deactivation enforce decisions." },
];

/** Due day for each existing step after the move, by title; the new Part 3 steps go on days 20–30. */
const NEW_OFFSETS: Record<string, number> = {
  "Inventory machine accounts": 32,
  "Who owns the service accounts": 33,
  "Agentic discovery with a CISO": 34,
  "Landmine: we already have Entra": 35,
  "Landmine: Copilot policies are enough": 36,
  "Prepare the basic demo": 38,
  "Test out: the basic demo": 39,
  "Approve move to field readiness": 40,
};

type Step = { id: string; sort_order: number; title: string; description: string | null; metadata: Record<string, unknown> | null };

async function main() {
  const apply = process.argv.includes("--apply");
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

  const plans = ok(
    await db.from("onboarding_plans").select("id, tenant_id, name").in("name", [OLD_61, NEW_61, OLD_91, NEW_91, "Days 31–60 — Platform and discovery"]),
    "load programs",
  ) as { id: string; tenant_id: string; name: string }[];
  const tenants = ok(await db.from("tenants").select("id, name"), "load tenants") as { id: string; name: string }[];

  for (const tenant of tenants) {
    const mine = plans.filter((plan) => plan.tenant_id === tenant.id);
    if (!mine.length) continue;
    console.log(`\n${tenant.name}`);
    const agentic = mine.find((plan) => plan.name === OLD_61 || plan.name === NEW_61);
    const field = mine.find((plan) => plan.name === OLD_91 || plan.name === NEW_91);
    const platform = mine.find((plan) => plan.name.startsWith("Days 31–60"));

    if (agentic) {
      const steps = ok(
        await db.from("plan_steps").select("id, sort_order, title, description, metadata").eq("plan_id", agentic.id).order("sort_order"),
        "load steps",
      ) as Step[];
      const chapters = ok(
        await db.from("capability_playbooks").select("id, slug, chapter").eq("tenant_id", tenant.id).in("slug", PROTECT.map((p) => p.slug)),
        "load Part 3",
      ) as { id: string; slug: string; chapter: number }[];
      if (chapters.length !== PROTECT.length) throw new Error(`${tenant.name}: Part 3 chapters missing — import Edition 9.1 first.`);
      const hasProtect = steps.some((step) => step.metadata?.playbookSlug === "risk-center");
      const anchor = steps.find((step) => step.title === "Check: connectors");
      if (!anchor) throw new Error(`${tenant.name}: no "Check: connectors" step to add Part 3 after.`);

      console.log(`  ${agentic.name} -> ${NEW_61}`);
      if (!hasProtect) {
        for (const [index, protect] of PROTECT.entries()) {
          console.log(`  add step ${anchor.sort_order + 1 + index * 2}: Read ${protect.name} (day ${20 + index * 3}), check (day ${21 + index * 3})`);
        }
      }
      for (const step of steps) {
        const due = NEW_OFFSETS[step.title];
        if (due !== undefined && step.metadata?.dueOffsetDays !== due) console.log(`  move "${step.title}" day ${step.metadata?.dueOffsetDays} -> ${due}`);
      }

      if (apply) {
        ok(await db.from("onboarding_plans").update({ name: NEW_61, description: NEW_61_DESCRIPTION, updated_at: new Date().toISOString() }).eq("id", agentic.id), "rename 61");
        if (!hasProtect) {
          // Make room after the anchor, last step first.
          for (const step of steps.filter((s) => s.sort_order > anchor.sort_order).sort((a, b) => b.sort_order - a.sort_order)) {
            ok(await db.from("plan_steps").update({ sort_order: step.sort_order + PROTECT.length * 2 }).eq("id", step.id), "shift step");
          }
          const rows = PROTECT.flatMap((protect, index) => {
            const chapter = chapters.find((c) => c.slug === protect.slug)!;
            const base = { competency: "New hire", segmentIndex: 1, isSegmentGate: false };
            return [
              {
                plan_id: agentic.id,
                tenant_id: tenant.id,
                title: `Read ${protect.name}`,
                description: protect.read,
                step_type: "content_review",
                sort_order: anchor.sort_order + 1 + index * 2,
                metadata: { ...base, playbookId: chapter.id, playbookSlug: chapter.slug, dueOffsetDays: 20 + index * 3, estimatedMinutes: 25 },
              },
              {
                plan_id: agentic.id,
                tenant_id: tenant.id,
                title: `Check: ${protect.name}`,
                description: `Pass the ${protect.name} knowledge check with a score of at least 80%.`,
                step_type: "knowledge_check",
                sort_order: anchor.sort_order + 2 + index * 2,
                metadata: { ...base, passScore: 80, questionSource: `playbook:${chapter.id}`, dueOffsetDays: 21 + index * 3, estimatedMinutes: 15 },
              },
            ];
          });
          ok(await db.from("plan_steps").insert(rows), "add Part 3 steps");
        }
        for (const step of steps) {
          const due = NEW_OFFSETS[step.title];
          const description =
            step.title === "Test out: the basic demo"
              ? "Run the basic demo live for your manager or mentor. You cannot move on from days 61–100 without passing this."
              : step.title === "Approve move to field readiness"
                ? "Manager approval opens Days 101–130. Do not assign that program before this gate is approved."
                : step.description;
          if (due === undefined && description === step.description) continue;
          ok(
            await db
              .from("plan_steps")
              .update({ description, metadata: { ...(step.metadata ?? {}), ...(due !== undefined ? { dueOffsetDays: due } : {}) } })
              .eq("id", step.id),
            "update step",
          );
        }
      }
    }

    if (field) {
      console.log(`  ${field.name} -> ${NEW_91}`);
      if (apply) {
        ok(await db.from("onboarding_plans").update({ name: NEW_91, description: NEW_91_DESCRIPTION, updated_at: new Date().toISOString() }).eq("id", field.id), "rename 91");
      }
    }

    if (platform) {
      const gate = ok(
        await db.from("plan_steps").select("id, title").eq("plan_id", platform.id).in("title", ["Approve move to machine and agent identity", "Approve move to SailPoint Agentic Fabric"]),
        "load 31–60 gate",
      ) as { id: string; title: string }[];
      for (const step of gate) {
        console.log(`  Days 31–60 gate: "${step.title}" -> "Approve move to SailPoint Agentic Fabric"`);
        if (apply) {
          ok(
            await db
              .from("plan_steps")
              .update({
                title: "Approve move to SailPoint Agentic Fabric",
                description: "Manager approval opens Days 61–100. Do not assign that program before this gate is approved.",
              })
              .eq("id", step.id),
            "rename 31–60 gate",
          );
        }
      }
      if (apply) {
        const { data } = await db.from("onboarding_plans").select("description").eq("id", platform.id).single();
        const description = (data as { description: string | null } | null)?.description ?? "";
        if (description.includes("Days 61–90")) {
          ok(await db.from("onboarding_plans").update({ description: description.replace("Days 61–90", "Days 61–100") }).eq("id", platform.id), "31–60 description");
        }
      }
    }
  }
  if (!apply) console.log("\nDry run. Add --apply to write these changes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
