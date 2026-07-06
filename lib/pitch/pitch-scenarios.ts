export const PITCH_SCENARIOS = [
  {
    id: "elevator",
    label: "Elevator pitch (60s)",
    description: "Hook → outcome → SailPoint differentiation → next step",
    competencies: ["Executive Demo Storytelling"],
  },
  {
    id: "ais",
    label: "AIS / Agentic positioning",
    description: "Agent identity lifecycle — discover, govern, protect",
    competencies: ["Agentic AI"],
  },
  {
    id: "competitive",
    label: "Competitive trap defusal",
    description: "Acknowledge competitor, reframe to governance gap, proof point",
    competencies: ["Competitive Positioning", "Objection Handling"],
  },
  {
    id: "executive",
    label: "Executive business case",
    description: "Risk, audit, and board-level outcomes — no feature tour",
    competencies: ["Executive Demo Storytelling", "Discovery"],
  },
  {
    id: "mcp",
    label: "MCP governance story",
    description: "Third-party agents calling ISC APIs with policy and audit",
    competencies: ["Agentic AI", "Governance"],
  },
] as const;

export type PitchScenarioId = (typeof PITCH_SCENARIOS)[number]["id"];
