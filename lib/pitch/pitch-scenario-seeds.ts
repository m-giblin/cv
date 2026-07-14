export type PitchScenarioTrack = "elevator" | "discovery" | "competitive" | "executive" | "governance";

export type PitchScenarioSeed = {
  slug: string;
  track: PitchScenarioTrack;
  shortLabel: string;
  label: string;
  promptLabel: string;
  prompt: string;
  description: string;
  competencies: string[];
  linkedSolution: string | null;
  maxDurationSec: number;
  sortOrder: number;
};

/**
 * Elevator pitches aligned to SailPoint SLED eBook v6 (Edition 9.0, June 2026).
 * One scenario per solution chapter; situational drills kept from legacy Pitch Studio.
 */
export const PITCH_SCENARIO_SEEDS: PitchScenarioSeed[] = [
  {
    slug: "elevator-isc",
    track: "elevator",
    shortLabel: "Atlas / ISC",
    label: "Elevator pitch — ISC Atlas Platform",
    promptLabel: "Elevator pitch · State CIO",
    prompt:
      "A state CIO says IAM is fragmented across 14 AD domains after decades of agency mergers. Deliver the 30-second SLED Atlas pitch: unified AI platform, connector power, real-time risk intelligence, audit-ready compliance — one platform, not brittle custom code.",
    description: "Ch.1 — Atlas foundation: discover, govern, secure every identity",
    competencies: ["Executive Demo Storytelling"],
    linkedSolution: "Identity Security Cloud",
    maxDurationSec: 30,
    sortOrder: 10,
  },
  {
    slug: "elevator-harbor-pilot",
    track: "elevator",
    shortLabel: "Harbor Pilot",
    label: "Elevator pitch — Harbor Pilot AI Agent",
    promptLabel: "Elevator pitch · IAM admin",
    prompt:
      "A helpdesk tech needs to know why a state trooper's database access failed after a promotion — no time to dig through logs. Pitch Harbor Pilot: natural-language search, troubleshoot, and govern identity on Atlas in seconds, not hours.",
    description: "Ch.1.1 — GenAI agent for identity search and troubleshooting",
    competencies: ["Agentic AI", "Discovery"],
    linkedSolution: "Harbor Pilot",
    maxDurationSec: 30,
    sortOrder: 15,
  },
  {
    slug: "elevator-lifecycle-mover",
    track: "elevator",
    shortLabel: "Secure mover",
    label: "Elevator pitch — Adaptive Identity Lifecycle",
    promptLabel: "Elevator pitch · HR / Security",
    prompt:
      "A clinic manager was promoted to central admin but still has clinic-level HIPAA access because nobody removed it. Pitch Adaptive Identity Lifecycle Security: HR attribute changes auto-recalculate roles, strip old access, manage leave/term states — no lingering access.",
    description: "Ch.2 — Automated mover lifecycle, roles, and least privilege",
    competencies: ["Governance", "Discovery"],
    linkedSolution: "Adaptive Identity Lifecycle Security",
    maxDurationSec: 30,
    sortOrder: 20,
  },
  {
    slug: "elevator-certifications",
    track: "elevator",
    shortLabel: "Certs & AIC",
    label: "Elevator pitch — Certifications & Access Intelligence Center",
    promptLabel: "Elevator pitch · Audit lead",
    prompt:
      "A state revenue department is failing NIST audits because managers rubber-stamp 45 AD groups per employee. Pitch Certifications + AIC: business-friendly roles, AI outlier flags, instant zero-findings reports — fraction of the effort on Atlas.",
    description: "Ch.3 — Certification campaigns + AIC audit evidence",
    competencies: ["Governance", "Executive Demo Storytelling"],
    linkedSolution: "Certifications",
    maxDurationSec: 30,
    sortOrder: 30,
  },
  {
    slug: "elevator-identity-graph",
    track: "elevator",
    shortLabel: "Identity Graph",
    label: "Elevator pitch — Identity Graph & Blast Radius",
    promptLabel: "Elevator pitch · SOC analyst",
    prompt:
      "During a ransomware tabletop, a state SOC needs blast radius for a leaked credential — human, service account, and machine identities. Pitch Identity Graph on Atlas: unified visibility, access-path tracing, risk heatmaps, zero-surprise audits.",
    description: "Ch.4 — Unified visibility and blast-radius analysis",
    competencies: ["Governance", "Executive Demo Storytelling"],
    linkedSolution: "Identity Graph",
    maxDurationSec: 30,
    sortOrder: 40,
  },
  {
    slug: "elevator-access-requests",
    track: "elevator",
    shortLabel: "Access requests",
    label: "Elevator pitch — Intelligent Access Requests",
    promptLabel: "Elevator pitch · IT Director",
    prompt:
      "Delayed approvals are driving shadow IT at a state agency. Pitch Intelligent Access Requests: attribute-driven routing, fast single approvals for safe requests, strict quorum for sensitive data, Slack/Teams integration — compliance without bottlenecks.",
    description: "Ch.5 — Adaptive approvals and access request velocity",
    competencies: ["Discovery", "Executive Demo Storytelling"],
    linkedSolution: "Access Requests",
    maxDurationSec: 30,
    sortOrder: 50,
  },
  {
    slug: "elevator-machine-identity",
    track: "elevator",
    shortLabel: "Machine IDs",
    label: "Elevator pitch — Machine Identity Security",
    promptLabel: "Elevator pitch · CISO",
    prompt:
      "A university CISO locked down human identities but has thousands of unowned service accounts and RPA bots outnumbering staff 10:1. Pitch Machine Identity Security: discover all, group under application identities, assign human ownership, Atlas governance.",
    description: "Ch.6 — Service accounts, bots, and machine identity ownership",
    competencies: ["Governance", "Discovery"],
    linkedSolution: "Machine Identity Security",
    maxDurationSec: 30,
    sortOrder: 55,
  },
  {
    slug: "elevator-ais",
    track: "elevator",
    shortLabel: "AIS elevator",
    label: "Elevator pitch — Agent Identity Security",
    promptLabel: "Elevator pitch · Research CIO",
    prompt:
      "Faculty are deploying AI research agents touching grant and FERPA data with no owner. Pitch Agent Identity Security: discover every agent, enforce human accountability, least privilege, blast radius in Identity Graph — secure innovation now.",
    description: "Ch.7 — Govern AI agents as first-class identities",
    competencies: ["Agentic AI", "Executive Demo Storytelling"],
    linkedSolution: "Agent Identity Security",
    maxDurationSec: 30,
    sortOrder: 60,
  },
  {
    slug: "elevator-workflows",
    track: "elevator",
    shortLabel: "Workflows",
    label: "Elevator pitch — Workflow Solutions",
    promptLabel: "Elevator pitch · IT Director",
    prompt:
      "A state university cannot staff every complex identity change manually. Pitch Workflow Solutions: event-driven drag-and-drop automation — emergency offboarding, ITSM tickets — strategy over fragile scripts, native on Atlas.",
    description: "Ch.8 — Event-driven identity automation on Atlas",
    competencies: ["Discovery", "Executive Demo Storytelling"],
    linkedSolution: "Workflows",
    maxDurationSec: 30,
    sortOrder: 70,
  },
  {
    slug: "elevator-nerm",
    track: "elevator",
    shortLabel: "NERM",
    label: "Elevator pitch — Non-Employee Risk Management",
    promptLabel: "Elevator pitch · HR / Security",
    prompt:
      "Seasonal campus workers and state IT vendors create compliance blind spots — they don't exist in HR. Pitch NERM: sponsor-driven onboarding, time-bound access, automatic offboarding when contracts end; enterprise risk scoring for large contractor populations.",
    description: "Ch.9 — Contractor and vendor lifecycle governance",
    competencies: ["Discovery", "Governance"],
    linkedSolution: "Non-Employee Risk Management",
    maxDurationSec: 30,
    sortOrder: 80,
  },
  {
    slug: "elevator-das",
    track: "elevator",
    shortLabel: "DAS",
    label: "Elevator pitch — Data Access Security",
    promptLabel: "Elevator pitch · Data owner",
    prompt:
      "A state breach involved over-privileged access to unstructured files and shared folders. Pitch Data Access Security: discover hidden PII, classify sensitive files, map permissions to identities — provable compliance, not 'we think it's locked down.'",
    description: "Ch.10 — Unstructured data and identity-aware permissions",
    competencies: ["Governance"],
    linkedSolution: "Data Access Security",
    maxDurationSec: 30,
    sortOrder: 90,
  },
  {
    slug: "elevator-pta",
    track: "elevator",
    shortLabel: "PTA",
    label: "Elevator pitch — Privileged Task Automation",
    promptLabel: "Elevator pitch · CISO",
    prompt:
      "Helpdesk techs have standing privileged access just for routine daily tasks at a state agency. Pitch Privileged Task Automation: automated workflows via secure Launchpad, encrypted admin credentials — eliminate standing privilege.",
    description: "Ch.11 — Delegate privileged tasks without standing access",
    competencies: ["Governance"],
    linkedSolution: "Privileged Task Automation",
    maxDurationSec: 30,
    sortOrder: 100,
  },
  {
    slug: "elevator-saam",
    track: "elevator",
    shortLabel: "SAAM onboarding",
    label: "Elevator pitch — Application Onboarding (SAAM)",
    promptLabel: "Elevator pitch · University CIO",
    prompt:
      "A university CIO must govern 150 departmental apps for a new state law — manual integration would take three years. Pitch SAAM Application Onboarding: continuous discovery, zero-touch onboarding, hundreds of apps under Atlas governance in days.",
    description: "Ch.12 — Rapid application discovery and onboarding",
    competencies: ["Discovery", "Governance"],
    linkedSolution: "Application Onboarding",
    maxDurationSec: 30,
    sortOrder: 110,
  },
  {
    slug: "elevator-password-mgmt",
    track: "elevator",
    shortLabel: "Password mgmt",
    label: "Elevator pitch — Password Management",
    promptLabel: "Elevator pitch · County IT",
    prompt:
      "A county helpdesk handles 200 password reset calls a week across three separate systems. Pitch Password Management: MFA self-service resets synchronized across legacy and cloud — eliminate the helpdesk bottleneck for students and staff.",
    description: "Ch.13 — Self-service password sync across environments",
    competencies: ["Discovery"],
    linkedSolution: "Password Management",
    maxDurationSec: 30,
    sortOrder: 120,
  },
  {
    slug: "elevator-mcp",
    track: "elevator",
    shortLabel: "MCP",
    label: "Elevator pitch — Model Context Protocol",
    promptLabel: "Elevator pitch · Platform lead",
    prompt:
      "Employees type access requests into Microsoft Copilot instead of IT forms. Pitch MCP: enterprise chatbots process access requests securely, bridge to SailPoint governed approval workflows — users never leave the chat window.",
    description: "Ch.14 — Chatbot-driven governed access requests via MCP",
    competencies: ["Agentic AI", "Governance"],
    linkedSolution: "Model Context Protocol",
    maxDurationSec: 30,
    sortOrder: 130,
  },
  {
    slug: "elevator-ssf",
    track: "elevator",
    shortLabel: "SSF",
    label: "Elevator pitch — Shared Signals Framework",
    promptLabel: "Elevator pitch · SOC lead",
    prompt:
      "CrowdStrike flags a compromised state laptop — previously the SOC manually called IAM to disable the user. Pitch SSF: bidirectional CAEP signals — CrowdStrike/Okta in, instant SailPoint suspension; policy violations out to force session revocation.",
    description: "Ch.15 — Real-time bidirectional identity security signals",
    competencies: ["Governance", "Executive Demo Storytelling"],
    linkedSolution: "Shared Signals Framework",
    maxDurationSec: 30,
    sortOrder: 140,
  },
  {
    slug: "elevator-shadow-ai",
    track: "elevator",
    shortLabel: "Shadow AI",
    label: "Elevator pitch — Shadow AI Remediation",
    promptLabel: "Elevator pitch · CISO",
    prompt:
      "70% of agency staff use unauthorized GenAI and upload citizen PII — firewalls can't see browser sessions. Pitch Shadow AI Remediation: real-time discovery, screen blur on policy violation, redirect to sanctioned AI — FERPA/state privacy without slowing innovation.",
    description: "Ch.16 — Just-in-time GenAI policy enforcement",
    competencies: ["Agentic AI", "Governance"],
    linkedSolution: "Shadow AI Remediation",
    maxDurationSec: 35,
    sortOrder: 150,
  },
  {
    slug: "elevator-agentic-fabric",
    track: "elevator",
    shortLabel: "Agentic Fabric",
    label: "Elevator pitch — SailPoint Agentic Fabric",
    promptLabel: "Elevator pitch · DMV CIO",
    prompt:
      "A state DMV deployed over-privileged AI agents with no owner on resident PII. Pitch Agentic Fabric: discover agents and machine accounts, assign owners, least privilege, auto-contain rogue agents at machine speed — yes to AI without a new attack surface.",
    description: "Ch.17 — Govern the agentic enterprise on Atlas",
    competencies: ["Agentic AI"],
    linkedSolution: "Agentic Fabric",
    maxDurationSec: 30,
    sortOrder: 160,
  },
  {
    slug: "ais-discovery",
    track: "discovery",
    shortLabel: "CISO discovery open",
    label: "AIS / Agentic positioning",
    promptLabel: "AIS positioning · CISO persona",
    prompt: "Open with a discovery question about non-human identities and agent blast radius — no product tour.",
    description: "Agent identity lifecycle — discover, govern, protect",
    competencies: ["Agentic AI"],
    linkedSolution: "Agent Identity Security",
    maxDurationSec: 90,
    sortOrder: 210,
  },
  {
    slug: "competitive-trap",
    track: "competitive",
    shortLabel: "Competitive trap",
    label: "Competitive trap defusal",
    promptLabel: "Competitive defusal",
    prompt: "The prospect says Saviynt already covers access reviews. Reframe without trash-talking.",
    description: "Acknowledge competitor, reframe to governance gap, proof point",
    competencies: ["Competitive Positioning", "Objection Handling"],
    linkedSolution: null,
    maxDurationSec: 90,
    sortOrder: 220,
  },
  {
    slug: "executive-close",
    track: "executive",
    shortLabel: "Executive demo close",
    label: "Executive business case",
    promptLabel: "Executive business case",
    prompt: "Close a 15-minute exec readout — risk, audit, and board outcomes only.",
    description: "Risk, audit, and board-level outcomes — no feature tour",
    competencies: ["Executive Demo Storytelling", "Discovery"],
    linkedSolution: null,
    maxDurationSec: 120,
    sortOrder: 230,
  },
  {
    slug: "mcp-governance",
    track: "governance",
    shortLabel: "MCP governance",
    label: "MCP governance story",
    promptLabel: "MCP governance story",
    prompt: "Explain how third-party agents call ISC APIs with policy, audit, and least privilege.",
    description: "Third-party agents calling ISC APIs with policy and audit",
    competencies: ["Agentic AI", "Governance"],
    linkedSolution: "Model Context Protocol",
    maxDurationSec: 90,
    sortOrder: 240,
  },
];

export const PITCH_QUEUE_SLOT_COUNT = 4;
export const PITCH_PASSING_GRADE = 4;
