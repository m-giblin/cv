export const SITE_PAGES = [
  { group: "Core", pages: ["Dashboard / SE Workspace", "Manager — Team Overview", "Growth", "Feedback"] },
  { group: "Enablement", pages: ["Deal Prep", "Simulations", "Challenges", "Resources", "Certifications"] },
  { group: "Development", pages: ["Development Plans", "Plans (templates)", "Plan Steps"] },
  { group: "Admin", pages: ["Admin Console", "Account", "Login / MFA"] },
] as const;

export const MOCK_USER = {
  name: "Jordan Chen",
  role: "Sales Engineer",
  level: "Senior SE",
  manager: "Alex Rivera",
};

export const MOCK_TEAM = [
  { name: "Jordan Chen", progress: 68, health: "on_track", sim: 82 },
  { name: "Sam Okonkwo", progress: 41, health: "coach_now", sim: 71 },
  { name: "Riley Park", progress: 89, health: "on_track", sim: 88 },
];

export const MOCK_PLAN_STEPS = [
  { title: "ISC discovery challenge", due: "Day 3", status: "done" },
  { title: "SLED roleplay simulation", due: "Day 5", status: "active" },
  { title: "Deal prep — Acme Health", due: "Day 7", status: "next" },
  { title: "Shadow customer call", due: "Day 10", status: "pending" },
];

export const MOCK_OBJECTIONS = [
  "We already have Okta for SSO — why add another platform?",
  "Implementation timeline seems long for our team size.",
  "Budget is frozen until next fiscal year.",
];

export const MOCK_AI_INSIGHT =
  "Jordan's objection handling improved 14pts this week. Recommend practice on competitive landmines before Thursday's Acme call.";
