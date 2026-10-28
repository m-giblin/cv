/**
 * Removes the two test programs and builds the new-hire 60, 90, and 120 day stages.
 * A manager's approval of each stage gate assigns the next stage.
 *
 * Safe to rerun. Run: node scripts/build-new-hire-stages.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const FOUNDATION = "Days 1–30 — Foundation";
const FOUNDATION_PREVIOUS = "Days 1–30 — New Hirer - Foundation";
const PROGRAM = "New Hire";

const RETIRED_PROGRAMS = ["Experienced SE fast track", "New SE ramp", "120-Day SE Mastery"];
const RETIRED_PLANS = [
  "120-Day Mastery — Days 1–30 (Foundation)",
  "120-Day Mastery — Days 31–60 (Field Ready)",
  "120-Day Mastery — Days 61–90 (Advanced)",
  "120-Day Mastery — Days 91–120 (Advisory)",
  "Weeks 1–2 — Boots on the ground",
  "Weeks 3–4 — Platform and pitch basics",
  "Weeks 5–6 — Roles and JML demos",
  "Weeks 7–8 — Compliance, certifications and reporting",
  "Weeks 9–10 — Transforms and readiness sign-off",
];

const STAGE_NAMES = [
  FOUNDATION,
  "Days 31–60 — Platform and discovery",
  "Days 61–90 — Machine and agent identity",
  "Days 91–120 — Field readiness",
];

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
      }),
  );
}

function must(map, key, label) {
  const value = map.get(key);
  if (!value) throw new Error(`Missing ${label}: ${key}`);
  return value;
}

function gate(day, title, description, criteria) {
  return {
    day,
    title,
    description,
    type: "mentor_review",
    gate: true,
    criteria,
    minutes: 30,
  };
}

const stages = [
  {
    name: STAGE_NAMES[1],
    description:
      "Days 31–60. Map customer problems to Identity Security Cloud and run a discovery conversation and a lifecycle demo. A manager approves the gate before Days 61–90 can be assigned.",
    steps: [
      { day: 2, title: "Read the Identity Graph", type: "content_review", playbook: "identity-graph", minutes: 25, description: "Read how the Identity Graph connects people, access, and accounts." },
      { day: 4, title: "Check: Identity Graph", type: "knowledge_check", playbook: "identity-graph", minutes: 15, description: "Pass the Identity Graph knowledge check with a score of at least 80%." },
      { day: 6, title: "Read intelligent access requests", type: "content_review", playbook: "intelligent-access-requests", minutes: 25, description: "Read how a request becomes approved, provisioned access." },
      { day: 8, title: "Check: access requests", type: "knowledge_check", playbook: "intelligent-access-requests", minutes: 15, description: "Pass the access requests knowledge check with a score of at least 80%." },
      { day: 10, title: "Read application onboarding", type: "content_review", playbook: "application-onboarding", minutes: 25, description: "Read what has to be true before an application can be governed." },
      { day: 12, title: "Run an access request", type: "challenge", challenge: "Access Request: End-to-End Lab Walkthrough", minutes: 40, description: "Walk one access request from submit to provision." },
      { day: 16, title: "Build a joiner workflow", type: "challenge", challenge: "Joiner Workflow: Trigger to Provision", minutes: 45, description: "Build the joiner path from the triggering event to provisioned access." },
      { day: 18, title: "Compare role mining approaches", type: "challenge", challenge: "Role Mining: Suggest vs Manual", minutes: 30, description: "Explain when suggested roles help and when a designed role is safer." },
      { day: 20, title: "Run a discovery call", type: "simulation", simulation: "Discovery-Only — No Demo Allowed", minutes: 20, description: "Hold a discovery conversation. Do not open a demo until the problem is clear." },
      { day: 24, title: "Handle a lifecycle objection", type: "simulation", simulation: "Adaptive Identity Lifecycle Security: objection drill", minutes: 20, description: "Respond when the buyer says their current process is good enough." },
      { day: 26, title: "Observe a certification campaign", type: "challenge", challenge: "Certification Campaign Observer Brief", minutes: 30, description: "Describe what a reviewer is being asked to decide and why it matters." },
      { day: 28, title: "Read workflow solutions", type: "content_review", playbook: "workflow-solutions", minutes: 25, description: "Read how workflows carry the lifecycle from request to completion." },
      gate(30, "Approve move to machine and agent identity", "Manager approval opens Days 61–90. Do not assign that program before this gate is approved.", [
        "Can run a discovery conversation without jumping to a demo",
        "Can explain joiner, mover, and leaver with one product example",
        "Score at least 75 on the discovery simulation",
      ]),
    ],
  },
  {
    name: STAGE_NAMES[2],
    description:
      "Days 61–90. Explain human, machine, and agent identity, including Agentic Fabric and Credentials Management. A manager approves the gate before Days 91–120 can be assigned.",
    steps: [
      { day: 2, title: "Read machine identity", type: "content_review", playbook: "securing-machine-identities-at-scale", minutes: 25, description: "Read why service accounts and workloads need an owner." },
      { day: 4, title: "Check: machine identity", type: "knowledge_check", source: "docs:machine identity security", minutes: 15, description: "Pass the machine identity knowledge check with a score of at least 80%." },
      { day: 6, title: "Read governing AI agents", type: "content_review", playbook: "governing-ai-agents", minutes: 25, description: "Read how an AI agent is an identity with access, not only a feature." },
      { day: 8, title: "Check: agent identity", type: "knowledge_check", source: "docs:agent identity security", minutes: 15, description: "Pass the agent identity knowledge check with a score of at least 80%." },
      { day: 10, title: "Read Agentic Fabric", type: "content_review", playbook: "sailpoint-agentic-fabric", minutes: 25, description: "Read how Agentic Fabric coordinates agents without leaving their access ungoverned." },
      { day: 12, title: "Check: Agentic Fabric", type: "knowledge_check", source: "docs:agentic fabric", minutes: 15, description: "Pass the Agentic Fabric knowledge check with a score of at least 80%." },
      { day: 14, title: "Read credentials management", type: "content_review", playbook: "entro-by-sailpoint", minutes: 25, description: "Read what Credentials Management finds in secrets and non-human access." },
      { day: 16, title: "Check: credentials management", type: "knowledge_check", source: "docs:entro", minutes: 15, description: "Pass the credentials management knowledge check with a score of at least 80%." },
      { day: 18, title: "Check: connectors", type: "knowledge_check", source: "docs:identity security connectors", minutes: 15, description: "Pass the connectors knowledge check with a score of at least 80%." },
      { day: 20, title: "Inventory machine accounts", type: "challenge", challenge: "Machine Account Inventory Discovery", minutes: 40, description: "Find machine accounts that have no current owner." },
      { day: 22, title: "Who owns the service accounts", type: "simulation", simulation: "Machine identities: Who owns the service accounts", minutes: 20, description: "Help the buyer see that an account without an owner is an open risk." },
      { day: 24, title: "Agentic discovery with a CISO", type: "simulation", simulation: "Agentic AI CISO Discovery", minutes: 20, description: "Discover how the organization is already using agents before naming a product." },
      { day: 26, title: "Landmine: we already have Entra", type: "simulation", simulation: "Landmine: We Already Have Entra", minutes: 20, description: "Answer the Entra objection without dismissing what they already own." },
      { day: 28, title: "Landmine: Copilot policies are enough", type: "simulation", simulation: "Landmine: Copilot Policies Are Enough", minutes: 20, description: "Explain why a usage policy does not govern an agent's access." },
      gate(30, "Approve move to field readiness", "Manager approval opens Days 91–120. Do not assign that program before this gate is approved.", [
        "Can distinguish a person, a machine account, and an AI agent",
        "Can handle the Entra objection and the Copilot objection",
        "Score at least 75 on the agentic discovery simulation",
      ]),
    ],
  },
  {
    name: STAGE_NAMES[3],
    description:
      "Days 91–120. Lead an executive narrative, a competitive conversation, and a deal-prep package. Manager approval of the last gate is the field-readiness decision.",
    steps: [
      { day: 2, title: "Read the master narrative", type: "content_review", playbook: "the-master-narrative", minutes: 25, description: "Read the story that ties the platform to a business outcome." },
      { day: 4, title: "Check: master narrative", type: "knowledge_check", playbook: "the-master-narrative", minutes: 15, description: "Pass the master narrative knowledge check with a score of at least 80%." },
      { day: 8, title: "Read compliance and audit", type: "content_review", playbook: "continuous-compliance-and-audit-mastery", minutes: 25, description: "Reread compliance as the evidence behind the executive story." },
      { day: 12, title: "Prepare an Okta competitive response", type: "challenge", challenge: "Okta Competitive: Identity Governance", minutes: 40, description: "Write the governance difference without a feature list." },
      { day: 14, title: "Prepare an Agentic Fabric competitive response", type: "challenge", challenge: "Agentic Fabric Competitive Takeout", minutes: 40, description: "Explain why agent governance is not the same as an agent policy." },
      { day: 16, title: "Competitive conversation: Okta", type: "simulation", simulation: "Competitive: Okta Identity Everywhere", minutes: 20, description: "Stay in the customer's problem when Okta is already in the account." },
      { day: 18, title: "Executive shadow-AI conversation", type: "simulation", simulation: "Shadow AI Discovery Executive", minutes: 20, description: "Brief an executive on agents the organization did not formally adopt." },
      { day: 20, title: "Board brief: standing privilege", type: "simulation", simulation: "Zero Standing Privilege Board Brief", minutes: 20, description: "Make standing access a board-level risk in plain language." },
      { day: 22, title: "Build a deal-prep package", type: "deal_prep", challenge: "Deal Prep: Technical Discovery Checklist", minutes: 45, description: "Prepare discovery questions, objections, and the next step for one account." },
      { day: 26, title: "Run a customer call", type: "simulation", simulation: "Healthcare HIPAA Identity Roleplay", minutes: 25, description: "Lead the call from discovery through a recommended next step." },
      { day: 28, title: "Defend the narrative", type: "simulation", simulation: "The Master Narrative: objection drill", minutes: 20, description: "Hold the business outcome when the buyer challenges the recommendation." },
      gate(30, "Field readiness sign-off", "Manager approval is the decision that this new hire can work a live account with support. There is no further program after this gate.", [
        "Can tell the executive story without a product tour",
        "Can handle a competitive objection",
        "Produced a deal-prep package with a clear next step",
      ]),
    ],
  },
];

function metadataFor(step, catalogs) {
  const metadata = {
    dueOffsetDays: step.day,
    segmentIndex: 1,
    isSegmentGate: Boolean(step.gate),
    estimatedMinutes: step.minutes ?? 20,
    competency: "New hire",
  };
  if (step.gate) {
    metadata.reviewer = "manager";
    metadata.evidence = "observation";
    metadata.criteria = step.criteria;
  }
  if (step.playbook) {
    const playbook = must(catalogs.playbooks, step.playbook, "playbook");
    if (step.type === "knowledge_check") {
      metadata.questionSource = `playbook:${playbook.id}`;
      metadata.passScore = 80;
    } else {
      metadata.playbookId = playbook.id;
      metadata.playbookSlug = playbook.slug;
    }
  }
  if (step.source) {
    metadata.questionSource = step.source;
    metadata.passScore = 80;
  }
  return metadata;
}

function columnsFor(step, catalogs) {
  return {
    content_asset_id: null,
    challenge_id: step.challenge ? must(catalogs.challenges, step.challenge, "challenge") : null,
    simulation_template_id: step.simulation ? must(catalogs.simulations, step.simulation, "simulation") : null,
    content_url: null,
  };
}

async function retireTests(admin) {
  const { error: programError } = await admin.from("enablement_programs").delete().eq("tenant_id", TENANT_ID).in("name", RETIRED_PROGRAMS);
  if (programError) throw new Error(programError.message);
  const { error: planError } = await admin.from("onboarding_plans").delete().eq("tenant_id", TENANT_ID).in("name", RETIRED_PLANS);
  if (planError) throw new Error(planError.message);
}

async function upsertPlan(admin, definition, catalogs) {
  const { data: existing, error: readError } = await admin
    .from("onboarding_plans")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("name", definition.name)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  let planId = existing?.id;
  if (!planId) {
    const { data: created, error: insertError } = await admin
      .from("onboarding_plans")
      .insert({
        name: definition.name,
        description: definition.description,
        is_template: true,
        tenant_id: TENANT_ID,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    planId = created.id;
  } else {
    const { error: updateError } = await admin
      .from("onboarding_plans")
      .update({ description: definition.description, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (updateError) throw new Error(updateError.message);
    const { error: deleteError } = await admin.from("plan_steps").delete().eq("plan_id", planId);
    if (deleteError) throw new Error(deleteError.message);
  }

  const rows = definition.steps.map((step, index) => ({
    plan_id: planId,
    tenant_id: TENANT_ID,
    title: step.title,
    description: step.description,
    step_type: step.type,
    sort_order: index + 1,
    metadata: metadataFor(step, catalogs),
    ...columnsFor(step, catalogs),
  }));
  const { error: stepError } = await admin.from("plan_steps").insert(rows);
  if (stepError) throw new Error(`${definition.name}: ${stepError.message}`);
  return planId;
}

async function linkProgram(admin, planIds) {
  const { data: existing, error: readError } = await admin
    .from("enablement_programs")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("name", PROGRAM)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  let programId = existing?.id;
  const description = "Four stages for a new hire. A manager approves each gate before the next stage is assigned.";
  if (!programId) {
    const { data: created, error: insertError } = await admin
      .from("enablement_programs")
      .insert({ name: PROGRAM, description, segment_count: 4, cert_valid_months: 12, tenant_id: TENANT_ID })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    programId = created.id;
  } else {
    const { error: updateError } = await admin.from("enablement_programs").update({ description, segment_count: 4 }).eq("id", programId);
    if (updateError) throw new Error(updateError.message);
  }

  // tenant_id matters: stage links are read through RLS when a manager signs off a gate, and a row
  // without one is invisible to them, so the next stage silently never opens.
  const rows = planIds.map((planId, index) => ({ program_id: programId, segment_index: index + 1, plan_id: planId, tenant_id: TENANT_ID }));
  const { error: upsertError } = await admin.from("enablement_program_segments").upsert(rows, { onConflict: "program_id,segment_index" });
  if (upsertError) throw new Error(upsertError.message);
}

async function updateFoundationGate(admin) {
  const { data: plans, error: planError } = await admin
    .from("onboarding_plans")
    .select("id, name")
    .eq("tenant_id", TENANT_ID)
    .in("name", [FOUNDATION, FOUNDATION_PREVIOUS]);
  if (planError) throw new Error(planError.message);
  const plan = plans?.[0];
  if (!plan) throw new Error(`Missing plan: ${FOUNDATION}`);
  const { data: steps, error: stepError } = await admin.from("plan_steps").select("id, metadata").eq("plan_id", plan.id).eq("title", "Day 30 identity literacy sign-off");
  if (stepError) throw new Error(stepError.message);
  const gateStep = steps?.[0];
  if (!gateStep) throw new Error("Foundation approval gate is missing");
  const metadata = {
    ...(gateStep.metadata ?? {}),
    isSegmentGate: true,
    reviewer: "manager",
    evidence: "observation",
    criteria: [
      "Explain identity security in plain language without hiding behind a product",
      "Score at least 70 on both foundation simulations",
      "Pass the Atlas, lifecycle, and compliance checks at 80% or higher",
      "Manager approval assigns Days 31–60",
    ],
  };
  const { error: updateError } = await admin
    .from("plan_steps")
    .update({
      metadata,
      description: "Manager approval of this gate assigns Days 31–60. The next program stays closed until then.",
    })
    .eq("id", gateStep.id);
  if (updateError) throw new Error(updateError.message);
  const { error: descriptionError } = await admin
    .from("onboarding_plans")
    .update({
      name: FOUNDATION,
      description: "Days 1–30, where every new hire starts. Experienced hires can take the test-outs early; manager approval of the day-30 gate assigns Days 31–60.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", plan.id);
  if (descriptionError) throw new Error(descriptionError.message);
  return plan.id;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [playbooks, simulations, challenges] = await Promise.all([
    admin.from("capability_playbooks").select("id, slug").eq("tenant_id", TENANT_ID),
    admin.from("simulation_templates").select("id, name").eq("tenant_id", TENANT_ID),
    admin.from("challenges").select("id, title").eq("tenant_id", TENANT_ID),
  ]);
  for (const result of [playbooks, simulations, challenges]) {
    if (result.error) throw new Error(result.error.message);
  }
  const catalogs = {
    playbooks: new Map(playbooks.data.map((row) => [row.slug, row])),
    simulations: new Map(simulations.data.map((row) => [row.name, row.id])),
    challenges: new Map(challenges.data.map((row) => [row.title, row.id])),
  };

  await retireTests(admin);
  console.log("Retired Experienced SE fast track and New SE ramp.");

  const foundationId = await updateFoundationGate(admin);
  const created = [];
  for (const stage of stages) {
    created.push(await upsertPlan(admin, stage, catalogs));
    console.log(`Built ${stage.name} (${stage.steps.length} steps).`);
  }
  await linkProgram(admin, [foundationId, ...created]);

  const { data: retired } = await admin.from("enablement_programs").select("name").eq("tenant_id", TENANT_ID).in("name", RETIRED_PROGRAMS);
  if (retired?.length) throw new Error(`Test programs still present: ${retired.map((row) => row.name).join(", ")}`);
  const { data: program } = await admin.from("enablement_programs").select("id").eq("tenant_id", TENANT_ID).eq("name", PROGRAM).single();
  const { data: segments } = await admin.from("enablement_program_segments").select("segment_index, plan_id").eq("program_id", program.id).order("segment_index");
  if ((segments ?? []).length !== 4) throw new Error(`New Hire has ${segments?.length ?? 0} stages`);
  console.log("New Hire program: Foundation, 60, 90, and 120. Later stages require manager approval.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
