/** Design research synthesis — SE enablement portal patterns (mock-up reference only). */
export const RESEARCH_INSIGHTS = [
  {
    source: "Highspot / Seismic patterns",
    takeaway: "Plays tied to scorecards — one glance health, training linked to execution, not content for content's sake.",
  },
  {
    source: "Dock Playbooks",
    takeaway: "Training lives where reps work; tag + view organization; manager sees who engaged with what.",
  },
  {
    source: "Portal UX best practices",
    takeaway: "Dashboard = pending actions first, then recent activity, then quick 1-click tasks. Reduce clicks ruthlessly.",
  },
  {
    source: "Technical SE enablement (Guideflow)",
    takeaway: "Demo/prep/sim one click from the deal context. 30/60/90 playbook with clear next milestone.",
  },
  {
    source: "WorkRamp / LMS theming",
    takeaway: "Inter-style sans for readability; strong primary accent on CTAs only; WCAG-compliant contrast.",
  },
] as const;

export const SE_WORKFLOW_PRIORITIES = [
  "One obvious next action on login — no hunting",
  "Prep → practice objection without leaving the brief",
  "Progress visible in ≤3 numbers (plan %, sim score, cert gate)",
  "AI as a nudge with a button, not a chat wall",
] as const;

export const MANAGER_WORKFLOW_PRIORITIES = [
  "Triage queue: who needs review or coaching today",
  "Assign ramp in 3 steps: template → person → confirm",
  "Team health at a glance without opening each profile",
  "Security/trust visible but not blocking (AAL2, audit-ready)",
] as const;
