/**
 * Repairs the New SE ramp stage links, expands New Hirer - Foundation into a
 * 30-day curriculum, and points every learning or practice step at a real asset,
 * playbook, question bank, challenge, or simulation.
 *
 * Safe to rerun. Does not change step types on plans people are already assigned.
 * Run: node scripts/wire-enablement-plans.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

const RAMP_STAGES = [
  [1, "Weeks 1–2 — Boots on the ground"],
  [2, "Weeks 3–4 — Platform and pitch basics"],
  [3, "Weeks 5–6 — Roles and JML demos"],
  [4, "Weeks 7–8 — Compliance, certifications and reporting"],
  [5, "Weeks 9–10 — Transforms and readiness sign-off"],
];

const FOUNDATION_DESCRIPTION =
  "First 30 days for a new hire with little or no identity-security background. Learn the vocabulary, practice the lifecycle in plain language, and pass a manager sign-off before product breadth.";

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

function meta(existing, patch) {
  return { ...(existing ?? {}), ...patch };
}

const foundationSteps = [
  {
    order: 1,
    day: 2,
    title: "Learn the identity vocabulary",
    description: "Read the SailPoint definitions and be able to explain identity, account, access, entitlement, and role without a product demo.",
    type: "content_review",
    asset: "SailPoint Definitions",
    minutes: 30,
  },
  {
    order: 2,
    day: 4,
    title: "Read how the Atlas platform fits together",
    description: "Read the Atlas platform chapter. Stop at the platform story. Product depth comes later.",
    type: "content_review",
    playbook: "the-atlas-platform-and-sailpoint-identity-fabric",
    minutes: 25,
  },
  {
    order: 3,
    day: 5,
    title: "Pitch: the Atlas story",
    description: "In 60 seconds, explain the Atlas story in plain language.",
    type: "content_review",
    pitch: "foundation-atlas-story",
    minutes: 15,
  },
  {
    order: 4,
    day: 6,
    title: "Check: Atlas platform",
    description: "Pass the Atlas platform knowledge check with a score of at least 80%.",
    type: "knowledge_check",
    playbook: "the-atlas-platform-and-sailpoint-identity-fabric",
    minutes: 15,
  },
  {
    order: 5,
    day: 8,
    title: "Read lifecycle security",
    description: "Read how joining, moving, and leaving change what someone should be able to reach.",
    type: "content_review",
    playbook: "adaptive-identity-lifecycle-security",
    minutes: 25,
  },
  {
    order: 6,
    day: 9,
    title: "Check: lifecycle security",
    description: "Pass the lifecycle security knowledge check with a score of at least 80%.",
    type: "knowledge_check",
    playbook: "adaptive-identity-lifecycle-security",
    minutes: 15,
  },
  {
    order: 7,
    day: 10,
    title: "Watch the Identity Security Cloud overview",
    description: "Watch the overview after the vocabulary is in place. Note one problem the product is meant to solve.",
    type: "content_review",
    asset: "Identity Security Cloud overview",
    minutes: 20,
  },
  {
    order: 8,
    day: 11,
    title: "Check: Identity Security Cloud basics",
    description: "Pass the Identity Security Cloud knowledge check with a score of at least 80%.",
    type: "knowledge_check",
    source: "docs:identity security cloud (human fabric)",
    minutes: 15,
  },
  {
    order: 9,
    day: 12,
    title: "Foundation: Joiner, mover, and leaver",
    description: "Practice the lifecycle conversation. Explain the problem before naming a product.",
    type: "simulation",
    simulation: "Foundation: Joiner, mover, and leaver",
    minutes: 15,
    existing: true,
  },
  {
    order: 10,
    day: 14,
    title: "Pitch: what identity controls",
    description: "Explain what identity controls to someone who has never worked in identity.",
    type: "content_review",
    pitch: "foundation-what-identity-controls",
    minutes: 15,
  },
  {
    order: 11,
    day: 16,
    title: "Pitch: standing access",
    description: "Explain why access that stays forever becomes a risk, without pitching a product.",
    type: "content_review",
    pitch: "foundation-standing-access",
    minutes: 15,
  },
  {
    order: 12,
    day: 18,
    title: "Explain roles and access profiles",
    description: "Complete the roles and access profiles exercise in plain customer language.",
    type: "challenge",
    challenge: "Roles vs Access Profiles Customer FAQ",
    minutes: 30,
  },
  {
    order: 13,
    day: 20,
    title: "Map a joiner, mover, and leaver",
    description: "Map one joiner, mover, and leaver path and say what access should change.",
    type: "challenge",
    challenge: "JML Lifecycle Mapping Workshop",
    minutes: 40,
  },
  {
    order: 14,
    day: 22,
    title: "Read continuous compliance",
    description: "Read how access reviews and audit evidence fit the lifecycle you just practiced.",
    type: "content_review",
    playbook: "continuous-compliance-certifications-access-intelligence-and-access-modeling",
    minutes: 25,
  },
  {
    order: 15,
    day: 23,
    title: "Check: compliance and audit",
    description: "Pass the compliance and audit knowledge check with a score of at least 80%.",
    type: "knowledge_check",
    playbook: "continuous-compliance-certifications-access-intelligence-and-access-modeling",
    minutes: 15,
  },
  {
    order: 16,
    day: 25,
    title: "Pitch: what an access review is",
    description: "Explain an access review as a business control, not a product feature.",
    type: "content_review",
    pitch: "foundation-access-review",
    minutes: 15,
  },
  {
    order: 17,
    day: 26,
    title: "Foundation: People and non-human accounts",
    description: "Practice the difference between a person and an account that is not a person.",
    type: "simulation",
    simulation: "Foundation: People and non-human accounts",
    minutes: 15,
    existing: true,
  },
  {
    order: 18,
    day: 28,
    title: "Separate people from non-human accounts",
    description: "Classify people, machine accounts, and agents, and say who should own each one.",
    type: "challenge",
    challenge: "Human vs Machine Identity Taxonomy",
    minutes: 30,
  },
  {
    order: 19,
    day: 30,
    title: "Day 30 identity literacy sign-off",
    description: "Teach the lifecycle back to your manager in plain language. This is the gate out of the first 30 days.",
    type: "mentor_review",
    gate: true,
    minutes: 30,
  },
];

/** Links for existing steps. Types stay put so in-progress assignments keep the same activity. */
const wires = [
  ["Weeks 1–2 — Boots on the ground", "SailPoint tools overview", { asset: "SailPoint Documentation" }],
  ["Weeks 1–2 — Boots on the ground", "DemoHub submission & management", { asset: "Interactive product tours" }],
  ["Weeks 1–2 — Boots on the ground", "Booking travel", { asset: "Identity University" }],
  ["Weeks 1–2 — Boots on the ground", "Slack communication", { asset: "Identity University" }],
  ["Weeks 1–2 — Boots on the ground", "Keeper access & review", { asset: "Identity University" }],

  ["Weeks 3–4 — Platform and pitch basics", "Perfect the elevator pitch", { simulation: "Elevator Pitch — FED Zero Trust (James Okonkwo)" }],
  ["Weeks 3–4 — Platform and pitch basics", "ISC platform discussion & video", { playbook: "the-atlas-platform-and-sailpoint-identity-fabric" }],
  ["Weeks 3–4 — Platform and pitch basics", "Request ISC Demo Ready tenant", { challenge: "Lab Tenant Hygiene Checklist" }],
  ["Weeks 3–4 — Platform and pitch basics", "#help-product-org-answers review", { asset: "Identity University" }],
  ["Weeks 3–4 — Platform and pitch basics", "Joiner–Mover–Leaver walkthrough", { playbook: "adaptive-identity-lifecycle-security" }],
  ["Weeks 3–4 — Platform and pitch basics", "Watch LCS video (part 1)", { asset: "Product and solutions playlist" }],
  ["Weeks 3–4 — Platform and pitch basics", "Watch LCS video (part 2)", { asset: "Official webinars" }],
  ["Weeks 3–4 — Platform and pitch basics", "RFP review — Loopio & questions", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["Weeks 3–4 — Platform and pitch basics", "Corporate demo deck — draft", { challenge: "AIS Demo Storyline: 5 Minutes" }],

  ["Weeks 5–6 — Roles and JML demos", "Elevator pitch — mentor feedback", { simulation: "SLED Elevator Pitch (Marcus Reid)" }],
  ["Weeks 5–6 — Roles and JML demos", "Elevator pitch — team feedback", { simulation: "SLED Sales Roleplay" }],
  ["Weeks 5–6 — Roles and JML demos", "Corporate demo deck — mentor review", { simulation: "The SailPoint ISC Atlas Platform: objection drill" }],
  ["Weeks 5–6 — Roles and JML demos", "JML demo in tenant — mentor review", { simulation: "Foundation: Joiner, mover, and leaver" }],
  ["Weeks 5–6 — Roles and JML demos", "Fine-tune JML talking points", { asset: "SailPoint Documentation" }],
  ["Weeks 5–6 — Roles and JML demos", "#help-product-org-answers review", { asset: "Identity University" }],
  ["Weeks 5–6 — Roles and JML demos", "Role management discussion", { asset: "SailPoint Documentation" }],
  ["Weeks 5–6 — Roles and JML demos", "Watch — Why Roles", { asset: "Product and solutions playlist" }],
  ["Weeks 5–6 — Roles and JML demos", "Watch — Dynamic Roles", { asset: "Official webinars" }],
  ["Weeks 5–6 — Roles and JML demos", "Watch — Exxon Mobile Roles", { asset: "Identity Matters" }],
  ["Weeks 5–6 — Roles and JML demos", "Watch — ID Attributes", { asset: "SailPoint Documentation" }],
  ["Weeks 5–6 — Roles and JML demos", "Work on RFP questions", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["Weeks 5–6 — Roles and JML demos", "Automated roles from JML data", { challenge: "Birthright Access via Workflow" }],
  ["Weeks 5–6 — Roles and JML demos", "Demo new roles with mentor", { simulation: "Adaptive Identity Lifecycle Security: objection drill" }],
  ["Weeks 5–6 — Roles and JML demos", "Request DemoHub iLab tenant", { challenge: "Lab Tenant Hygiene Checklist" }],
  ["Weeks 5–6 — Roles and JML demos", "Basic iLab setup & configuration", { challenge: "Identity Profile: Authoritative Source" }],

  ["Weeks 7–8 — Compliance, certifications and reporting", "JML team demo with new roles", { simulation: "Adaptive Identity Lifecycle Security: objection drill" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Corporate demo deck — team review", { simulation: "The Master Narrative: objection drill" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Demo presentation deck — start", { challenge: "Governance Dashboard Tour" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Work on RFP questions", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "#help-product-org-answers review", { asset: "Identity University" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Developer Days YouTube — explore", { asset: "SailPoint Developer Portal" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Audit & compliance discussion", { playbook: "continuous-compliance-certifications-access-intelligence-and-access-modeling" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Certification discussion & demo", { asset: "SailPoint Documentation" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Achieving compliance — video", { asset: "Official webinars" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "General reporting via Search", { asset: "SailPoint Documentation" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Access Intelligence Center overview", { asset: "SailPoint Documentation" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "AIC watch — training video", { asset: "Product and solutions playlist" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Reports & certifications in demo", { challenge: "Certification Campaign Observer Brief" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "New DemoHub iLab tenant", { challenge: "Identity Profile Correlation 101" }],
  ["Weeks 7–8 — Compliance, certifications and reporting", "Presentation practice", { simulation: "Discovery-Only — No Demo Allowed" }],

  ["Weeks 9–10 — Transforms and readiness sign-off", "Work on RFP questions", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "#help-product-org-answers review", { asset: "Identity University" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "Developer Days YouTube — explore", { asset: "API specifications" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "Demo presentation — mentor feedback", { simulation: "Healthcare HIPAA Identity Roleplay" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "JML demo with roles & certifications", { simulation: "Certification Campaign Executive Sponsor" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "Assist teammates on RFP", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "Transforms — open discussion", { asset: "SailPoint Developer Portal" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "LCS transforms — video", { asset: "Product and solutions playlist" }],
  ["Weeks 9–10 — Transforms and readiness sign-off", "Create example transforms", { challenge: "Create a Lower Transform for Work Email" }],

  ["120-Day Mastery — Days 1–30 (Foundation)", "Review ISC platform overview", { playbook: "the-atlas-platform-and-sailpoint-identity-fabric" }],
  ["120-Day Mastery — Days 1–30 (Foundation)", "Provisioning fundamentals", { asset: "SailPoint Documentation" }],
  ["120-Day Mastery — Days 1–30 (Foundation)", "First simulation gate", { simulation: "Discovery-Only — No Demo Allowed" }],
  ["120-Day Mastery — Days 31–60 (Field Ready)", "Workflows deep dive", { playbook: "workflows" }],
  ["120-Day Mastery — Days 31–60 (Field Ready)", "Deal prep practice", { challenge: "Deal Prep: Technical Discovery Checklist" }],
  ["120-Day Mastery — Days 31–60 (Field Ready)", "Customer call simulator gate", { simulation: "SLED Sales Roleplay" }],
  ["120-Day Mastery — Days 61–90 (Advanced)", "Agentic Fabric & AIS", { playbook: "the-agentic-fabric-platform-and-how-it-deploys" }],
  ["120-Day Mastery — Days 61–90 (Advanced)", "Agentic challenge", { challenge: "Agent Identity in Access Request Catalog" }],
  ["120-Day Mastery — Days 91–120 (Advisory)", "Executive demo prep", { playbook: "the-master-narrative" }],
  ["120-Day Mastery — Days 91–120 (Advisory)", "Competitive bake-off prep", { challenge: "Okta Competitive: Identity Governance" }],
];

function foundationMetadata(step, catalogs, existing) {
  const base = {
    dueOffsetDays: step.day,
    segmentIndex: 1,
    isSegmentGate: Boolean(step.gate),
    estimatedMinutes: step.minutes,
    competency: "Identity foundations",
  };
  if (step.gate) {
    base.reviewer = "mentor";
    base.evidence = "observation";
    base.criteria = [
      "Explain identity security in plain language without hiding behind a product",
      "Score at least 70 on both foundation simulations",
      "Pass the Atlas, lifecycle, and compliance checks at 80% or higher",
    ];
  }
  return meta(existing, { ...base, ...linkMetadata(step, catalogs) });
}

function linkMetadata(step, catalogs) {
  if (!step.playbook) return step.source ? { questionSource: step.source, passScore: 80 } : {};
  const playbook = must(catalogs.playbooks, step.playbook, "playbook");
  if (step.type === "knowledge_check") {
    return { questionSource: `playbook:${playbook.id}`, passScore: 80, playbookId: null, playbookSlug: null };
  }
  return { playbookId: playbook.id, playbookSlug: playbook.slug };
}

function linkColumns(step, catalogs) {
  const columns = {};
  if (step.asset) columns.content_asset_id = must(catalogs.assets, step.asset, "asset");
  if (step.challenge) columns.challenge_id = must(catalogs.challenges, step.challenge, "challenge");
  if (step.simulation) columns.simulation_template_id = must(catalogs.simulations, step.simulation, "simulation");
  if (step.pitch) {
    const pitch = must(catalogs.pitches, step.pitch, "pitch");
    if (!pitch.active) throw new Error(`Pitch is inactive: ${step.pitch}`);
    columns.content_url = `/practice/pitch?scenario=${pitch.id}`;
  }
  if (step.source) columns.metadataSource = step.source;
  return columns;
}

async function repairRamp(admin, plans) {
  const { data: program, error } = await admin
    .from("enablement_programs")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("name", "New SE ramp")
    .single();
  if (error || !program) throw new Error(error?.message ?? "New SE ramp program is missing");

  const rows = RAMP_STAGES.map(([segmentIndex, name]) => ({
    program_id: program.id,
    segment_index: segmentIndex,
    plan_id: must(plans, name, "ramp plan"),
  }));
  const { error: upsertError } = await admin.from("enablement_program_segments").upsert(rows, { onConflict: "program_id,segment_index" });
  if (upsertError) throw new Error(upsertError.message);

  const { error: descriptionError } = await admin
    .from("enablement_programs")
    .update({ description: "SailPoint onboarding for new SEs, weeks 1 to 10, in five stages." })
    .eq("id", program.id);
  if (descriptionError) throw new Error(descriptionError.message);

  const { data: segments, error: readError } = await admin
    .from("enablement_program_segments")
    .select("segment_index, plan_id")
    .eq("program_id", program.id)
    .order("segment_index");
  if (readError) throw new Error(readError.message);
  if ((segments ?? []).length !== 5) throw new Error(`New SE ramp has ${segments?.length ?? 0} stages`);
  RAMP_STAGES.forEach(([segmentIndex, name]) => {
    const row = segments.find((segment) => segment.segment_index === segmentIndex);
    if (!row || row.plan_id !== plans.get(name)) throw new Error(`Stage ${segmentIndex} is not ${name}`);
  });
}

async function expandFoundation(admin, planId, catalogs) {
  const { data: existingRows, error } = await admin
    .from("plan_steps")
    .select("id, title, metadata, sort_order")
    .eq("plan_id", planId);
  if (error) throw new Error(error.message);
  const byTitle = new Map((existingRows ?? []).map((row) => [row.title, row]));

  for (const [index, row] of (existingRows ?? []).entries()) {
    const { error: parkError } = await admin.from("plan_steps").update({ sort_order: 1000 + index }).eq("id", row.id);
    if (parkError) throw new Error(parkError.message);
  }

  for (const [index, step] of foundationSteps.entries()) {
    const current = byTitle.get(step.title);
    const columns = linkColumns(step, catalogs);
    const metadata = foundationMetadata(step, catalogs, current?.metadata);
    const payload = {
      title: step.title,
      description: step.description,
      step_type: step.type,
      sort_order: 1500 + index,
      metadata,
      content_asset_id: columns.content_asset_id ?? null,
      challenge_id: columns.challenge_id ?? null,
      simulation_template_id: columns.simulation_template_id ?? null,
      content_url: columns.content_url ?? null,
      tenant_id: TENANT_ID,
    };
    if (current) {
      const { error: updateError } = await admin.from("plan_steps").update(payload).eq("id", current.id);
      if (updateError) throw new Error(`${step.title}: ${updateError.message}`);
    } else {
      const { error: insertError } = await admin.from("plan_steps").insert({ ...payload, plan_id: planId });
      if (insertError) throw new Error(`${step.title}: ${insertError.message}`);
    }
  }

  const { data: written, error: readError } = await admin.from("plan_steps").select("id, title").eq("plan_id", planId);
  if (readError) throw new Error(readError.message);
  const writtenByTitle = new Map((written ?? []).map((row) => [row.title, row]));
  for (const step of foundationSteps) {
    const row = writtenByTitle.get(step.title);
    if (!row) throw new Error(`Foundation step was not saved: ${step.title}`);
    const { error: orderError } = await admin.from("plan_steps").update({ sort_order: step.order }).eq("id", row.id);
    if (orderError) throw new Error(orderError.message);
  }

  const { error: planError } = await admin
    .from("onboarding_plans")
    .update({ description: FOUNDATION_DESCRIPTION, updated_at: new Date().toISOString() })
    .eq("id", planId);
  if (planError) throw new Error(planError.message);
}

async function wireSteps(admin, planIds, catalogs) {
  const { data: steps, error } = await admin
    .from("plan_steps")
    .select("id, plan_id, title, metadata, content_url")
    .in("plan_id", [...planIds.values()]);
  if (error) throw new Error(error.message);
  const byKey = new Map((steps ?? []).map((step) => [`${step.plan_id}:${step.title}`, step]));

  for (const [planName, title, spec] of wires) {
    const planId = must(planIds, planName, "plan");
    const step = byKey.get(`${planId}:${title}`);
    if (!step) throw new Error(`Step not found: ${planName} / ${title}`);
    const columns = linkColumns(spec, catalogs);
    const payload = { metadata: meta(step.metadata, linkMetadata(spec, catalogs)) };
    if (columns.content_asset_id) payload.content_asset_id = columns.content_asset_id;
    if (columns.challenge_id) payload.challenge_id = columns.challenge_id;
    if (columns.simulation_template_id) payload.simulation_template_id = columns.simulation_template_id;
    if (columns.content_url) payload.content_url = columns.content_url;
    const { error: updateError } = await admin.from("plan_steps").update(payload).eq("id", step.id);
    if (updateError) throw new Error(`${planName} / ${title}: ${updateError.message}`);
  }
}

function isWired(step) {
  const record = step.metadata && typeof step.metadata === "object" ? step.metadata : {};
  switch (step.step_type) {
    case "shadow_meeting_log":
    case "mentor_review":
      return true;
    case "knowledge_check":
      return typeof record.questionSource === "string" && record.questionSource.length > 0;
    case "simulation":
      return Boolean(step.simulation_template_id);
    case "challenge":
    case "deal_prep":
      return Boolean(step.challenge_id);
    case "content_review":
      return Boolean(step.content_asset_id || step.content_url || record.playbookId);
    default:
      return false;
  }
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [plansResult, assetsResult, playbooksResult, simulationsResult, challengesResult, pitchesResult] = await Promise.all([
    admin.from("onboarding_plans").select("id, name, is_archived").eq("tenant_id", TENANT_ID),
    admin.from("content_assets").select("id, title").eq("tenant_id", TENANT_ID),
    admin.from("capability_playbooks").select("id, slug, title").eq("tenant_id", TENANT_ID),
    admin.from("simulation_templates").select("id, name").eq("tenant_id", TENANT_ID),
    admin.from("challenges").select("id, title").eq("tenant_id", TENANT_ID),
    admin.from("pitch_scenario_templates").select("id, slug, active").eq("tenant_id", TENANT_ID),
  ]);
  for (const result of [plansResult, assetsResult, playbooksResult, simulationsResult, challengesResult, pitchesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const plans = new Map(plansResult.data.map((plan) => [plan.name, plan.id]));
  const neededChallenges = new Set(
    [...foundationSteps, ...wires.map(([, , spec]) => spec)].map((step) => step.challenge).filter(Boolean),
  );
  for (const title of neededChallenges) {
    const matches = challengesResult.data.filter((row) => row.title === title);
    if (matches.length !== 1) throw new Error(`Challenge "${title}" matched ${matches.length} rows`);
  }

  const catalogs = {
    assets: new Map(assetsResult.data.map((row) => [row.title, row.id])),
    playbooks: new Map(playbooksResult.data.map((row) => [row.slug, row])),
    simulations: new Map(simulationsResult.data.map((row) => [row.name, row.id])),
    challenges: new Map(challengesResult.data.map((row) => [row.title, row.id])),
    pitches: new Map(pitchesResult.data.map((row) => [row.slug, row])),
  };

  await repairRamp(admin, plans);
  console.log("1. New SE ramp: 5 stages attached, weeks 1 to 10.");

  const foundationId =
    plans.get("Days 1–30 — New Hirer - Foundation") ?? must(plans, "New Hirer - Foundation", "plan");
  await expandFoundation(admin, foundationId, catalogs);
  console.log(`2. New Hirer - Foundation: ${foundationSteps.length} steps across days 1–30.`);

  await wireSteps(admin, plans, catalogs);
  console.log(`3. Wired ${wires.length} existing plan steps.`);

  const activeIds = plansResult.data.filter((plan) => !plan.is_archived).map((plan) => plan.id);
  const { data: checkSteps, error: checkError } = await admin
    .from("plan_steps")
    .select("plan_id, title, step_type, content_asset_id, content_url, challenge_id, simulation_template_id, metadata")
    .in("plan_id", activeIds);
  if (checkError) throw new Error(checkError.message);
  const nameById = new Map(plansResult.data.map((plan) => [plan.id, plan.name]));
  const unwired = (checkSteps ?? []).filter((step) => !isWired(step));
  if (unwired.length) {
    for (const step of unwired) console.error(`Unwired: ${nameById.get(step.plan_id)} / ${step.title} (${step.step_type})`);
    throw new Error(`${unwired.length} steps are still unwired`);
  }
  const foundation = (checkSteps ?? []).filter((step) => step.plan_id === foundationId);
  const gates = foundation.filter((step) => step.metadata?.isSegmentGate === true);
  if (foundation.length !== foundationSteps.length || gates.length !== 1) {
    throw new Error(`Foundation has ${foundation.length} steps and ${gates.length} gates`);
  }
  console.log(`Verified ${checkSteps.length} active-plan steps. Foundation gate: ${gates[0].title}.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
