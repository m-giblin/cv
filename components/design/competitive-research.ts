/** Competitive UX research — Allego, Rippling, Mindtickle, Hyperbound, SalesHood, Seismic Learning, Siro */

export type CompetitiveRating = 1 | 2 | 3 | 4 | 5;

export type CompetitivePlatform = {
  id: string;
  name: string;
  category: string;
  portalDesign: CompetitiveRating;
  workflowFlow: CompetitiveRating;
  easeOfUse: CompetitiveRating;
  onboardingFit: CompetitiveRating;
  honestTake: string;
  portalNotes: string;
  flowNotes: string;
  steal: string[];
  skip: string[];
};

export const COMPETITIVE_PLATFORMS: CompetitivePlatform[] = [
  {
    id: "allego",
    name: "Allego",
    category: "Revenue enablement (learning + content + coaching + DSR)",
    portalDesign: 4,
    workflowFlow: 4,
    easeOfUse: 4,
    onboardingFit: 4,
    honestTake:
      "Best-in-class at putting the next action in the rep's pocket. Mobile-first and in-workflow beats LMS login-and-leave. Heavy for a focused SE ramp tool.",
    portalNotes:
      "Unified hub: learning, content, roleplay, deal rooms. Clean enterprise SaaS. AI 'Sparks' surface guidance without a chat wall. Strong manager analytics layer.",
    flowNotes:
      "Rep flow: open app → see assignment or deal alert → practice or share content → manager sees competency heat map. Admin flow is modular but broad.",
    steal: [
      "One obvious next action on home (deal alert / practice / review)",
      "Practice tied to real scenarios, not generic modules",
      "Manager competency view linked to execution, not completion %",
    ],
    skip: [
      "Digital sales rooms and full content CMS — out of scope for ramp",
      "Breadth of modules that makes the portal feel like a second CRM",
    ],
  },
  {
    id: "mindtickle",
    name: "Mindtickle",
    category: "Revenue readiness (LMS + roleplay + content + analytics)",
    portalDesign: 3,
    workflowFlow: 3,
    easeOfUse: 3,
    onboardingFit: 4,
    honestTake:
      "Gold standard for structured enterprise ramp programs — but it still feels like an LMS you visit, then leave to sell. Dense navigation taxes new SEs.",
    portalNotes:
      "Dashboard → Learning paths → Content library → Practice arena → Analytics. Progress bars and gamification everywhere. Role-based homepages help.",
    flowNotes:
      "Auto-enroll in personalized paths (strong). Microlearning + AI roleplay + certifications. Reps hunt across tabs; enablement loves the structure.",
    steal: [
      "Week-based learning paths with visible completion",
      "Auto-enrollment by role/segment",
      "Certification gates at end of each ramp stage",
      "Practice arena as first-class nav item",
    ],
    skip: [
      "Leaderboards and points as primary motivation (feels sales-y, not SE-y)",
      "Deep hierarchical nav — keep our top bar + bento",
      "SKO / everboarding sprawl on the same home as day-3 SE",
    ],
  },
  {
    id: "saleshood",
    name: "SalesHood",
    category: "Sales enablement (huddles, paths, coaching command center)",
    portalDesign: 4,
    workflowFlow: 5,
    easeOfUse: 4,
    onboardingFit: 5,
    honestTake:
      "Closest workflow match for manager-led SE ramp. Homepage-as-workspace and Coaching Command Center are exactly right for John/Matt's teams.",
    portalNotes:
      "Personalized homepage by tenure/role — reps live here. Huddles + Paths = structured onboarding. Drag-and-drop authoring for enablement.",
    flowNotes:
      "Manager: prioritized coaching queue → program tracker timeline → curated pitch videos → assign path in few clicks. Rep: today's huddle → submit pitch → get feedback.",
    steal: [
      "Manager 'command center' with inbox-first layout",
      "Graphical program tracker across weeks",
      "Pitch/video review queue with filters",
      "Paths that reuse completed huddles (no duplicate work)",
    ],
    skip: [
      "Social feed / peer video wall as default home (noise for technical SEs)",
      "Over-customization that burdens admins",
    ],
  },
  {
    id: "seismic-learning",
    name: "Seismic Learning",
    category: "Sales LMS (Lessonly) inside Seismic cloud",
    portalDesign: 4,
    workflowFlow: 4,
    easeOfUse: 5,
    onboardingFit: 4,
    honestTake:
      "Powerfully simple for learners — log in, see assignments, done. Limited visual branding but that's a feature: zero confusion on day one.",
    portalNotes:
      "Assignment-first Learn page. Logo + accent color only. Lessons feel like docs/email. Manager dashboards: readiness scorecard, team insights.",
    flowNotes:
      "Assign path → rep completes lesson + practice recording → manager feedback inline → readiness score updates. Minimal clicks.",
    steal: [
      "Assignments front and center — no dashboard archaeology",
      "Practice + manager feedback in one step record",
      "Readiness scorecard (3 numbers max)",
      "Lesson authoring simplicity",
    ],
    skip: [
      "Weak customization (we need SailPoint brand)",
      "Limited quiz/assessment depth",
      "Search that users complain about",
    ],
  },
  {
    id: "hyperbound",
    name: "Hyperbound",
    category: "AI roleplay + conversation intelligence + coaching",
    portalDesign: 4,
    workflowFlow: 4,
    easeOfUse: 4,
    onboardingFit: 3,
    honestTake:
      "Best practice UX in the market for simulations. Rep-first framing ('flight simulator') is how we should sell sims to SEs. Narrow scope — not a full ramp portal.",
    portalNotes:
      "Video-call-style roleplay UI. Rep dashboard with skill widgets. Revamped sidebar. Scorecards on talk ratio, objections, methodology.",
    flowNotes:
      "Build bot → assign scenario → rep practices → instant AI feedback → manager reviews trends. Kota AI for cross-deal queries (manager-heavy).",
    steal: [
      "Flight-simulator framing for practice",
      "Instant private feedback before manager review",
      "Scorecard criteria visible before session",
      "Skill breakdown charts (not one overall grade)",
    ],
    skip: [
      "Deal rescue / CRM automation as home screen",
      "Surveillance vibe — always position as rep growth",
      "Standalone platform — we're sim + plan + shadow + cert",
    ],
  },
  {
    id: "rippling",
    name: "Rippling LMS",
    category: "HRIS-embedded learning (compliance + L&D)",
    portalDesign: 4,
    workflowFlow: 3,
    easeOfUse: 4,
    onboardingFit: 2,
    honestTake:
      "Excellent employee portal patterns, wrong soul for SE ramp. Auto-enrollment by attributes is brilliant; generic course catalog is not.",
    portalNotes:
      "Same app as payroll/HR. Clean modern UI. Mobile self-service. Admin compliance dashboards.",
    flowNotes:
      "HR event triggers training → reminders in Slack/email → block clock-in until complete. Works for compliance, feels punitive for craft learning.",
    steal: [
      "Auto-assign ramp when profile created or promoted",
      "Reminders in Slack + email from one rules engine",
      "Single portal for all employee tasks (we: one portal for all SE work)",
    ],
    skip: [
      "Compliance-first completion tracking",
      "Generic course grid unrelated to deal work",
      "HR admin mental model",
    ],
  },
  {
    id: "siro",
    name: "Siro",
    category: "Field conversation intelligence + mobile coaching",
    portalDesign: 3,
    workflowFlow: 4,
    easeOfUse: 4,
    onboardingFit: 4,
    honestTake:
      "Shadow logging done right — capture, transcribe, coach on real conversations. Mobile-first. Less relevant for virtual SE motion but shadow step in our doc maps perfectly.",
    portalNotes:
      "Mobile record button. Halftime live coaching. Manager dashboards + Ask Siro queries. Rep skill scorecards.",
    flowNotes:
      "Rep records meeting → auto summary + CRM → manager reviews patterns → rep self-coaches from library. Usage = leading indicator.",
    steal: [
      "One-tap shadow log with structured takeaways",
      "Skill-level scorecard (not just pass/fail)",
      "Manager query across team patterns",
      "Pre-call brief from past shadows",
    ],
    skip: [
      "Phone-record-in-pocket as primary UX (our SEs are Zoom/hybrid)",
      "Field-sales-only positioning",
    ],
  },
];

export const SYNTHESIS_FOR_SAILPOINT_SE = {
  recommendedDirection: "FIELD",
  tagline: "SalesHood manager flow + Seismic assignment clarity + Hyperbound practice + Siro shadow log",
  seHomeMustHave: [
    "Week runway (1–8) with current week highlighted — from your onboarding doc",
    "One 'Do this now' card — never more than one primary CTA",
    "Checklist of plan steps with shadow / sim / content types visible",
    "Practice feedback strip — last sim score + revision state",
    "3 metrics max: plan %, sim trend, cert gate",
  ],
  managerHomeMustHave: [
    "Inbox count first — submissions, sim cards, plan steps, certs",
    "Program tracker by week for each SE",
    "3-step assign: template → person → confirm",
    "Roster with week position + progress, not a data table",
  ],
  avoid: [
    "LMS course catalog as home",
    "Gamification leaderboards for enterprise SE audience",
    "AI chat as the main surface",
    "More than 6 top-nav items",
    "Ramp readiness as the task list (lagging indicator only)",
  ],
} as const;

export function ratingLabel(score: CompetitiveRating): string {
  const labels: Record<CompetitiveRating, string> = {
    1: "Poor",
    2: "Weak",
    3: "Adequate",
    4: "Strong",
    5: "Excellent",
  };
  return labels[score];
}

export function averageScore(platform: CompetitivePlatform): number {
  return (platform.portalDesign + platform.workflowFlow + platform.easeOfUse + platform.onboardingFit) / 4;
}
