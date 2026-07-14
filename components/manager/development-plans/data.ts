import type { ContentBrief, Milestone, QuarterSummary, SEDevProfile } from "./types";
import { buildGoalCard } from "./utils/goalBuilder";

function ms(label: string, date: string, done: boolean, isCalendar = true): Milestone {
  return { label, date, done, isCalendar };
}

function q(label: string, summary: string, state: QuarterSummary["state"]): QuarterSummary {
  return { label, summary, state, needsAction: state === "action" };
}

export type MockSEProfile = SEDevProfile & {
  approvedGoals: SEDevProfile["goals"];
  approvedQuarters: QuarterSummary[];
  pendingQuarters: QuarterSummary[];
  approvedGoalCount: string;
  pendingGoalCount: string;
};

export const mockSEProfiles: MockSEProfile[] = [
  {
    id: "DS",
    name: "Demo SE",
    email: "demo.se@sailpoint.io",
    initials: "DS",
    level: "Basic SE",
    role: "SE",
    day: 22,
    avatarBg: "linear-gradient(135deg,#5a2d82,#9b44c8)",
    status: "NO PLAN",
    goalCount: "AI generating plan…",
    goals: [],
    hasAiSuggestion: true,
    aiLabel: "3 AI GOALS READY",
    pendingGoalCount: "AI generating plan…",
    approvedGoalCount: "3 active goals · Q2–Q4",
    aiReasoning:
      "Day 22 · Sim avg 55 (↓23 pts, 5 sessions) · Gate 1 blocked 13 days · Discovery 45/100 · Competitive 38/100 · 0 of 8 certs · 0 coaching sessions · Ramp 12% (expected 35%). AI reviewed 14 data points across completed sims, coaching records, cert status, and gate progress. Plan prioritizes stabilization (Q2), skill recovery (Q3), and advancement readiness (Q4).",
    suggestedGoals: [
      {
        icon: "🛠️",
        title: "Gate 1 Recovery Plan",
        quarter: "Q2 2026",
        effort: "3 weeks",
        tag: "URGENT",
        rationale:
          "Sign off is blocked. Before adding new goals, Gate 1 must clear. Plan: daily 30-min sim practice, weekly manager 1:1, gate review by Jul 31.",
        chips: ["Gate 1 sign-off", "Daily sim practice", "2× weekly 1:1"],
        isNew: false,
      },
      {
        icon: "🎯",
        title: "Discovery Fundamentals: Enterprise Depth",
        quarter: "Q3 2026",
        effort: "6 weeks",
        tag: "AI CHALLENGE",
        rationale:
          "Score of 45 in Discovery — the lowest on the team. No multi-stakeholder scenarios attempted. AI will draft a 3-scenario discovery series if approved.",
        chips: ["Multi-stakeholder", "IT + Security", "Score target: 72+"],
        isNew: true,
      },
      {
        icon: "🏆",
        title: "Core SE Certification Completion",
        quarter: "Q3 2026",
        effort: "8 weeks",
        tag: "CERT GAP",
        rationale:
          "0 of 8 certs completed. Recommend: Identity Security Fundamentals + SailPoint IIQ Core as Q3 targets. Both map directly to current ramp content.",
        chips: ["2 certs Q3", "Calendar milestones", "Linked to ramp plan"],
        isNew: false,
      },
    ],
    signals: [
      { icon: "📉", label: "Sim trend", value: "78→55 (-23 pts)", color: "#B83128", detail: "5 consecutive declining sessions — worst trajectory on the team" },
      { icon: "🚧", label: "Gate status", value: "Gate 1 blocked 13 days", color: "#B83128", detail: "Cannot advance to Phase 2 until manager signs off" },
      { icon: "🗓️", label: "Coaching history", value: "Zero 1:1s", color: "#B83128", detail: "Day 22 with no coaching touchpoints recorded" },
      { icon: "🎯", label: "Discovery score", value: "45 / 100", color: "#D4810A", detail: "Lowest on team — no multi-stakeholder scenarios attempted" },
      { icon: "🏆", label: "Certifications", value: "0 of 8", color: "#D4810A", detail: "No certs started — peers average 2.3 by Day 22" },
      { icon: "📋", label: "Ramp progress", value: "12%", color: "#B83128", detail: "Significantly behind pace for Day 22 (expected: 35%)" },
    ],
    pendingQuarters: [
      q("Q1", "Plan not started", "upcoming"),
      q("Q2", "Plan not started", "upcoming"),
      q("Q3", "Plan not started", "upcoming"),
      q("Q4", "Plan not started", "upcoming"),
    ],
    approvedQuarters: [
      q("Q1", "Plan not started", "upcoming"),
      q("Q2", "Gate 1 recovery — 5%", "action"),
      q("Q3", "Discovery + 2 certs", "upcoming"),
      q("Q4", "Readiness review", "upcoming"),
    ],
    quarters: [
      q("Q1", "Plan not started", "upcoming"),
      q("Q2", "Plan not started", "upcoming"),
      q("Q3", "Plan not started", "upcoming"),
      q("Q4", "Plan not started", "upcoming"),
    ],
    approvedGoals: [
      buildGoalCard({
        icon: "🛠️",
        title: "Gate 1 Recovery Plan",
        quarter: "Q2 2026",
        source: "AI · Urgent blocker",
        progress: 5,
        dueDate: "Jul 31",
        overdue: true,
        milestones: [
          ms("Daily 30-min sim practice ×5", "Jul 18", false),
          ms("Weekly manager 1:1", "Jul 21", false),
          ms("Gate 1 sign-off meeting", "Jul 31", false),
        ],
        tagOverride: "AT RISK",
      }),
      buildGoalCard({
        icon: "🎯",
        title: "Discovery Fundamentals: Enterprise Depth",
        quarter: "Q3 2026",
        source: "AI · Score 45",
        progress: 0,
        dueDate: "Sep 15",
        milestones: [
          ms("Multi-stakeholder sim ×3", "Aug 10", false),
          ms("Healthcare discovery scenario", "Aug 25", false),
          ms("Score ≥72 on rubric", "Sep 10", false),
        ],
        isNewContent: true,
        newContentNote:
          'No multi-stakeholder sim exists. AI drafted: "Healthcare IT + CISO + HR discovery." Submit to content team?',
        tagOverride: "AI CHALLENGE",
      }),
      buildGoalCard({
        icon: "🏆",
        title: "Core SE Certification: IIQ + Identity Security",
        quarter: "Q3 2026",
        source: "AI · 0 of 8 certs",
        progress: 0,
        dueDate: "Sep 30",
        milestones: [
          ms("Identity Security Fundamentals cert", "Aug 15", false),
          ms("SailPoint IIQ Core cert", "Sep 5", false),
          ms("Manager sign-off", "Sep 30", false),
        ],
        tagOverride: "NOT STARTED",
      }),
    ],
    calendarItems: [
      "Daily sim practice (M–F)",
      "Weekly 1:1 coaching",
      "Gate 1 review Jul 31",
      "Multi-stakeholder sim ×3",
      "IIQ Core cert exam Sep 5",
    ],
  },
  {
    id: "FG",
    name: "Finn Grant",
    email: "finn.grant@sailpoint.io",
    initials: "FG",
    level: "Basic SE",
    role: "SE",
    day: 38,
    avatarBg: "linear-gradient(135deg,#1a5c8a,#0071CE)",
    status: "AI PLAN READY",
    goalCount: "AI-suggested · Pending approval",
    goals: [],
    hasAiSuggestion: true,
    aiLabel: "2 NEW CHALLENGES",
    pendingGoalCount: "AI-suggested · Pending approval",
    approvedGoalCount: "2 active goals · Q2–Q3",
    aiReasoning:
      "Day 38 · Sim avg 49 (↓16 pts) · 4 overdue items · Technical Depth 61/100 · Demo Execution 79/100 (strong) · 1 of 8 certs · Ramp 44% (on pace). AI reviewed 11 data points. Strong demo foundation but technical depth is the ceiling — two challenge goals address the gap and set up specialist track in Q3.",
    suggestedGoals: [
      {
        icon: "🔬",
        title: "Technical Depth: IGA Architecture Series",
        quarter: "Q2–Q3 2026",
        effort: "5 weeks",
        tag: "SKILL GAP",
        rationale:
          "Technical Depth score is 61. Finn has not attempted any architecture-level scenarios. Recommend the IGA connector + attribute mapping sim series.",
        chips: ["IGA architecture", "Connector sims ×3", "Score target: 75+"],
        isNew: false,
      },
      {
        icon: "⚡",
        title: "SE Challenge: Solo POC in 2 weeks",
        quarter: "Q3 2026",
        effort: "2 weeks",
        tag: "AI CHALLENGE",
        rationale:
          'No existing solo POC challenge scenario exists for Basic SEs. AI drafted: "Customer-facing POC with compressed timeline — SE owns scoping, delivery, and debrief." Needs content team approval.',
        chips: ["Solo POC", "Customer-facing", "2-week sprint"],
        isNew: true,
      },
    ],
    signals: [
      { icon: "⚠️", label: "Overdue items", value: "4 items overdue", color: "#D4810A", detail: "Includes 2 sim submissions and 1 cert milestone" },
      { icon: "🔬", label: "Technical depth", value: "61 / 100", color: "#D4810A", detail: "No architecture-level scenarios attempted — biggest gap at Day 38" },
      { icon: "✅", label: "Demo Execution", value: "79 / 100", color: "#0A6E45", detail: "Strongest competency — solid foundation for specialist track" },
      { icon: "🏆", label: "Certifications", value: "1 of 8", color: "#D4810A", detail: "Identity Security Fundamentals complete — 7 remaining" },
      { icon: "📋", label: "Ramp progress", value: "44%", color: "#0071CE", detail: "On pace for Day 38 — technical depth is the only blocker to advancement" },
      { icon: "📈", label: "Sim trend", value: "65→49 (-16 pts)", color: "#B83128", detail: "Declining trend correlates with harder technical scenarios" },
    ],
    pendingQuarters: [
      q("Q1", "Sim fundamentals", "done"),
      q("Q2", "Technical depth track", "current"),
      q("Q3", "Specialist cert path", "upcoming"),
      q("Q4", "Advisory readiness", "upcoming"),
    ],
    approvedQuarters: [
      q("Q1", "Sim fundamentals", "done"),
      q("Q2", "Technical depth — 10%", "current"),
      q("Q3", "Solo POC challenge", "upcoming"),
      q("Q4", "Advisory readiness", "upcoming"),
    ],
    quarters: [
      q("Q1", "Sim fundamentals", "done"),
      q("Q2", "Technical depth track", "current"),
      q("Q3", "Specialist cert path", "upcoming"),
      q("Q4", "Advisory readiness", "upcoming"),
    ],
    approvedGoals: [
      buildGoalCard({
        icon: "🔬",
        title: "Technical Depth: IGA Architecture Series",
        quarter: "Q2–Q3 2026",
        source: "AI · Score 61",
        progress: 10,
        dueDate: "Aug 30",
        milestones: [
          ms("IGA connector deep-dive module", "Jul 22", false),
          ms("Attribute mapping sim ×3", "Aug 5", false),
          ms("Score ≥75 on technical rubric", "Aug 25", false),
        ],
        tagOverride: "IN PROGRESS",
      }),
      buildGoalCard({
        icon: "⚡",
        title: "SE Challenge: Solo POC in 2 weeks",
        quarter: "Q3 2026",
        source: "AI · Growth stretch",
        progress: 0,
        dueDate: "Sep 20",
        milestones: [
          ms("POC scoping call sim", "Aug 15", false),
          ms("Environment setup solo", "Aug 22", false),
          ms("Executive readout delivery", "Sep 15", false),
        ],
        isNewContent: true,
        newContentNote:
          'No solo POC challenge exists for Basic SEs. AI drafted: "Customer-facing POC with compressed timeline." Submit to content team?',
        tagOverride: "AI CHALLENGE",
      }),
    ],
    calendarItems: [
      "IGA connector module Jul 22",
      "Attribute mapping sims ×3",
      "Technical rubric eval Aug 25",
      "POC scoping sim Aug 15",
    ],
  },
  {
    id: "GH",
    name: "Gray Hayes",
    email: "gray.hayes@sailpoint.io",
    initials: "GH",
    level: "Senior SE",
    role: "SE",
    day: 45,
    avatarBg: "linear-gradient(135deg,#0D6B4F,#0A6E45)",
    status: "ACTIVE",
    goalCount: "2 active goals · Q2–Q3",
    goals: [],
    hasAiSuggestion: false,
    aiLabel: "",
    pendingGoalCount: "2 active goals · Q2–Q3",
    approvedGoalCount: "2 active goals · Q2–Q3",
    suggestedGoals: [],
    aiReasoning: "",
    signals: [
      { icon: "📈", label: "Sim trend", value: "72→82 (+10 pts)", color: "#0A6E45", detail: "Consistent improvement across 5 sessions — best trajectory on team" },
      { icon: "🎯", label: "Competitive score", value: "52 / 100 — GAP", color: "#D4810A", detail: "Only competency below 65 — directly linked to Q2 goal" },
      { icon: "✅", label: "Technical Depth", value: "82 / 100", color: "#0A6E45", detail: "Team high — ready for specialist scenarios" },
      { icon: "🏆", label: "SLED cert", value: "62% progress", color: "#0071CE", detail: "On track for Sep 30 completion — 2 of 4 milestones done" },
      { icon: "🗓️", label: "Last 1:1", value: "Jul 5 (8 days)", color: "#0071CE", detail: "Coaching cadence healthy — next session due Jul 21" },
      { icon: "📋", label: "Ramp progress", value: "62%", color: "#0071CE", detail: "Ahead of expected pace for Day 45" },
    ],
    pendingQuarters: [
      q("Q1", "2 goals completed", "done"),
      q("Q2", "Competitive gap — 30%", "action"),
      q("Q3", "SLED cert — 62%", "current"),
      q("Q4", "Advisory track planned", "upcoming"),
    ],
    approvedQuarters: [
      q("Q1", "2 goals completed", "done"),
      q("Q2", "Competitive gap — 30%", "action"),
      q("Q3", "SLED cert — 62%", "current"),
      q("Q4", "Advisory track planned", "upcoming"),
    ],
    quarters: [
      q("Q1", "2 goals completed", "done"),
      q("Q2", "Competitive gap — 30%", "action"),
      q("Q3", "SLED cert — 62%", "current"),
      q("Q4", "Advisory track planned", "upcoming"),
    ],
    approvedGoals: [
      buildGoalCard({
        icon: "🏆",
        title: "SLED Specialization Certification",
        quarter: "Q3 2026",
        source: "AI · Cert gap",
        progress: 62,
        dueDate: "Sep 30",
        milestones: [
          ms("Complete SLED industry module", "Jul 18", true),
          ms("Pass SLED practice sim ×3", "Jul 25", false),
          ms("Submit cert application", "Aug 8", false),
          ms("Cert exam", "Sep 5", false),
        ],
        tagOverride: "ON TRACK",
      }),
      buildGoalCard({
        icon: "🎯",
        title: "Competitive Positioning: Saviynt & SailPoint vs. Field",
        quarter: "Q2 2026",
        source: "Coaching gap · Score 52",
        progress: 30,
        dueDate: "Aug 15",
        milestones: [
          ms("Watch competitive battlecard sessions", "Jul 20", false),
          ms("Complete bakeoff sim scenario", "Jul 28", false),
          ms("Score ≥75 on competitive sim", "Aug 10", false),
        ],
        isNewContent: true,
        newContentNote:
          'No multi-vendor bakeoff sim exists. AI drafted a scenario: "SailPoint vs. Saviynt: IGA in a hybrid cloud — IT + Security stakeholders." Submit to content team?',
        tagOverride: "AI CHALLENGE",
      }),
    ],
    calendarItems: [
      "SLED practice sim ×3 (Jul 25)",
      "Cert application Aug 8",
      "Cert exam Sep 5",
      "Competitive battlecard sessions Jul 20",
      "Bakeoff sim Jul 28",
    ],
  },
  {
    id: "HI",
    name: "Harper Ivan",
    email: "harper.ivan@sailpoint.io",
    initials: "HI",
    level: "Senior SE",
    role: "SE",
    day: 78,
    avatarBg: "linear-gradient(135deg,#6B2D82,#9B59B6)",
    status: "ACTIVE",
    goalCount: "3 active goals · Q2–Q4",
    goals: [],
    hasAiSuggestion: true,
    aiLabel: "ADVISORY TRACK READY",
    pendingGoalCount: "3 active goals · Q2–Q4",
    approvedGoalCount: "3 active goals · Q2–Q4",
    suggestedGoals: [],
    aiReasoning: "",
    signals: [
      { icon: "🚀", label: "Sim avg", value: "91 / 100 — Team high", color: "#0A6E45", detail: "Top performer across all 5 competencies — ready for Advisory track" },
      { icon: "📊", label: "Pipeline exposure", value: "1 shadow only", color: "#D4810A", detail: "Has not led technical discovery independently — Q3 goal addresses this" },
      { icon: "✅", label: "Certifications", value: "5 of 8", color: "#0A6E45", detail: "Fastest certification completion on team — 3 remaining for Q4" },
      { icon: "🗓️", label: "Advisory readiness", value: "45% complete", color: "#0071CE", detail: "Advisory discovery framework done — executive calls next" },
      { icon: "📋", label: "Ramp progress", value: "94%", color: "#0A6E45", detail: "Near completion — effectively in post-ramp growth phase" },
      { icon: "🎯", label: "Career goal", value: "Advisory SE by Q4", color: "#6B2D82", detail: "AI projects readiness by Dec 2026 if current pace continues" },
    ],
    pendingQuarters: [
      q("Q1", "3 goals completed", "done"),
      q("Q2", "Pipeline ownership — 20%", "action"),
      q("Q3", "Advisory program — 45%", "current"),
      q("Q4", "Advisory SE sign-off", "upcoming"),
    ],
    approvedQuarters: [
      q("Q1", "3 goals completed", "done"),
      q("Q2", "Pipeline ownership — 20%", "action"),
      q("Q3", "Advisory program — 45%", "current"),
      q("Q4", "Advisory SE sign-off", "upcoming"),
    ],
    quarters: [
      q("Q1", "3 goals completed", "done"),
      q("Q2", "Pipeline ownership — 20%", "action"),
      q("Q3", "Advisory program — 45%", "current"),
      q("Q4", "Advisory SE sign-off", "upcoming"),
    ],
    approvedGoals: [
      buildGoalCard({
        icon: "🚀",
        title: "Advisory SE Readiness Program",
        quarter: "Q4 2026",
        source: "AI · Role progression",
        progress: 45,
        dueDate: "Dec 15",
        milestones: [
          ms("Complete Advisory discovery framework", "Aug 1", true),
          ms("Lead 2 executive discovery calls", "Sep 15", false),
          ms("Present at internal QBR", "Oct 30", false),
          ms("Manager sign-off: Advisory readiness", "Dec 1", false),
        ],
        tagOverride: "IN PROGRESS",
      }),
      buildGoalCard({
        icon: "📊",
        title: "Pipeline ownership: 2 strategic accounts",
        quarter: "Q3 2026",
        source: "AI · Growth challenge",
        progress: 20,
        dueDate: "Sep 30",
        milestones: [
          ms("Shadow AE on Accenture opportunity", "Jul 22", true),
          ms("Lead technical discovery: FinServ account", "Aug 5", false),
          ms("Deliver POC solo", "Aug 30", false),
        ],
        isNewContent: true,
        newContentNote:
          'No solo pipeline ownership sim exists for SEs. AI drafted: "SE as deal driver: technical champion in a 6-month enterprise cycle." Flag to content team?',
        tagOverride: "AI CHALLENGE",
      }),
    ],
    calendarItems: [
      "Executive discovery calls ×2 (Sep 15)",
      "Internal QBR presentation Oct 30",
      "POC delivery solo Aug 30",
      "Advisory sign-off Dec 1",
    ],
  },
];

export const mockProfilesById = Object.fromEntries(mockSEProfiles.map((se) => [se.id, se]));

export function getContentBriefForGoal(title: string, seName: string): ContentBrief {
  if (title.includes("Discovery")) {
    return {
      scenarioTitle: title,
      context:
        "A mid-market healthcare company (2,800 employees) is evaluating IGA vendors. The evaluation team includes the CISO, IT Director, and HR VP — three distinct stakeholders with competing priorities. The SE must run a structured discovery call surfacing all three agendas without losing control of the conversation.",
      successCriteria: [
        "SE identifies all stakeholder priorities within 12 minutes",
        "SE pivots pitch based on mid-call objection",
        "Score ≥72 on rubric across 5 competency dimensions",
        "Manager debrief completed within 48 hours",
      ],
      difficulty: "Advanced",
      estimatedTime: "45 min",
      competencies: ["Discovery", "Multi-stakeholder", "Active listening"],
      roleTarget: "SE",
      suggestedReviewer: "Content team · SE Practice lead",
    };
  }
  if (title.includes("bakeoff") || title.includes("Competitive")) {
    return {
      scenarioTitle: title,
      context:
        "A Fortune 500 financial services firm has shortlisted SailPoint and Saviynt for a hybrid cloud IGA deployment. The SE is presenting to a joint IT + Security panel who has already seen the Saviynt demo. The task: counter three specific Saviynt claims with live product proof points.",
      successCriteria: [
        "SE addresses Saviynt UI advantage claim with live counter-demo",
        "SE quantifies SailPoint's connector ecosystem advantage",
        'SE handles "SailPoint is more expensive" with TCO data',
        "Score ≥75 on competitive rubric",
      ],
      difficulty: "Advanced",
      estimatedTime: "40 min",
      competencies: ["Competitive positioning", "Demo execution", "Objection handling"],
      roleTarget: "SE",
      suggestedReviewer: "Content team · Competitive lead",
    };
  }
  return {
    scenarioTitle: title,
    context:
      "A strategic enterprise account (8,000 seats) needs a proof of concept delivered in 10 business days. The SE owns scoping, environment setup, scenario design, and the executive readout — no AE support during the technical phase.",
    successCriteria: [
      "SE scopes POC requirements in a 30-min discovery call",
      "SE sets up environment independently within 3 days",
      "Executive readout scores ≥80 on communication rubric",
      "Deal progresses to next stage in scenario",
    ],
    difficulty: "Expert",
    estimatedTime: "Multi-day",
    competencies: ["Technical depth", "Project management", "Executive communication"],
    roleTarget: "SE",
    suggestedReviewer: "Content team · SE Practice lead",
  };
}

export function seNameForBrief(title: string): string {
  if (title.includes("Discovery")) return "Demo SE";
  if (title.includes("bakeoff") || title.includes("Competitive")) return "Gray Hayes";
  return "Harper Ivan";
}
