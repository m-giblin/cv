export type FlightCheckQuestionType = "knowledge" | "scenario" | "talk_track";

export type FlightCheckQuestion = {
  id: string;
  competency: string;
  type: FlightCheckQuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  rubricHint: string;
  idealAnswerKeywords?: string[];
};

export const FLIGHT_CHECK_BANK: FlightCheckQuestion[] = [
  {
    id: "disc-1",
    competency: "Discovery",
    type: "knowledge",
    difficulty: 1,
    prompt: "What should an SE establish before demoing ISC workflows?",
    options: [
      "Admin console navigation",
      "Business pain, stakeholders, and success criteria",
      "License SKU count",
      "Competitor pricing",
    ],
    correctIndex: 1,
    rubricHint: "Discovery before demo — always.",
  },
  {
    id: "disc-2",
    competency: "Discovery",
    type: "scenario",
    difficulty: 2,
    prompt: "A CISO says 'we already have Entra.' Your best next move?",
    options: [
      "Pivot to a full ISC demo immediately",
      "Acknowledge Entra, ask what agents and non-human identities they cannot govern today",
      "Send a competitive battlecard",
      "Escalate to sales",
    ],
    correctIndex: 1,
    rubricHint: "Reframe to governance gap without dismissing their stack.",
  },
  {
    id: "obj-1",
    competency: "Objection Handling",
    type: "talk_track",
    difficulty: 2,
    prompt: "In one sentence, handle: 'SailPoint is too complex for our timeline.'",
    rubricHint: "Acknowledge + phased value + mutual next step.",
    idealAnswerKeywords: ["phase", "quick win", "timeline", "pilot", "workshop"],
  },
  {
    id: "exec-1",
    competency: "Executive Demo Storytelling",
    type: "knowledge",
    difficulty: 2,
    prompt: "Executive demos should lead with:",
    options: ["Feature tour", "Business outcome and risk reduction", "Technical architecture", "Pricing"],
    correctIndex: 1,
    rubricHint: "Outcome-first for exec audiences.",
  },
  {
    id: "isc-1",
    competency: "ISC Workflows",
    type: "scenario",
    difficulty: 2,
    prompt: "Customer wants joiner automation. Which ISC artifact do you anchor on first?",
    options: ["Search query", "Lifecycle workflow with trigger + provision steps", "Certification campaign only", "SSO portal"],
    correctIndex: 1,
    rubricHint: "Workflow trigger → provision is the joiner story.",
  },
  {
    id: "agentic-1",
    competency: "Agentic AI",
    type: "knowledge",
    difficulty: 1,
    prompt: "Agentic AI differs from GenAI because agents:",
    options: [
      "Use larger models",
      "Take governed actions across systems with persistent identity",
      "Only generate text",
      "Replace IAM entirely",
    ],
    correctIndex: 1,
    rubricHint: "Governed actions + agent identity risk.",
  },
  {
    id: "agentic-2",
    competency: "Agentic AI",
    type: "talk_track",
    difficulty: 3,
    prompt: "One sentence: why does Copilot policy not replace SailPoint for agents?",
    rubricHint: "Directory/policy ≠ lifecycle governance across agents.",
    idealAnswerKeywords: ["identity", "lifecycle", "govern", "agent", "audit", "ownership"],
  },
  {
    id: "gov-1",
    competency: "Governance",
    type: "knowledge",
    difficulty: 2,
    prompt: "Zero Standing Privilege (ZSP) means:",
    options: [
      "No passwords",
      "Elevated access exists only just-in-time, not 24/7",
      "All agents blocked forever",
      "Only MFA required",
    ],
    correctIndex: 1,
    rubricHint: "JIT privilege — core 2026 messaging.",
  },
  {
    id: "comp-1",
    competency: "Competitive Positioning",
    type: "scenario",
    difficulty: 3,
    prompt: "Competitor claims 'directory-only is enough for AI.' Best trap-setting question?",
    options: [
      "What's your discount?",
      "Who owns agent identity when it provisions across 12 SaaS APIs without a human?",
      "Do you use Entra?",
      "When is your renewal?",
    ],
    correctIndex: 1,
    rubricHint: "Force them to admit agent sprawl gap.",
  },
];
