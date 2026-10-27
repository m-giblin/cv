/**
 * Adds the learn-it and test-out steps every New Hire stage needs before a manager can open the
 * next one: Corp Deck (days 1-30), Demo Deck (31-60), basic demo (61-90), iLab portion (91-120).
 * Each test-out is a gate, so the stage's final sign-off and every test-out must be approved.
 *
 * Safe to rerun (steps are matched by title). Run: node scripts/add-stage-test-outs.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

const STAGES = [
  {
    plan: "Days 1–30 — Foundation",
    index: 1,
    competency: "Identity foundations",
    learn: {
      title: "Learn the Corp Deck",
      description: "Study the SailPoint corporate deck until you can present every slide in your own words. Your mentor will test you on it at the end of the month.",
      minutes: 90,
    },
    test: {
      title: "Test out: the Corp Deck",
      description: "Deliver the Corp Deck live to your manager or mentor. You cannot leave the first 30 days without passing this.",
      criteria: [
        "Deliver the full Corp Deck without reading from the slides",
        "Explain the SailPoint story in plain language, not product jargon",
        "Answer the questions the reviewer asks without losing the thread",
      ],
    },
  },
  {
    plan: "Days 31–60 — Platform and discovery",
    index: 2,
    competency: "Platform and discovery",
    learn: {
      title: "Learn the Demo Deck",
      description: "Learn the demo deck: the flow, the customer problem behind each slide, and where each product moment lands.",
      minutes: 90,
    },
    test: {
      title: "Test out: the Demo Deck",
      description: "Present the Demo Deck live to your manager or mentor. You cannot move on from days 31–60 without passing this.",
      criteria: [
        "Present the Demo Deck in order, tying each slide to a customer problem",
        "Handle two interruptions from the reviewer without losing your place",
        "Transition from deck to product at the right moment",
      ],
    },
  },
  {
    plan: "Days 61–90 — Machine and agent identity",
    index: 3,
    competency: "Machine and agent identity",
    learn: {
      title: "Prepare the basic demo",
      description: "Rehearse the basic demo end to end in the lab tenant: set up, click path, talk track, and recovery if something goes wrong.",
      minutes: 120,
    },
    test: {
      title: "Test out: the basic demo",
      description: "Run the basic demo live for your manager or mentor. You cannot move on from days 61–90 without passing this.",
      criteria: [
        "Run the basic demo end to end in the lab tenant without help",
        "Narrate the business value, not just the clicks",
        "Recover from one unplanned issue calmly",
      ],
    },
  },
  {
    plan: "Days 91–120 — Field readiness",
    index: 4,
    competency: "Field readiness",
    learn: {
      title: "Prepare the iLab portion",
      description: "Prepare to run the iLab portion of a customer engagement: the lab flow, what the customer should do, and how you coach them through it.",
      minutes: 120,
    },
    test: {
      title: "Test out: the iLab portion",
      description: "Run the iLab portion live for your manager or mentor. This is the last test-out before field readiness sign-off.",
      criteria: [
        "Run the iLab portion end to end and coach the customer through each exercise",
        "Explain what each exercise proves to the customer",
        "Handle a lab problem without breaking the flow",
      ],
    },
  },
];

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = (result, what) => {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
};

for (const stage of STAGES) {
  const [plan] = must(await db.from("onboarding_plans").select("id").eq("tenant_id", TENANT_ID).eq("name", stage.plan).eq("is_archived", false), "plan");
  if (!plan) throw new Error(`Missing plan ${stage.plan}`);
  const steps = must(await db.from("plan_steps").select("id, title, sort_order, metadata").eq("plan_id", plan.id).order("sort_order"), "steps");
  if (steps.some((step) => step.title === stage.test.title)) {
    console.log("Already present:", stage.test.title);
    continue;
  }
  const signOff = steps.find((step) => step.metadata?.isSegmentGate);
  const insertAt = signOff ? signOff.sort_order : steps.length + 1;

  // Park the sign-off (and anything after) out of the way, then renumber after inserting.
  const base = { plan_id: plan.id, tenant_id: TENANT_ID };
  must(
    await db.from("plan_steps").insert([
      {
        ...base,
        title: stage.learn.title,
        description: stage.learn.description,
        step_type: "custom",
        sort_order: 900,
        metadata: {
          competency: stage.competency,
          segmentIndex: stage.index,
          dueOffsetDays: 28,
          isSegmentGate: false,
          estimatedMinutes: stage.learn.minutes,
        },
      },
      {
        ...base,
        title: stage.test.title,
        description: stage.test.description,
        step_type: "mentor_review",
        sort_order: 901,
        metadata: {
          competency: stage.competency,
          segmentIndex: stage.index,
          dueOffsetDays: 29,
          isSegmentGate: true,
          reviewer: "manager",
          evidence: "observation",
          criteria: stage.test.criteria,
          estimatedMinutes: 30,
        },
      },
    ]),
    "insert steps",
  );

  const all = must(await db.from("plan_steps").select("id, title, sort_order").eq("plan_id", plan.id).order("sort_order"), "reload");
  const ordered = all.filter((s) => s.sort_order < 900 && s.sort_order < insertAt);
  const tail = all.filter((s) => s.sort_order < 900 && s.sort_order >= insertAt);
  const fresh = all.filter((s) => s.sort_order >= 900);
  const final = [...ordered, ...fresh, ...tail];
  for (const [i, step] of final.entries()) {
    // Two passes avoid unique-order collisions: park everything high first.
    must(await db.from("plan_steps").update({ sort_order: 2000 + i }).eq("id", step.id), "park");
  }
  for (const [i, step] of final.entries()) {
    must(await db.from("plan_steps").update({ sort_order: i + 1 }).eq("id", step.id), "order");
  }
  console.log("Added", stage.learn.title, "+", stage.test.title, "to", stage.plan);
}
