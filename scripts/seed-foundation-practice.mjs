/**
 * Drafts the new-hire Identity Foundation and the first Machine Identity pair
 * for the SailPoint tenant. Pitches stay inactive. Simulations carry a draft
 * marker so they cannot be assigned until an admin chooses Make it live.
 *
 * Safe to rerun: existing slugs and simulation names are left unchanged.
 * Run: node scripts/seed-foundation-practice.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const PLAYBOOKS = {
  atlas: "23763421-ecbd-4625-bb2f-ed0a31b5f6c5",
  lifecycle: "7a63d4ac-dd3c-49fb-b4c4-5c2587aa94b7",
  compliance: "ef5fa18c-5d5d-4dd4-ae67-35bc76faa179",
  machine: "a384d439-2934-434c-bde3-5ae028aefed4",
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function goals(lines) {
  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

function simulation({ name, persona, vertical, solution, playbookId, situation, facts, success, competency = "Identity foundations" }) {
  const revealed = facts.map((fact) => `- ${fact}`).join("\n");
  const scored = success.map((goal, index) => `  ${index + 1}. ${goal}`).join("\n");
  return {
    name,
    persona,
    vertical,
    solution_focus: solution,
    difficulty: "foundational",
    practice_rounds_before_submit: 1,
    source_playbook_id: playbookId,
    source_version: 1,
    prompt_body: `STATUS: draft
You are ${persona} in ${vertical}.
Situation: ${situation}
Difficulty: foundational.
Solution in focus: ${solution}
Stay in character as the buyer. You are patient and you are not an identity expert. Use plain language. Do not teach the lesson, do not name SailPoint, and do not use the words joiner, mover, leaver, entitlement, or certification unless the learner has just used them and asked you to react.
Reveal a hidden fact only when the learner asks a question that earns it. If they pitch a product before they understand the problem, ask them to slow down and explain it in everyday words.
Hidden facts:
${revealed}
The learner succeeds if they:
${scored}

SCORING
Score the learner from 0 to 100. Weight each goal equally:
${scored}
Pass mark: 70
Practice rounds before submitting: 1
Competency: ${competency}`,
  };
}

const pitches = [
  {
    slug: "foundation-what-identity-controls",
    track: "elevator",
    short_label: "What identity controls",
    label: "Foundation: What identity controls",
    prompt_label: "Explain it in plain language",
    prompt:
      "You are talking to a new colleague who has never worked in identity. In 60 seconds, explain what identity controls inside an organization. Use one everyday example. Do not name a product or a vendor.",
    description: goals([
      "Explains that identity decides who can reach which systems and data",
      "Uses an everyday example a non-expert can follow",
      "Names the risk of access that is too broad or never removed",
      "Avoids product names and unexplained jargon",
    ]),
    reference_text:
      "Identity is the control for who can get into which systems and data. When someone joins, they need access to do the job. When the job changes, the access has to change with it. When they leave, the access has to stop. The danger is not only a stranger breaking in. It is a real person, or an old account, keeping a key they no longer need. If nobody can say who has access to a system and why, the organization cannot protect its data.",
    competencies: ["Identity foundations"],
    linked_solution: null,
    max_duration_sec: 60,
    sort_order: 9101,
    source_playbook_id: null,
  },
  {
    slug: "foundation-standing-access",
    track: "elevator",
    short_label: "Standing access",
    label: "Foundation: Standing access",
    prompt_label: "Explain least privilege",
    prompt:
      "A department manager says, “People here just keep the access they have always had.” In 60 seconds, explain why access that stays forever becomes a risk, and what a safer pattern sounds like. Do not name a product.",
    description: goals([
      "Explains standing access in plain language",
      "Connects old access to a real business or data risk",
      "Describes least privilege without hiding behind the term",
      "Does not jump to a product pitch",
    ]),
    reference_text:
      "Access that stays after the work changes is standing access. The person may still be trusted, but the key no longer matches the job. That extra access is what an attacker, or a simple mistake, can use. Safer access is the access someone needs now, for the work they do now, and it is removed when the work ends. The goal is not to make work harder. It is to stop yesterday’s access from becoming tomorrow’s incident.",
    competencies: ["Identity foundations"],
    linked_solution: "Least privilege",
    max_duration_sec: 60,
    sort_order: 9103,
    source_playbook_id: PLAYBOOKS.lifecycle,
  },
  {
    slug: "foundation-access-review",
    track: "executive",
    short_label: "What an access review is",
    label: "Foundation: What an access review is",
    prompt_label: "Explain a certification",
    prompt:
      "A finance manager has never heard the word certification. In 90 seconds, explain what an access review is, why a manager is asked to do it, and why a review of cryptic system names usually fails. You may use the field guide’s example of a manager approving hundreds of names they cannot interpret. Do not open with a product.",
    description: goals([
      "Defines an access review as a manager confirming that access is still needed",
      "Explains why the reviewer must understand what they are approving",
      "Names rubber-stamping as the failure when the list is too technical or too long",
      "Ends with the outcome: fewer, clearer decisions and evidence an auditor can trust",
    ]),
    reference_text:
      "An access review asks a manager a simple question: does this person still need this access? It fails when the list shows technical names the manager cannot read, hundreds of rows at a time. The manager approves everything so the task will end. The review looks complete, but it did not check anything. A useful review groups that technical access into a business role the manager recognizes, so they make one clear decision instead of hundreds of guesses. That decision is the evidence an auditor can trust.",
    competencies: ["Identity foundations"],
    linked_solution: "Access certifications",
    max_duration_sec: 90,
    sort_order: 9104,
    source_playbook_id: PLAYBOOKS.compliance,
  },
  {
    slug: "foundation-atlas-story",
    track: "elevator",
    short_label: "The Atlas story",
    label: "Foundation: The Atlas story",
    prompt_label: "Connect the ideas",
    prompt:
      "You have already explained identity, job changes, standing access, and access reviews. In 90 seconds, tell the SailPoint Atlas story to a new colleague. Start with the problem of separate tools, then say what one platform changes. Use the field guide’s idea that the gaps between tools are where extra access hides.",
    description: goals([
      "Starts with separate tools for granting, reviewing, and removing access",
      "Explains that the seams between those tools are where policy stops",
      "Describes Atlas as one platform for discovering, governing, and securing identities",
      "Connects the story back to a buyer outcome, not a feature list",
    ]),
    reference_text:
      "Most organizations did the reasonable thing. They bought one tool to grant access, another to review it, and another for the privileged accounts, then stitched them together. Every stitch is a seam. Access granted in one tool is not always visible to the next, so extra access collects in the gaps. SailPoint Atlas is the platform underneath those jobs. It discovers, governs, and secures identities in one place, so a new hire, a role change, and an access review all use the same picture. The team spends its time on the mission instead of maintaining the stitches.",
    competencies: ["Identity foundations"],
    linked_solution: "SailPoint ISC Atlas Platform",
    max_duration_sec: 90,
    sort_order: 9106,
    source_playbook_id: PLAYBOOKS.atlas,
  },
  {
    slug: "machine-identities-plain-language",
    track: "elevator",
    short_label: "Machine identities, plainly",
    label: "Machine identities: Explain it simply",
    prompt_label: "Explain non-human access",
    prompt:
      "A leader thinks identity means employees. In 60 seconds, explain machine identities: service accounts, bots, and scripts that hold access, often with no owner and no end date. Lead with the problem. You may close with what SailPoint Machine Identity Security adds: find them, group them, and give each one a human owner.",
    description: goals([
      "Defines a machine identity as a non-human account that can reach systems",
      "Says these accounts often outnumber people and have no HR record",
      "Names the risk of privileged access with no owner and no end date",
      "Closes with discovery, grouping, and a human owner, without a feature dump",
    ]),
    reference_text:
      "The accounts that worry me are not only the employees. Service accounts, bots, and scripts also hold keys, and in most organizations they outnumber the people. They never appear in HR. They often have no owner, no end date, and a password that has not changed. Many of them can reach important systems all day. SailPoint Machine Identity Security finds those accounts, groups the ones that belong to the same application, and makes a person responsible for each one, including when that person leaves.",
    competencies: ["Machine identity"],
    linked_solution: "Machine Identity Security",
    max_duration_sec: 60,
    sort_order: 9107,
    source_playbook_id: PLAYBOOKS.machine,
  },
];

const simulations = [
  simulation({
    name: "Foundation: Joiner, mover, and leaver",
    persona: "Jordan Hale, IT Director at a state university",
    vertical: "Higher Ed",
    solution: "Identity lifecycle",
    playbookId: PLAYBOOKS.lifecycle,
    situation:
      "Jordan believes access is under control because new employees get accounts on day one and people who leave are disabled quickly. Jordan has not noticed what happens when someone changes departments. Help Jordan see the gap before you mention a product.",
    facts: [
      "New hires receive accounts the same day HR enters them.",
      "Leavers are disabled within one business day.",
      "A department transfer updates HR, and nobody files an IT ticket. The new access is added. The old access stays.",
      "In the last review, managers found people who still had access from jobs they left two years ago.",
      "Jordan does not know how many internal transfers happen in a year and will admit that if asked.",
    ],
    success: [
      "Explain joining, changing jobs, and leaving in plain language before naming a product",
      "Ask what actually tells IT that someone changed departments",
      "Uncover that old access stays after a transfer",
      "Wait to talk about a product until Jordan has described that gap",
    ],
  }),
  simulation({
    name: "Foundation: People and non-human accounts",
    persona: "Sam Ortiz, operations lead at a state agency",
    vertical: "SLED",
    solution: "Non-human identities",
    playbookId: PLAYBOOKS.machine,
    situation:
      "Sam thinks identity means employees and contractors. Sam has never counted the accounts that are not people. Your job is to introduce that idea and learn whether those accounts have an owner. Do not pitch.",
    facts: [
      "Sam can list the employee process and believes that is the whole identity program.",
      "The student-information integration, a nightly script, and two vendor connections each use a service account.",
      "Sam cannot say how many service accounts exist.",
      "The person who created several of those accounts left last year. Sam is not sure who owns them now.",
      "Sam does not remember the last time those passwords were changed.",
    ],
    success: [
      "Distinguish a person from an account that is not a person",
      "Ask who owns the accounts used by integrations and scripts",
      "Uncover that at least one owner has left and the password history is unknown",
      "Stop once Sam sees the gap. Do not pitch a product",
    ],
  }),
  simulation({
    name: "Machine identities: Who owns the service accounts",
    persona: "Sam Ortiz, operations lead at a state agency",
    vertical: "SLED",
    solution: "Machine Identity Security",
    playbookId: PLAYBOOKS.machine,
    situation:
      "Sam now accepts that service accounts exist, but still cannot say how many there are or who owns them. Discover the ownership gap. Only after Sam admits the unknown should you explain, in one or two sentences, that the accounts can be discovered, grouped by application, and given a human owner.",
    facts: [
      "Sam cannot answer how many service accounts are in Active Directory.",
      "When a vendor integration is retired, there is no routine step to remove its service account.",
      "The student-information service account has no current owner written down.",
      "Sam cannot remember a service-account password being rotated in the last year.",
      "When the creator of an account leaves, the account keeps running.",
    ],
    success: [
      "Open by asking for a count of service accounts and pause for the answer",
      "Find out who owns the student-information account and what happens when an owner leaves",
      "Learn whether retired integrations and old passwords are cleaned up",
      "Explain discovery, grouping, and human ownership only after those gaps are on the table",
    ],
    competency: "Machine identity",
  }),
];

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: existingPitches, error: pitchReadError }, { data: existingSims, error: simReadError }] =
    await Promise.all([
      admin.from("pitch_scenario_templates").select("slug").eq("tenant_id", TENANT_ID),
      admin.from("simulation_templates").select("name").eq("tenant_id", TENANT_ID),
    ]);
  if (pitchReadError || simReadError) throw new Error(pitchReadError?.message ?? simReadError?.message);

  const pitchSlugs = new Set((existingPitches ?? []).map((row) => row.slug));
  const simNames = new Set((existingSims ?? []).map((row) => row.name));
  const newPitches = pitches.filter((row) => !pitchSlugs.has(row.slug));
  const newSims = simulations.filter((row) => !simNames.has(row.name));

  if (newPitches.length) {
    const { error } = await admin.from("pitch_scenario_templates").insert(
      newPitches.map((row) => ({
        ...row,
        tenant_id: TENANT_ID,
        active: false,
        auto_queue: false,
        passing_grade: 3,
        response_modes: ["video", "voice", "text"],
        source_version: row.source_playbook_id ? 1 : null,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (newSims.length) {
    const { error } = await admin.from("simulation_templates").insert(
      newSims.map((row) => ({ ...row, tenant_id: TENANT_ID })),
    );
    if (error) throw new Error(error.message);
  }

  console.log(
    JSON.stringify(
      {
        pitchesInserted: newPitches.map((row) => row.label),
        pitchesSkipped: pitches.length - newPitches.length,
        simulationsInserted: newSims.map((row) => row.name),
        simulationsSkipped: simulations.length - newSims.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
