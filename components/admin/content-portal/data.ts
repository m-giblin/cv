import type { ContentTask, TimelineStep, Writer } from "./types";

function tl(label: string, date: string, done: boolean): TimelineStep {
  return { label, date, done };
}

export const mockContentTasks: ContentTask[] = [
  {
    id: "ai-1",
    isAI: true,
    title: "SE Multi-Stakeholder Discovery: Healthcare IT + CISO + HR",
    meta: "From Dev Plans · Demo SE · Discovery score 45",
    type: "Simulation",
    priority: "High",
    requestedBy: "Demo Manager",
    forSE: "Demo SE",
    status: "NEW",
    due: "Jul 25",
    aiNote:
      "AI detected a Discovery gap (score 45) for Demo SE with no multi-stakeholder scenario in the library. Task auto-created from the manager's content request in Development Plans. All fields were pre-filled by AI — review before assigning.",
    context:
      "A mid-market healthcare company (2,800 employees) is evaluating IGA vendors. The team includes the CISO, IT Director, and HR VP — three stakeholders with competing priorities. The SE must run a structured discovery call surfacing all three agendas without losing control.",
    criteria: [
      "SE identifies all stakeholder priorities within 12 minutes",
      "SE pivots pitch based on mid-call CISO objection",
      "Score ≥72 across 5 competency dimensions",
      "Manager debrief completed within 48 hours",
    ],
    competencies: ["Discovery", "Multi-stakeholder", "Active listening", "Healthcare"],
    estTime: "45 min",
    difficulty: "Advanced",
    roleTarget: "Basic SE",
    timeline: [
      tl("AI task created + auto-filled", "Jul 14", true),
      tl("Assign to writer", "Jul 15", false),
      tl("Draft scenario + rubric", "Jul 18", false),
      tl("Manager review", "Jul 21", false),
      tl("Publish to library", "Jul 25", false),
      tl("Auto-assign to Demo SE", "Jul 25", false),
    ],
    activity: [
      { initials: "AI", avatarBg: "#CC27B0", note: "Task auto-created from Demo Manager's content request in Development Plans.", time: "Just now" },
      { initials: "AI", avatarBg: "#CC27B0", note: "Pre-filled scenario context, criteria, and competency tags from gap analysis.", time: "Just now" },
    ],
  },
  {
    id: "ai-2",
    isAI: true,
    title: "SailPoint vs. Saviynt Competitive Bakeoff: IGA Hybrid Cloud",
    meta: "From Dev Plans · Gray Hayes · Competitive score 52",
    type: "Simulation",
    priority: "High",
    requestedBy: "Demo Manager",
    forSE: "Gray Hayes",
    status: "NEW",
    due: "Jul 28",
    aiNote:
      "AI detected a Competitive Positioning gap (score 52) for Gray Hayes. No bakeoff scenario exists in the library. AI sourced competitive context from the product knowledge base — Saviynt differentiation points and known objections.",
    context:
      "A Fortune 500 financial services firm has shortlisted SailPoint and Saviynt for a hybrid cloud IGA deployment. The SE presents to a joint IT + Security panel who already saw the Saviynt demo. Task: counter three specific Saviynt claims with live product proof points.",
    criteria: [
      "SE addresses Saviynt UI advantage claim with live counter-demo",
      "SE quantifies SailPoint's connector ecosystem advantage",
      'SE handles "SailPoint is more expensive" with TCO data',
      "Score ≥75 on competitive rubric",
    ],
    competencies: ["Competitive positioning", "Demo execution", "Objection handling", "FinServ"],
    estTime: "40 min",
    difficulty: "Advanced",
    roleTarget: "Senior SE",
    timeline: [
      tl("AI task created", "Jul 14", true),
      tl("Assign to competitive content owner", "Jul 15", false),
      tl("Draft scenario + rubric", "Jul 20", false),
      tl("Review with Sales Enablement", "Jul 24", false),
      tl("Publish + notify manager", "Jul 28", false),
    ],
    activity: [
      { initials: "AI", avatarBg: "#CC27B0", note: "Auto-created from Demo Manager's request for Gray Hayes development plan.", time: "Just now" },
      { initials: "AI", avatarBg: "#CC27B0", note: "Competitive context sourced from product knowledge base.", time: "Just now" },
    ],
  },
  {
    id: "ai-3",
    isAI: true,
    title: "SE as Deal Driver: Solo Pipeline Ownership — Enterprise Cycle",
    meta: "From Dev Plans · Harper Ivan · Advisory track",
    type: "Challenge",
    priority: "Medium",
    requestedBy: "Demo Manager",
    forSE: "Harper Ivan",
    status: "NEW",
    due: "Aug 5",
    aiNote:
      "Harper Ivan is on an Advisory SE growth track. No solo pipeline ownership challenge exists for Senior SEs. AI created this stretch goal scenario where the SE acts as deal driver without AE support.",
    context:
      "A strategic enterprise account (8,000 seats) needs a POC delivered in 10 business days. The SE owns scoping, environment setup, scenario design, and the executive readout — no AE support during the technical phase.",
    criteria: [
      "SE scopes POC requirements in a 30-min discovery call",
      "SE sets up environment independently within 3 days",
      "Executive readout scores ≥80 on communication rubric",
      "Deal progresses to next stage in scenario",
    ],
    competencies: ["Technical depth", "Project management", "Executive communication", "POC delivery"],
    estTime: "Multi-day",
    difficulty: "Expert",
    roleTarget: "Senior SE",
    timeline: [
      tl("AI task created", "Jul 14", true),
      tl("Assign to Senior SE writer", "Jul 17", false),
      tl("Draft challenge brief + rubric", "Jul 25", false),
      tl("Pilot with one SE", "Aug 1", false),
      tl("Publish + notify manager", "Aug 5", false),
    ],
    activity: [{ initials: "AI", avatarBg: "#CC27B0", note: "Auto-created from Demo Manager's request for Harper Ivan advisory track.", time: "Just now" }],
  },
  {
    id: "m-1",
    isAI: false,
    title: "SailPoint IIQ Advanced Connector Configuration",
    meta: "Manual request · Technical depth curriculum",
    type: "Module",
    priority: "Medium",
    requestedBy: "Sarah K.",
    forSE: "All SEs",
    status: "IN PROGRESS",
    due: "Jul 30",
    aiNote: "",
    context:
      "Deep-dive module on SailPoint IIQ connector configuration for complex enterprise environments including SAP, Workday, and custom JDBC connectors.",
    criteria: ["Complete connector setup walkthrough", "Include troubleshooting scenarios", "Assessment score ≥70 to pass"],
    competencies: ["Technical depth", "IIQ architecture", "Connector framework"],
    estTime: "60 min",
    difficulty: "Intermediate",
    roleTarget: "All SEs",
    timeline: [
      tl("Task created", "Jul 8", true),
      tl("Outline approved", "Jul 10", true),
      tl("Draft content", "Jul 25", false),
      tl("Review + publish", "Jul 30", false),
    ],
    activity: [
      { initials: "SK", avatarBg: "#0071CE", note: "Outline approved by SE Practice lead.", time: "Jul 10" },
      { initials: "SK", avatarBg: "#0071CE", note: "Task created manually.", time: "Jul 8" },
    ],
  },
];

export const mockWriters: Writer[] = [
  { id: "w1", name: "Alex Rivera", initials: "AR", role: "Senior Content Writer", activeTasks: 2, availability: "AVAILABLE", avatarBg: "linear-gradient(135deg,#1a5c8a,#0071CE)" },
  { id: "w2", name: "Jordan Kim", initials: "JK", role: "Sim Designer", activeTasks: 4, availability: "BUSY", avatarBg: "linear-gradient(135deg,#5a2d82,#9b44c8)" },
  { id: "w3", name: "Morgan Chen", initials: "MC", role: "Content Writer", activeTasks: 1, availability: "AVAILABLE", avatarBg: "linear-gradient(135deg,#0D6B4F,#0A6E45)" },
  { id: "w4", name: "Taylor Patel", initials: "TP", role: "Competitive Content", activeTasks: 3, availability: "AVAILABLE", avatarBg: "linear-gradient(135deg,#B83128,#D4810A)" },
];

export function taskStatusStyle(status: ContentTask["status"]): { bg: string; color: string } {
  switch (status) {
    case "NEW":
      return { bg: "rgba(204,39,176,.08)", color: "#CC27B0" };
    case "ASSIGNED":
      return { bg: "rgba(212,129,10,.08)", color: "#D4810A" };
    case "IN PROGRESS":
      return { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
    case "COMPLETE":
      return { bg: "rgba(10,110,69,.08)", color: "#0A6E45" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function taskTypeStyle(type: ContentTask["type"]): { bg: string; color: string } {
  switch (type) {
    case "Simulation":
      return { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
    case "Module":
      return { bg: "rgba(10,110,69,.08)", color: "#0A6E45" };
    case "Challenge":
      return { bg: "rgba(90,45,130,.08)", color: "#5a2d82" };
    case "Certification prep":
      return { bg: "rgba(212,129,10,.08)", color: "#D4810A" };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function taskPriorityStyle(priority: ContentTask["priority"]): { bg: string; color: string } {
  switch (priority) {
    case "High":
      return { bg: "rgba(184,49,40,.08)", color: "#B83128" };
    case "Medium":
      return { bg: "rgba(212,129,10,.08)", color: "#D4810A" };
    case "Low":
      return { bg: "#F5F4F0", color: "#6B6860" };
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}
