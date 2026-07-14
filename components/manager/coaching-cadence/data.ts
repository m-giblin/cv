import type { BriefPoint, CompetencySkill, SEProfile } from "./types";

export function computeSkill(name: string, score: number): CompetencySkill {
  const color =
    score >= 75 ? "#0A6E45" : score >= 60 ? "#0071CE" : score >= 45 ? "#D4810A" : "#B83128";
  const tag: CompetencySkill["tag"] =
    score >= 75 ? "STRONG" : score >= 60 ? "OK" : score >= 45 ? "GAP" : "CRITICAL";
  const tagBg =
    score >= 75
      ? "rgba(10,110,69,.08)"
      : score >= 60
        ? "rgba(0,113,206,.08)"
        : score >= 45
          ? "rgba(212,129,10,.08)"
          : "rgba(184,49,40,.08)";
  return { name, score, color, tag, tagBg, tagColor: color, width: `${score}%` };
}

export function computeSparkline(scores: number[]) {
  const W = 260;
  const H = 56;
  const pad = 4;
  const min = Math.min(...scores) - 8;
  const max = Math.max(...scores) + 8;
  const range = max - min;
  const pts = scores.map((s, i) => ({
    x: +(pad + (i / (scores.length - 1)) * (W - pad * 2)).toFixed(1),
    y: +(H - pad - ((s - min) / range) * (H - pad * 2)).toFixed(1),
  }));
  return {
    sparkPts: pts.map((p) => `${p.x},${p.y}`).join(" "),
    sparkArea:
      `M${pts[0].x},${H} ` +
      pts.map((p) => `L${p.x},${p.y}`).join(" ") +
      ` L${pts[pts.length - 1].x},${H} Z`,
    sparkDots: pts,
    thresholdY: +(H - pad - ((70 - min) / range) * (H - pad * 2)).toFixed(1),
  };
}

function brief(
  icon: string,
  iconBg: string,
  text: string,
  tag: string,
  tagColor: string,
  tagBg: string,
  action: string | null,
  actionBg = "",
  actionColor = "",
  actionBorder = "",
): BriefPoint {
  return {
    icon,
    iconBg,
    text,
    tag,
    tagColor,
    tagBg,
    hasAction: Boolean(action),
    action: action ?? "",
    actionBg,
    actionColor,
    actionBorder,
  };
}

const DS_spark = computeSparkline([78, 72, 66, 61, 55]);
const FG_spark = computeSparkline([65, 58, 62, 55, 49]);
const GH_spark = computeSparkline([72, 74, 77, 79, 82]);
const HI_spark = computeSparkline([80, 83, 87, 89, 91]);

export const mockProfiles: Record<string, SEProfile> = {
  DS: {
    id: "DS",
    name: "Demo SE",
    email: "demo.se@sailpoint.com",
    initials: "DS",
    level: "Basic SE",
    day: 22,
    avatarBg: "linear-gradient(135deg,#5a2d82,#9b44c8)",
    healthLabel: "CRITICAL",
    healthColor: "#B83128",
    healthBg: "rgba(184,49,40,.2)",
    lastLabel: "Never",
    lastColor: "#B83128",
    simAvg: "66",
    simColor: "#B83128",
    simScores: [78, 72, 66, 61, 55],
    trendLabel: "↓23 pts",
    trendColor: "#B83128",
    trendBg: "rgba(184,49,40,.08)",
    trendDesc: "Declining across all 5 sessions — requires intervention",
    ramp: "12%",
    rampColor: "#B83128",
    overdue: "4 items",
    overdueColor: "#B83128",
    sparkColor: "#B83128",
    sparkFill: "#B83128",
    ...DS_spark,
    briefDate: "Generated Jul 13",
    skills: [
      computeSkill("Discovery", 45),
      computeSkill("Demo Execution", 68),
      computeSkill("Objection Handling", 52),
      computeSkill("Competitive Positioning", 38),
      computeSkill("Technical Depth", 71),
    ],
    brief: [
      brief(
        "🚨",
        "#FEF0EE",
        "Gate 1 sign-off has been blocked for 13 days — Demo SE cannot advance to Phase 2 until you approve. Complete this BEFORE the 1:1 so the session can focus on forward momentum.",
        "MANAGER ACTION",
        "#B83128",
        "rgba(184,49,40,.08)",
        "Sign off Gate 1 →",
        "#B83128",
        "white",
        "none",
      ),
      brief(
        "📉",
        "#FEF0EE",
        "Sim avg dropped 23 pts across 5 sessions (78→55). Competitive Positioning is the lowest score on the team at 38 — an Entra ID trap appeared in 3 of 5 recent sessions. Walk through the trap-handling script together in this session.",
        "DECLINING",
        "#B83128",
        "rgba(184,49,40,.08)",
        null,
      ),
      brief(
        "🎯",
        "#FFF7ED",
        "Discovery score: 45 — has not attempted a multi-stakeholder scenario. Assign the 'Enterprise Discovery: IT + Security + HR stakeholders' sim before end of this week. Run it before the next 1:1 so you have a fresh data point.",
        "ASSIGN SIM",
        "#D4810A",
        "rgba(212,129,10,.08)",
        "Assign sim now",
        "#F0F7FF",
        "#0071CE",
        "1px solid rgba(0,113,206,.2)",
      ),
      brief(
        "⚠️",
        "#FFF7ED",
        "Day 22 with zero 1:1s logged. Every day without a coaching touchpoint at this ramp stage compounds the gap. Establish a weekly cadence starting this session.",
        "OVERDUE",
        "#D4810A",
        "rgba(212,129,10,.08)",
        null,
      ),
    ],
    hasHistory: false,
    noHistory: true,
    history: [],
    actions: [],
  },
  FG: {
    id: "FG",
    name: "Finn Grant",
    email: "finn.grant@sailpoint.com",
    initials: "FG",
    level: "Basic SE",
    day: 22,
    avatarBg: "linear-gradient(135deg,#B83128,#7c1d1d)",
    healthLabel: "BEHIND",
    healthColor: "#D4810A",
    healthBg: "rgba(212,129,10,.2)",
    lastLabel: "Never",
    lastColor: "#B83128",
    simAvg: "58",
    simColor: "#D4810A",
    simScores: [65, 58, 62, 55, 49],
    trendLabel: "↓16 pts",
    trendColor: "#B83128",
    trendBg: "rgba(184,49,40,.08)",
    trendDesc: "Volatile and declining — session 3 spike didn't hold",
    ramp: "18%",
    rampColor: "#D4810A",
    overdue: "4 items",
    overdueColor: "#B83128",
    sparkColor: "#D4810A",
    sparkFill: "#D4810A",
    ...FG_spark,
    briefDate: "Generated Jul 13",
    skills: [
      computeSkill("Discovery", 55),
      computeSkill("Demo Execution", 49),
      computeSkill("Objection Handling", 60),
      computeSkill("Competitive Positioning", 52),
      computeSkill("Technical Depth", 58),
    ],
    brief: [
      brief(
        "📉",
        "#FEF0EE",
        "Demo Execution: 49 — below the 60 threshold. 3 of 5 sims ended under 15 min, suggesting Finn is rushing through discovery. Pull up the last recording together and timestamp where the session breaks down.",
        "CRITICAL GAP",
        "#B83128",
        "rgba(184,49,40,.08)",
        null,
      ),
      brief(
        "🎯",
        "#FFF7ED",
        'Recurring evaluator flag across 4 of 5 sessions: "Presentation deck not referenced." Assign the DemoHub submission challenge as a practice artifact — Finn needs a structured output to anchor the demo flow.',
        "RECURRING GAP",
        "#D4810A",
        "rgba(212,129,10,.08)",
        "Assign DemoHub challenge",
        "#F0F7FF",
        "#0071CE",
        "1px solid rgba(0,113,206,.2)",
      ),
      brief(
        "🚀",
        "#F0FDF7",
        "Career path: at current velocity, Finn misses Gate 2 by 14 days. Discuss peer buddy pairing with Harper Ivan — shadowing a higher performer at the same ramp stage has a measurable impact on sim scores within 2 weeks.",
        "GROWTH",
        "#0A6E45",
        "rgba(10,110,69,.08)",
        "Pair with Harper Ivan",
        "#EDFAF3",
        "#0A6E45",
        "1px solid rgba(10,110,69,.2)",
      ),
    ],
    hasHistory: false,
    noHistory: true,
    history: [],
    actions: [],
  },
  GH: {
    id: "GH",
    name: "Gray Hayes",
    email: "gray.hayes@sailpoint.com",
    initials: "GH",
    level: "Senior SE",
    day: 45,
    avatarBg: "linear-gradient(135deg,#1a5c8a,#0071CE)",
    healthLabel: "ON PACE",
    healthColor: "#0A6E45",
    healthBg: "rgba(10,110,69,.2)",
    lastLabel: "Jul 5",
    lastColor: "#0A6E45",
    simAvg: "78",
    simColor: "#0071CE",
    simScores: [72, 74, 77, 79, 82],
    trendLabel: "↑10 pts",
    trendColor: "#0A6E45",
    trendBg: "rgba(10,110,69,.08)",
    trendDesc: "Consistent improvement — ready for harder scenarios",
    ramp: "62%",
    rampColor: "#0071CE",
    overdue: "0",
    overdueColor: "#0A6E45",
    sparkColor: "#0071CE",
    sparkFill: "#0071CE",
    ...GH_spark,
    briefDate: "Generated Jul 13",
    skills: [
      computeSkill("Discovery", 74),
      computeSkill("Demo Execution", 79),
      computeSkill("Objection Handling", 68),
      computeSkill("Competitive Positioning", 52),
      computeSkill("Technical Depth", 82),
    ],
    brief: [
      brief(
        "🚀",
        "#F0FDF7",
        "Sim trend is positive +10 pts across 5 sessions — Gray is ready for harder scenarios. Escalate from standard to competitive format: assign the 'SailPoint vs. Saviynt Competitive Bakeoff' sim this week.",
        "PROMOTE",
        "#0A6E45",
        "rgba(10,110,69,.08)",
        "Assign competitive sim",
        "#EDFAF3",
        "#0A6E45",
        "1px solid rgba(10,110,69,.2)",
      ),
      brief(
        "🎯",
        "#F0F7FF",
        "Competitive Positioning (52) is the single gap in an otherwise strong profile. The SLED specialization cert is the direct unlock. Review the SLED competitive cheat sheet together and set a cert target date.",
        "FOCUS AREA",
        "#0071CE",
        "rgba(0,113,206,.08)",
        null,
      ),
      brief(
        "📈",
        "#F0FDF7",
        "Career: Gray is 28% toward Advisory Solutions Consultant. Identify 2 concrete Q3 stretch goals this session — a customer reference call and an enterprise deal assist are the fastest credentialing paths at this level.",
        "CAREER",
        "#0A6E45",
        "rgba(10,110,69,.08)",
        null,
      ),
    ],
    hasHistory: true,
    noHistory: false,
    history: [
      {
        date: "Jul 5",
        dow: "Sat",
        focus: "Technical depth — ISC architecture deep dive",
        note: "Ran through ISC connector architecture. Gray struggled with complex attribute mapping but recovered well. Assigned lab to reinforce.",
        outcomeLabel: "IMPROVED",
        outcomeColor: "#0A6E45",
        outcomeBg: "rgba(10,110,69,.08)",
        delta: "+4 pts",
        deltaColor: "#0A6E45",
      },
      {
        date: "Jun 28",
        dow: "Sat",
        focus: "Discovery practice — multi-stakeholder scenario",
        note: "First multi-stakeholder sim. Strong on IT track, weak on HR persona — doesn't know the identity lifecycle pain points for HR. Assigned reading.",
        outcomeLabel: "PARTIAL",
        outcomeColor: "#D4810A",
        outcomeBg: "rgba(212,129,10,.08)",
        delta: "+2 pts",
        deltaColor: "#D4810A",
      },
    ],
    actions: [],
  },
  HI: {
    id: "HI",
    name: "Harper Ivan",
    email: "harper.ivan@sailpoint.com",
    initials: "HI",
    level: "Advisory SE",
    day: 68,
    avatarBg: "linear-gradient(135deg,#0A6E45,#14a065)",
    healthLabel: "AHEAD",
    healthColor: "#0071CE",
    healthBg: "rgba(0,113,206,.2)",
    lastLabel: "Jul 7",
    lastColor: "#0A6E45",
    simAvg: "86",
    simColor: "#0A6E45",
    simScores: [80, 83, 87, 89, 91],
    trendLabel: "↑11 pts",
    trendColor: "#0A6E45",
    trendBg: "rgba(10,110,69,.08)",
    trendDesc: "Top performer on the team — all signals positive",
    ramp: "78%",
    rampColor: "#0A6E45",
    overdue: "0",
    overdueColor: "#0A6E45",
    sparkColor: "#0A6E45",
    sparkFill: "#0A6E45",
    ...HI_spark,
    briefDate: "Generated Jul 13",
    skills: [
      computeSkill("Discovery", 88),
      computeSkill("Demo Execution", 85),
      computeSkill("Objection Handling", 80),
      computeSkill("Competitive Positioning", 75),
      computeSkill("Technical Depth", 90),
    ],
    brief: [
      brief(
        "🏆",
        "#F0FDF7",
        "All signals strong — sim avg 91 (top of team), ramp 12 days ahead of pace. Use this 1:1 for career planning, not remediation. Harper is ready for the next level conversation.",
        "TOP PERFORMER",
        "#0A6E45",
        "rgba(10,110,69,.08)",
        null,
      ),
      brief(
        "🚀",
        "#F0FDF7",
        "Nominate Harper for the Q4 peer coach role. Mentoring a junior SE accelerates Harper's own ASC promotion trajectory — it's the highest-signal demonstration of leadership readiness SailPoint looks for at this level.",
        "CAREER LEVER",
        "#0A6E45",
        "rgba(10,110,69,.08)",
        "Submit peer coach nomination",
        "#EDFAF3",
        "#0A6E45",
        "1px solid rgba(10,110,69,.2)",
      ),
      brief(
        "🎯",
        "#F0F7FF",
        "Gate 4 prep: the solo discovery sim is the last major cert blocker before Advisory certification is complete. Harper's momentum is high — scheduling it this week vs. next week is the difference between Q3 and Q4 completion.",
        "CERT GATE",
        "#0071CE",
        "rgba(0,113,206,.08)",
        "Schedule Gate 4 sim",
        "#F0F7FF",
        "#0071CE",
        "1px solid rgba(0,113,206,.2)",
      ),
    ],
    hasHistory: true,
    noHistory: false,
    history: [
      {
        date: "Jul 7",
        dow: "Mon",
        focus: "Competitive positioning — Saviynt bakeoff prep",
        note: "Strong performance in bakeoff sim. Weak spot: TCO modeling for mid-market. Assigned the SailPoint vs Saviynt TCO calculator exercise.",
        outcomeLabel: "IMPROVED",
        outcomeColor: "#0A6E45",
        outcomeBg: "rgba(10,110,69,.08)",
        delta: "+7 pts",
        deltaColor: "#0A6E45",
      },
      {
        date: "Jun 30",
        dow: "Mon",
        focus: "Executive presence — C-suite discovery simulation",
        note: "First executive sim — CIO/CISO dual-track. Harper adapted well to executive pace but over-featured. One focus: business outcome framing over technical capability.",
        outcomeLabel: "IMPROVED",
        outcomeColor: "#0A6E45",
        outcomeBg: "rgba(10,110,69,.08)",
        delta: "+5 pts",
        deltaColor: "#0A6E45",
      },
    ],
    actions: [],
  },
};

export const urgencyScores: Record<string, number> = {
  DS: 98,
  FG: 84,
  GH: 42,
  HI: 18,
};

export const defaultActionTemplates: Record<
  string,
  Array<{ label: string; bg: string; color: string; border: string }>
> = {
  DS: [
    { label: "Sign off Gate 1", bg: "#B83128", color: "white", border: "none" },
    { label: "Schedule 1:1", bg: "#0071CE", color: "white", border: "none" },
    {
      label: "Assign Entra ID sim",
      bg: "#F0F7FF",
      color: "#0071CE",
      border: "1px solid rgba(0,113,206,.2)",
    },
    { label: "Log coaching note", bg: "transparent", color: "#3D3C38", border: "1px solid #D4D1CB" },
  ],
  FG: [
    { label: "Schedule 1:1", bg: "#0071CE", color: "white", border: "none" },
    {
      label: "Pair with Harper Ivan",
      bg: "#EDFAF3",
      color: "#0A6E45",
      border: "1px solid rgba(10,110,69,.2)",
    },
    {
      label: "Assign DemoHub challenge",
      bg: "#F0F7FF",
      color: "#0071CE",
      border: "1px solid rgba(0,113,206,.2)",
    },
    { label: "Log coaching note", bg: "transparent", color: "#3D3C38", border: "1px solid #D4D1CB" },
  ],
  GH: [
    { label: "Schedule 1:1", bg: "#0071CE", color: "white", border: "none" },
    {
      label: "Assign competitive sim",
      bg: "#EDFAF3",
      color: "#0A6E45",
      border: "1px solid rgba(10,110,69,.2)",
    },
    {
      label: "Plan career path",
      bg: "#F0F7FF",
      color: "#0071CE",
      border: "1px solid rgba(0,113,206,.2)",
    },
    { label: "Log coaching note", bg: "transparent", color: "#3D3C38", border: "1px solid #D4D1CB" },
  ],
  HI: [
    { label: "Schedule 1:1", bg: "#0071CE", color: "white", border: "none" },
    {
      label: "Submit peer coach nomination",
      bg: "#EDFAF3",
      color: "#0A6E45",
      border: "1px solid rgba(10,110,69,.2)",
    },
    {
      label: "Schedule Gate 4 sim",
      bg: "#F0F7FF",
      color: "#0071CE",
      border: "1px solid rgba(0,113,206,.2)",
    },
    { label: "Log coaching note", bg: "transparent", color: "#3D3C38", border: "1px solid #D4D1CB" },
  ],
};

export function computeSummaryStats(profiles: Record<string, SEProfile>) {
  const entries = Object.values(profiles);
  const coachNow = entries.filter((p) => p.healthLabel === "CRITICAL").length;
  const neverHad1on1 = entries.filter((p) => p.lastLabel === "Never").length;
  const simAvg = Math.round(
    entries.reduce((sum, p) => sum + Number.parseInt(p.simAvg, 10), 0) / entries.length,
  );
  const rampAvg = Math.round(
    entries.reduce((sum, p) => sum + Number.parseInt(p.ramp, 10), 0) / entries.length,
  );
  return { coachNow, neverHad1on1, simAvg, rampAvg, total: entries.length };
}
