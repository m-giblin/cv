export type LearnModule = {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  topics: string[];
  challengeIds?: string[];
  href: string;
};

export const GENAI_VS_AGENTIC_MODULES: LearnModule[] = [
  {
    id: "genai-basics",
    title: "Generative AI (GenAI)",
    emoji: "✨",
    summary:
      "LLMs that produce text, summaries, and answers from prompts. Great for drafts, Q&A, and coaching — but no persistent identity, no governed actions, and no audit trail by default.",
    topics: [
      "Prompt → response pattern (ChatGPT, Copilot, ISC AI Services)",
      "Risks: hallucination, data leakage, shadow AI tools",
      "SE talk track: GenAI assists humans; it is not an identity",
    ],
    href: "/challenges",
  },
  {
    id: "agentic-ai",
    title: "Agentic AI",
    emoji: "🤖",
    summary:
      "AI systems that take actions across tools with goals, memory, and API access. Each agent is a non-human identity that needs discovery, ownership, least privilege, and lifecycle governance.",
    topics: [
      "Agents act — they don't just answer",
      "SailPoint Agentic Fabric: Discover → Govern → Protect",
      "AIS registers agents from AWS, Azure, GCP, Salesforce, Copilot Studio",
      "Zero Standing Privilege (ZSP) for high-risk agent permissions",
    ],
    href: "/simulations",
  },
  {
    id: "ais-positioning",
    title: "Agent Identity Security (AIS)",
    emoji: "🛡️",
    summary:
      "Purpose-built governance for AI agents as first-class identities in Identity Security Cloud — aggregation, ownership, certification, and over-permission reporting via Data Access Security.",
    topics: [
      "Human vs non-human vs agent identity",
      "MCP Server: governed bridge for third-party agents calling SailPoint APIs",
      "CISO pain: shadow AI, NHI sprawl, audit gaps",
    ],
    challengeIds: [
      "e5000001-0005-4000-8000-000000000001",
      "e5000001-0005-4000-8000-000000000003",
      "e5000001-0005-4000-8000-000000000006",
    ],
    href: "/challenges",
  },
  {
    id: "customer-discovery",
    title: "Discovery questions that win",
    emoji: "🎯",
    summary:
      "Move customers from 'we bought Copilot' to 'who owns agent access, how do we certify it, and what happens when the owner leaves?'",
    topics: [
      "How many AI agents touch production data today?",
      "Who is the human owner when an agent provisions access?",
      "What audit evidence exists for agent actions last quarter?",
    ],
    href: "/market-pulse",
  },
];

export const AGENTIC_CHALLENGE_TAGS = ["Agentic AI", "AIS", "Agentic Fabric", "GenAI vs Agentic"];
