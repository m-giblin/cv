export type MarketPulseQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: "agentic" | "genai" | "competitive" | "sailpoint";
};

export const MARKET_PULSE_WEEKLY: MarketPulseQuestion[] = [
  {
    id: "q1",
    topic: "agentic",
    question: "What is the primary difference between GenAI and Agentic AI in a customer conversation?",
    options: [
      "GenAI uses larger models",
      "Agentic AI takes governed actions across systems; GenAI primarily generates content",
      "GenAI is only for marketing",
      "There is no difference",
    ],
    correctIndex: 1,
    explanation:
      "Agentic systems execute workflows with tool/API access — each agent is an identity risk. GenAI assists with content without necessarily acting.",
  },
  {
    id: "q2",
    topic: "sailpoint",
    question: "SailPoint Agentic Fabric is best described as:",
    options: [
      "A new LLM chatbot for admins",
      "Identity-centric capabilities to discover, govern, and protect AI agents",
      "A replacement for IdentityIQ",
      "A SIEM product",
    ],
    correctIndex: 1,
    explanation:
      "Agentic Fabric extends ISC to non-human/agent identities with discover-govern-protect lifecycle.",
  },
  {
    id: "q3",
    topic: "competitive",
    question: "Mindtickle's Readiness Index primarily measures:",
    options: [
      "Content download counts",
      "Rep skill readiness across product knowledge, certifications, and call quality",
      "CRM pipeline velocity",
      "IT ticket volume",
    ],
    correctIndex: 1,
    explanation:
      "Mindtickle leads on sales readiness scoring — our platform now surfaces a Team Readiness Index for managers.",
  },
  {
    id: "q4",
    topic: "agentic",
    question: "Zero Standing Privilege (ZSP) means:",
    options: [
      "Users have no passwords",
      "Powerful permissions exist only just-in-time, not 24/7",
      "All agents are blocked by default forever",
      "Only admins can use AI",
    ],
    correctIndex: 1,
    explanation:
      "ZSP is SailPoint's advanced model: agents get privileges only for the brief moments they need them.",
  },
  {
    id: "q5",
    topic: "genai",
    question: "A customer says 'Entra handles our AI agents.' Your best response:",
    options: [
      "Entra is wrong for AI",
      "Directory identity ≠ agent governance — ISC+AIS covers ownership, certification, and data access for agents",
      "Agree and end the call",
      "Offer a discount",
    ],
    correctIndex: 1,
    explanation:
      "Position ISC + AIS as the governance layer Entra doesn't provide for agent lifecycle and access risk.",
  },
];
