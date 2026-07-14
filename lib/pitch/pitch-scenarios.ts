export const PITCH_SCENARIOS = [
  {
    id: "elevator",
    shortLabel: "Elevator pitch",
    label: "Elevator pitch (60s)",
    promptLabel: "Elevator pitch · CIO persona",
    prompt:
      "You have 60 seconds in an elevator with a CISO who just flagged 340 orphaned accounts in an audit. What do you say?",
    description: "Hook → outcome → SailPoint differentiation → next step",
    competencies: ["Executive Demo Storytelling"],
  },
  {
    id: "ais",
    shortLabel: "CISO discovery open",
    label: "AIS / Agentic positioning",
    promptLabel: "AIS positioning · CISO persona",
    prompt: "Open with a discovery question about non-human identities and agent blast radius — no product tour.",
    description: "Agent identity lifecycle — discover, govern, protect",
    competencies: ["Agentic AI"],
  },
  {
    id: "competitive",
    shortLabel: "Competitive trap",
    label: "Competitive trap defusal",
    promptLabel: "Competitive defusal",
    prompt: "The prospect says Saviynt already covers access reviews. Reframe without trash-talking.",
    description: "Acknowledge competitor, reframe to governance gap, proof point",
    competencies: ["Competitive Positioning", "Objection Handling"],
  },
  {
    id: "executive",
    shortLabel: "Executive demo close",
    label: "Executive business case",
    promptLabel: "Executive business case",
    prompt: "Close a 15-minute exec readout — risk, audit, and board outcomes only.",
    description: "Risk, audit, and board-level outcomes — no feature tour",
    competencies: ["Executive Demo Storytelling", "Discovery"],
  },
  {
    id: "mcp",
    shortLabel: "MCP governance",
    label: "MCP governance story",
    promptLabel: "MCP governance story",
    prompt: "Explain how third-party agents call ISC APIs with policy, audit, and least privilege.",
    description: "Third-party agents calling ISC APIs with policy and audit",
    competencies: ["Agentic AI", "Governance"],
  },
] as const;

export type PitchScenarioId = (typeof PITCH_SCENARIOS)[number]["id"];
