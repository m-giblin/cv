import { generatedChallengeSchema } from "@/lib/ai/schemas";
import type { ChallengeLibraryEntry } from "@/lib/challenges/challenge-library-types";
import { SAILPOINT_CHALLENGE_LIBRARY_BATCH2 } from "@/lib/challenges/sailpoint-challenge-library-batch2";
import { SAILPOINT_CHALLENGE_LIBRARY_BATCH3 } from "@/lib/challenges/sailpoint-challenge-library-batch3";
import { SAILPOINT_CHALLENGE_LIBRARY_BATCH4 } from "@/lib/challenges/sailpoint-challenge-library-batch4";
import { SAILPOINT_CHALLENGE_LIBRARY_BATCH5 } from "@/lib/challenges/sailpoint-challenge-library-batch5";
import { SAILPOINT_CHALLENGE_LIBRARY_BATCH6 } from "@/lib/challenges/sailpoint-challenge-library-batch6";

export type { ChallengeLibraryEntry } from "@/lib/challenges/challenge-library-types";

/** Curated SailPoint ISC challenges — validated against generatedChallengeSchema in tests. */
export const SAILPOINT_CHALLENGE_LIBRARY: ChallengeLibraryEntry[] = [
  {
    id: "a1000001-0001-4000-8000-000000000001",
    targetLevel: "Basic",
    title: "ISC Search: Find Stale Interactive Accounts",
    description:
      "Use Identity Security Cloud Search to investigate account activity and produce a manager-ready summary. You will practice the same search patterns SEs use before customer working sessions to validate aggregation health and dormant access risk.",
    steps: [
      "Configure the SailPoint CLI (`sail env create`) or use Admin → Search in your lab tenant and run a query for interactive accounts inactive longer than 90 days (include source name and last login attributes).",
      "Export or screenshot the top 10 results and annotate which sources appear authoritative vs downstream.",
      "Write a one-page brief explaining what an IAM lead should remediate first and which follow-up workflow (certification vs automated disable) you would recommend.",
    ],
    successCriteria: [
      "Search query returns account-level fields (source, native identity, last login or modified) with a clear inactivity filter.",
      "Brief distinguishes aggregation/correlation symptoms from true access-risk findings.",
      "Recommendation ties at least one finding to a SailPoint control (certification campaign, access request, or workflow).",
    ],
    estimatedMinutes: 45,
    linkedResources: [
      "https://developer.sailpoint.com/docs/tools/cli/",
      "https://developer.sailpoint.com/docs/tools/cli/search",
    ],
    linkedSolutions: ["Identity Security Cloud", "ISC Search", "SailPoint CLI"],
    difficulty: "foundational",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "a1000001-0001-4000-8000-000000000002",
    targetLevel: "Basic",
    title: "Workflow Inventory: Triggers, Steps, and Outcomes",
    description:
      "Map how ISC workflows automate identity lifecycle events. You will list existing workflows, identify their trigger types, and explain the business outcome each supports — the foundation for every deeper workflow challenge.",
    steps: [
      "Run `sail workflow list` (or Admin → Workflows) and pick three workflows: one lifecycle (joiner/mover/leaver), one notification, and one approval-oriented flow.",
      "For each workflow, document trigger event, first three steps, and the terminal action (provision, email, HTTP call, etc.).",
      "Record a five-minute walkthrough video or written script explaining how a Basic SE would describe one workflow to a customer IAM manager.",
    ],
    successCriteria: [
      "Inventory includes workflow IDs/names and correct trigger classification.",
      "Step descriptions use ISC terminology (action, condition, define variable) accurately.",
      "Customer narrative focuses on business outcome, not button clicks.",
    ],
    estimatedMinutes: 40,
    linkedResources: [
      "https://developer.sailpoint.com/docs/tools/cli/workflow",
      "https://documentation.sailpoint.com/saas/help/workflows/index.html",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "SailPoint CLI"],
    difficulty: "foundational",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "a1000001-0001-4000-8000-000000000003",
    targetLevel: "Basic",
    title: "Create a Lower Transform for Work Email",
    description:
      "Build a JSON transform that normalizes work email addresses during identity profile mapping. Transforms are the no-code building blocks ISC uses during aggregation and attribute promotion — no BeanShell required.",
    steps: [
      "Draft a `lower` transform named `Normalize Work Email` that lowercases the incoming `email` attribute (implicit input) and document the JSON body per SailPoint transform syntax.",
      "Create the transform via POST `/transforms` or Admin → Identities → Identity Profiles → Mappings, then map it to the work email attribute on a lab profile.",
      "Preview identity data before/after and capture evidence showing at least two identities with mixed-case emails normalized.",
    ],
    successCriteria: [
      "Transform JSON includes root-level `name`, `type`, and `attributes` per SailPoint docs.",
      "Evidence shows lowercase output for mixed-case inputs without breaking null handling.",
      "Write-up explains implicit vs explicit input and when an administrator would choose each.",
    ],
    estimatedMinutes: 50,
    linkedResources: [
      "https://developer.sailpoint.com/docs/extensibility/transforms/",
      "https://developer.sailpoint.com/docs/api/v3/create-transform",
    ],
    linkedSolutions: ["Identity Security Cloud", "Transforms", "Identity Profiles"],
    difficulty: "intermediate",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "a1000001-0001-4000-8000-000000000004",
    targetLevel: "Basic",
    title: "JML Lifecycle Mapping Workshop",
    description:
      "Connect joiner-mover-leaver business language to ISC capabilities. Produce a customer-facing diagram that shows which lifecycle events become workflows, provisioning actions, and certifications in a typical ISC deployment.",
    steps: [
      "List joiner, mover, and leaver scenarios for a 5,000-employee hybrid workforce (AD + SaaS apps) and note authoritative source for each attribute change.",
      "Map each scenario to ISC features: workflow trigger, provisioning policy/transform, access request, and certification if applicable.",
      "Deliver a one-page visual (Miro, Lucidchart, or slide) plus talk track a Basic SE could use in discovery.",
    ],
    successCriteria: [
      "All three JML phases are covered with distinct ISC automation paths.",
      "Diagram distinguishes aggregation/correlation from provisioning and governance controls.",
      "Talk track uses customer outcomes (time-to-productivity, audit readiness, leaver risk) rather than feature names alone.",
    ],
    estimatedMinutes: 55,
    linkedResources: [
      "https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184",
      "https://documentation.sailpoint.com/saas/help/provisioning/provisioning.html",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "Provisioning"],
    difficulty: "foundational",
    competencyNames: ["ISC Workflows and Forms", "SLED Vertical Knowledge"],
  },
  {
    id: "b2000002-0002-4000-8000-000000000001",
    targetLevel: "Senior",
    title: "Workflow HTTP Action: Location-to-Role Lookup",
    description:
      "Model the community pattern for using delimited-file source data inside workflows when transforms cannot run in a Define Variable step. Use the Accounts API filter pattern to resolve dynamic role values from a location key.",
    steps: [
      "Stand up or document a delimited source where `nativeIdentity` equals location code and an attribute holds recommended entitlements (per SailPoint community guidance).",
      "Add a workflow HTTP action that calls `GET /accounts?filters=sourceId eq \"{id}\" and nativeIdentity eq \"{location}\"` and capture sample JSON response.",
      "Use a Define Variable step with JSONPath (e.g. `$.hTTPRequest.body[0].attributes.roles`) to pass roles into a downstream provisioning or notification step and document error handling if no account matches.",
    ],
    successCriteria: [
      "HTTP action URL and filters match ISC API syntax with parameterized location input.",
      "Variable mapping extracts entitlement/role array from response body correctly.",
      "Design notes explain why lookup transforms are not used directly in workflows and when HTTP is appropriate.",
    ],
    estimatedMinutes: 75,
    linkedResources: [
      "https://developer.sailpoint.com/discuss/t/to-use-vlookup-table-in-workflows/128376",
      "https://developer.sailpoint.com/docs/api/v3/list-accounts",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "REST API"],
    difficulty: "intermediate",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "b2000002-0002-4000-8000-000000000002",
    targetLevel: "Senior",
    title: "Nested Transform for Provisioning Display Name",
    description:
      "Design a nested transform chain (Replace → Concat → Lower) for account create profiles. Senior SEs must show how provisioning policies calculate attributes beyond the Admin UI defaults.",
    steps: [
      "Author JSON for a Replace transform that swaps a legacy department code, a Concat transform combining `firstName` and `lastName`, and an outer Lower transform — matching SailPoint nested transform guidance.",
      "Attach the transform chain to a source account create profile (Admin → Sources → Accounts → Create Account or provisioning policy API).",
      "Trigger a lab provisioning event (access request or role assignment creating a new account) and capture before/after attribute values.",
    ],
    successCriteria: [
      "Nested JSON is valid, under documented size limits, and uses explicit inputs where sources differ.",
      "Provisioning evidence shows transformed display/login attributes on the new account.",
      "Explanation covers testing strategy for account-create transforms (new account required).",
    ],
    estimatedMinutes: 70,
    linkedResources: [
      "https://developer.sailpoint.com/docs/extensibility/transforms/",
      "https://developer.sailpoint.com/docs/extensibility/transforms/operations/concat",
    ],
    linkedSolutions: ["Identity Security Cloud", "Transforms", "Provisioning Policies"],
    difficulty: "intermediate",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "b2000002-0002-4000-8000-000000000003",
    targetLevel: "Senior",
    title: "Manager Certification Reminder Workflow",
    description:
      "Design an ISC workflow that escalates overdue certification decisions to people managers. Focus on trigger logic, manager notification, and audit-friendly logging — a common Senior SE deliverable in enterprise deployments.",
    steps: [
      "Draft workflow JSON (or builder outline) triggered by certification campaign milestones with a condition for items pending longer than seven days.",
      "Include steps: lookup certifier manager identity, send notification action, and optional HTTP action to post metrics to a ticketing webhook.",
      "Run `sail workflow create -f` against a lab tenant OR walk through Admin → Workflows builder screenshots if CLI access is unavailable; document rollback plan.",
    ],
    successCriteria: [
      "Trigger and condition steps reference certification objects and time thresholds accurately.",
      "Notification content includes campaign name, due date, and deep link for reviewers.",
      "Runbook covers test campaign, production promotion, and how to disable the workflow safely.",
    ],
    estimatedMinutes: 90,
    linkedResources: [
      "https://developer.sailpoint.com/docs/tools/cli/workflow",
      "https://documentation.sailpoint.com/saas/help/certifications/certifications.html",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "Certifications"],
    difficulty: "advanced",
    competencyNames: ["ISC Workflows and Forms"],
  },
  {
    id: "c3000003-0003-4000-8000-000000000001",
    targetLevel: "Advisory",
    title: "Workflow Define Variable: dateCompare Threshold",
    description:
      "Implement the community pattern for normalizing inconsistent date strings and evaluating whether an account attribute is older than a sliding threshold using dateMath + dateCompare transforms inside a workflow Define Variable step.",
    steps: [
      "Create transform variables `thresholdISO` (dateMath from now minus X days, wrapped to ISO-8601) and `isOlderThanXDays` (dateCompare against a normalized identity attribute) per SailPoint workflow guidance.",
      "Wire the boolean output into a Condition step that branches between reminder vs escalation paths.",
      "Document how you would test with both ISO and non-ISO source dates, including fallback via nested firstValid + dateFormat.",
    ],
    successCriteria: [
      "Transform JSON uses dateMath and dateCompare types with ISO-8601 inputs as documented.",
      "Condition branching matches business rule (e.g. disable vs notify) and references the boolean variable.",
      "Testing notes cover identity attribute vs account attribute inputs and HTTP preview alternative.",
    ],
    estimatedMinutes: 80,
    linkedResources: [
      "https://developer.sailpoint.com/discuss/t/how-to-date-transform-in-a-workflow/186242",
      "https://developer.sailpoint.com/docs/extensibility/transforms/",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "Transforms"],
    difficulty: "intermediate",
    competencyNames: ["ISC Workflows and Forms", "Executive Demo Storytelling"],
  },
  {
    id: "c3000003-0003-4000-8000-000000000002",
    targetLevel: "Advisory",
    title: "Onboarding Workflow: Form, Approval, Provision",
    description:
      "Architect an end-to-end joiner workflow that combines ISC forms, approval steps, and provisioning actions — the Advisory pattern for replacing manual onboarding checklists in regulated customers.",
    steps: [
      "Whiteboard the workflow: Identity Created trigger → Form (manager supplies start date, department, equipment) → Approval → Provision accounts via configured sources → Confirmation email.",
      "Produce workflow definition JSON fragments or Admin builder exports for each segment and note idempotency if the joiner event replays.",
      "Deliver an executive summary slide tying the workflow to audit evidence (who approved what, when provisioning fired).",
    ],
    successCriteria: [
      "Workflow includes form capture, explicit approval, and provision actions with named sources.",
      "Design addresses failure paths (approval rejected, provisioning error) with notifications.",
      "Executive summary quantifies manual effort removed and compliance artifacts gained.",
    ],
    estimatedMinutes: 95,
    linkedResources: [
      "https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184",
      "https://developer.sailpoint.com/docs/tools/cli/workflow",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "Forms"],
    difficulty: "advanced",
    competencyNames: ["ISC Workflows and Forms", "Executive Demo Storytelling"],
  },
  {
    id: "c3000003-0003-4000-8000-000000000003",
    targetLevel: "Advisory",
    title: "Extensibility Decision Brief: Transforms vs Rules vs Workflows",
    description:
      "Produce an Advisory-level architecture brief that tells a customer when to use transforms, rules, workflows, and external HTTP orchestration. Ground recommendations in SailPoint documentation — not generic IAM theory.",
    steps: [
      "Pick three real customer scenarios (attribute normalization, complex approval routing, bulk data enrichment) and assign each to transforms, rules, workflows, or external iPaaS with justification.",
      "Include governance guidance: version control, who can author, SailPoint services involvement, and REST API authentication model (PAT/OAuth).",
      "Present a 10-minute executive readout with risks of over-using rules and under-using workflows (or vice versa).",
    ],
    successCriteria: [
      "Each scenario cites specific SailPoint extensibility constraints from official docs or CLI capabilities.",
      "Brief includes operational ownership (customer admin vs SailPoint services) for each artifact type.",
      "Recommendations balance time-to-value with long-term maintainability.",
    ],
    estimatedMinutes: 85,
    linkedResources: [
      "https://developer.sailpoint.com/docs/extensibility/transforms/",
      "https://developer.sailpoint.com/docs/tools/cli/",
      "https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184",
    ],
    linkedSolutions: ["Identity Security Cloud", "Transforms", "Workflows", "Rules"],
    difficulty: "advanced",
    competencyNames: ["ISC Workflows and Forms", "Executive Demo Storytelling"],
  },
  {
    id: "c3000003-0003-4000-8000-000000000004",
    targetLevel: "Advisory",
    title: "CLI Workflow Promotion Pipeline",
    description:
      "Demonstrate how Advisory SEs treat workflows as code: export from dev, review in Git, and promote to staging/production with the SailPoint CLI — reducing configuration drift across tenants.",
    steps: [
      "Download workflows from a dev tenant (`sail workflow download -f ./workflows`) and check the JSON into a sample Git repo structure with README.",
      "Modify a non-production workflow offline, run `sail workflow update -f`, and capture CLI output showing successful update.",
      "Write a promotion checklist covering PAT/OAuth auth (`sail set auth`), environment variables for CI/CD, and rollback via `sail workflow delete` + redeploy.",
    ],
    successCriteria: [
      "Repo layout documents environment naming (`sail env create`) and secrets handling via env vars.",
      "Evidence shows create or update against API with matching workflow IDs.",
      "Checklist addresses peer review, change window, and tenant-specific trigger validation.",
    ],
    estimatedMinutes: 75,
    linkedResources: [
      "https://developer.sailpoint.com/docs/tools/cli/workflow",
      "https://developer.sailpoint.com/docs/tools/cli/",
    ],
    linkedSolutions: ["Identity Security Cloud", "Workflows", "SailPoint CLI"],
    difficulty: "intermediate",
    competencyNames: ["ISC Workflows and Forms"],
  },
  ...SAILPOINT_CHALLENGE_LIBRARY_BATCH2,
  ...SAILPOINT_CHALLENGE_LIBRARY_BATCH3,
  ...SAILPOINT_CHALLENGE_LIBRARY_BATCH4,
  ...SAILPOINT_CHALLENGE_LIBRARY_BATCH5,
  ...SAILPOINT_CHALLENGE_LIBRARY_BATCH6,
];

export function validateChallengeLibrary(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const ids = new Set<string>();
  for (const entry of SAILPOINT_CHALLENGE_LIBRARY) {
    if (ids.has(entry.id)) {
      errors.push(`Duplicate challenge id: ${entry.id}`);
    }
    ids.add(entry.id);

    const parsed = generatedChallengeSchema.safeParse(entry);
    if (!parsed.success) {
      errors.push(`${entry.title}: ${parsed.error.message}`);
    }
  }

  if (SAILPOINT_CHALLENGE_LIBRARY.length < 100) {
    errors.push(`Expected at least 100 challenges — got ${SAILPOINT_CHALLENGE_LIBRARY.length}`);
  }

  for (const level of ["Basic", "Senior", "Advisory"] as const) {
    const count = SAILPOINT_CHALLENGE_LIBRARY.filter((c) => c.targetLevel === level).length;
    if (count < 20) {
      errors.push(`Expected at least 20 ${level} challenges — got ${count}`);
    }
  }

  for (const difficulty of ["foundational", "intermediate", "advanced"] as const) {
    const count = SAILPOINT_CHALLENGE_LIBRARY.filter((c) => c.difficulty === difficulty).length;
    if (count < 15) {
      errors.push(`Expected at least 15 ${difficulty} challenges — got ${count}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
