import type { ChallengeLibraryEntry } from "@/lib/challenges/challenge-library-types";

/** Agentic AI / AIS / Agentic Fabric track — pairs with /learn GenAI vs Agentic curriculum. */
export const SAILPOINT_CHALLENGE_LIBRARY_BATCH3: ChallengeLibraryEntry[] = [
  {
    id: "e5000001-0005-4000-8000-000000000001",
    targetLevel: "Basic",
    title: "GenAI vs Agentic AI: Customer One-Pager",
    description:
      "Produce a crisp one-pager that helps customers understand why GenAI assistants and Agentic AI systems require different governance postures. This is the foundational talk track before any AIS demo.",
    steps: [
      "Draft a two-column comparison: GenAI (prompt → response, human-in-loop) vs Agentic AI (goals, tool access, persistent identity).",
      "Add three SailPoint-specific bullets: why agents are non-human identities, why shadow AI is a discovery problem, and where ISC governance applies.",
      "Record a three-minute Loom or written script pitching the one-pager to a skeptical IAM director who says 'we already have Copilot policies.'",
    ],
    successCriteria: [
      "One-pager avoids feature-dumping and uses customer-risk language (audit, ownership, blast radius).",
      "Agentic column explicitly mentions governed actions and lifecycle — not just 'smarter chatbots.'",
      "Talk track handles the Copilot objection with identity-governance framing.",
    ],
    estimatedMinutes: 40,
    linkedResources: ["https://www.sailpoint.com/products/agent-identity-security"],
    linkedSolutions: ["Agent Identity Security", "Agentic Fabric", "Identity Security Cloud"],
    difficulty: "foundational",
    competencyNames: ["Agentic AI"],
  },
  {
    id: "e5000001-0005-4000-8000-000000000002",
    targetLevel: "Basic",
    title: "Shadow AI Discovery Workshop Prep",
    description:
      "Prepare a facilitator guide for a 45-minute workshop that helps customers inventory AI agents touching production data — the opening move for AIS conversations.",
    steps: [
      "List eight discovery questions (owners, data sources, provisioning paths, audit evidence) mapped to Agentic Fabric Discover phase.",
      "Build a simple workshop agenda with roles (CISO, IAM lead, app owner) and expected outputs.",
      "Identify two lab or doc-based examples of agents you could reference (Copilot Studio, AWS Bedrock agent, etc.).",
    ],
    successCriteria: [
      "Questions force ownership and audit answers — not just 'how many chatbots.'",
      "Agenda ends with a prioritized agent inventory and next-step governance milestone.",
      "Examples are realistic for enterprise buyers, not consumer AI toys.",
    ],
    estimatedMinutes: 50,
    linkedResources: ["https://documentation.sailpoint.com/"],
    linkedSolutions: ["Agentic Fabric", "Agent Identity Security"],
    difficulty: "foundational",
    competencyNames: ["Agentic AI", "Discovery"],
  },
  {
    id: "e5000001-0005-4000-8000-000000000003",
    targetLevel: "Senior",
    title: "AIS Agent Registration Lab",
    description:
      "Walk through how AIS aggregates agents from a cloud platform and ties them to human owners. Senior SEs must explain aggregation, ownership, and certification without reading slides.",
    steps: [
      "In lab or documented sandbox, identify where AIS surfaces agents from at least one connector (AWS, Azure, GCP, or Salesforce).",
      "Screenshot agent metadata: owner, permissions summary, and linked data sources.",
      "Write a customer email explaining what changes after registration — discovery alone vs governed lifecycle.",
    ],
    successCriteria: [
      "Evidence shows agent treated as identity object with owner attribution.",
      "Email distinguishes AIS registration from generic CMDB inventory.",
      "Notes mention certification or access review path for high-risk agents.",
    ],
    estimatedMinutes: 55,
    linkedResources: ["https://www.sailpoint.com/products/agent-identity-security"],
    linkedSolutions: ["Agent Identity Security", "Identity Security Cloud"],
    difficulty: "intermediate",
    competencyNames: ["Agentic AI", "AIS"],
  },
  {
    id: "e5000001-0005-4000-8000-000000000004",
    targetLevel: "Senior",
    title: "MCP Server Governance Story",
    description:
      "Explain SailPoint's MCP Server as the governed bridge for third-party agents calling ISC APIs — a 2026 differentiator in agentic identity conversations.",
    steps: [
      "Diagram a flow: external agent → MCP Server → ISC API with policy enforcement and audit.",
      "List three customer risks if agents call ISC APIs without governance (over-permission, no owner, no audit).",
      "Draft a two-minute competitive positioning against 'we'll wrap APIs in our own middleware.'",
    ],
    successCriteria: [
      "Diagram labels authentication, authorization, and audit events.",
      "Risks tie to board-level concerns, not developer convenience only.",
      "Positioning emphasizes SailPoint-native policy and identity context.",
    ],
    estimatedMinutes: 45,
    linkedResources: ["https://developer.sailpoint.com/"],
    linkedSolutions: ["Agentic Fabric", "Identity Security Cloud"],
    difficulty: "intermediate",
    competencyNames: ["Agentic AI", "Governance"],
  },
  {
    id: "e5000001-0005-4000-8000-000000000005",
    targetLevel: "Advisory",
    title: "Zero Standing Privilege for Agents",
    description:
      "Build an executive briefing on Zero Standing Privilege (ZSP) applied to high-risk AI agents — the 2026 evolution beyond classic least privilege messaging.",
    steps: [
      "Define ZSP in one paragraph and contrast with standing admin/service permissions for agents.",
      "Map ZSP to a customer scenario (finance close bot, customer-data agent, infra automation).",
      "Prepare three board-ready metrics: agents with standing privilege, uncertified owners, data sources without DAS coverage.",
    ],
    successCriteria: [
      "Briefing uses ZSP language consistently — not interchangeable with generic least privilege.",
      "Scenario includes human owner accountability when agent acts.",
      "Metrics are measurable from ISC/AIS reporting, not hypothetical.",
    ],
    estimatedMinutes: 60,
    linkedResources: ["https://www.sailpoint.com/"],
    linkedSolutions: ["Agent Identity Security", "Data Access Security"],
    difficulty: "advanced",
    competencyNames: ["Agentic AI", "Governance"],
  },
  {
    id: "e5000001-0005-4000-8000-000000000006",
    targetLevel: "Advisory",
    title: "Agentic Fabric Competitive Takeout",
    description:
      "Prepare a competitive battlecard moment: why directory-centric IAM and standalone AI security tools fail on agent lifecycle — and how Agentic Fabric closes the gap.",
    steps: [
      "Create a comparison table: Entra/Okta agent features vs ISC Agentic Fabric (discover, govern, protect).",
      "Document two landmines competitors plant and your reframes.",
      "Write a closing 'one thing to nail' for a CISO who says identity is solved.",
    ],
    successCriteria: [
      "Table is factual and avoids strawman — acknowledges competitor strengths.",
      "Landmines include 'agents are just apps' and 'Copilot admin center is enough.'",
      "Close ties to audit readiness and agent blast radius, not feature count.",
    ],
    estimatedMinutes: 55,
    linkedResources: ["https://www.sailpoint.com/"],
    linkedSolutions: ["Agentic Fabric", "Agent Identity Security", "Identity Security Cloud"],
    difficulty: "advanced",
    competencyNames: ["Agentic AI", "Executive Demo Storytelling"],
  },
];
