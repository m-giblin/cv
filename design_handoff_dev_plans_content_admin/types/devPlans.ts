// ============================================================
// types/devPlans.ts — All interfaces for Development Plans
// ============================================================

export type PlanStatus = 'NO PLAN' | 'AI PLAN READY' | 'ACTIVE' | 'COMPLETE';
export type GoalTag = 'ON TRACK' | 'IN PROGRESS' | 'AT RISK' | 'NOT STARTED' | 'AI CHALLENGE';
export type SERole = 'SE' | 'AE' | 'DSR';

// ── AI data signal (one card in the signals grid) ─────────
export interface AISignal {
  icon: string;
  label: string;
  value: string;        // e.g. "78→55 (-23 pts)"
  color: string;        // hex — driven by severity
  detail: string;       // one-line explanation
}

// ── One goal milestone ────────────────────────────────────
export interface Milestone {
  label: string;
  date: string;         // "Jul 25"
  done: boolean;
  isCalendar: boolean;  // show 📅 icon — synced to Plan Calendar
}

// ── One goal card ─────────────────────────────────────────
export interface GoalCard {
  icon: string;
  title: string;
  quarter: string;      // "Q3 2026"
  source: string;       // "AI · Cert gap" or "Coaching gap · Score 52"
  progress: number;     // 0–100
  dueDate: string;
  overdue: boolean;
  tag: GoalTag;
  milestones: Milestone[];
  isNewContent: boolean;    // true when no existing sim/module covers this goal
  newContentNote: string;   // AI-drafted scenario description for submission
}

// ── One suggested goal (in AI Review Drawer) ─────────────
export interface SuggestedGoal {
  icon: string;
  title: string;
  quarter: string;
  effort: string;       // "6 weeks"
  tag: string;
  rationale: string;    // AI explanation for why this goal was suggested
  chips: string[];      // short tags e.g. ["Multi-stakeholder", "IT + Security"]
  isNew: boolean;       // true if no content exists — needs content team
}

// ── Full SE profile for Development Plans ────────────────
export interface SEDevProfile {
  id: string;           // e.g. "DS", "GH"
  name: string;
  email: string;
  initials: string;
  level: string;        // "Basic SE" | "Senior SE" | "Advisory SE"
  role: SERole;
  day: number;          // day of ramp program
  avatarBg: string;     // CSS gradient

  // Plan state
  status: PlanStatus;
  goalCount: string;    // display string e.g. "2 active goals · Q2–Q3"

  // Active goals (empty until plan approved)
  goals: GoalCard[];

  // AI suggestion state
  hasAiSuggestion: boolean;
  aiLabel: string;      // e.g. "3 AI GOALS READY"
  suggestedGoals: SuggestedGoal[];
  aiReasoning: string;  // compact data summary for the drawer

  // Data signals (computed from real profile data)
  signals: AISignal[];

  // Quarter timeline
  quarters: QuarterSummary[];

  // Calendar milestones (for FullPlanDrawer)
  calendarItems: string[];
}

// ── Quarter strip item ────────────────────────────────────
export interface QuarterSummary {
  label: string;        // "Q1"
  summary: string;      // "2 goals completed"
  state: 'done' | 'current' | 'action' | 'upcoming';
  needsAction: boolean;
}

// ── API shapes ────────────────────────────────────────────
export interface ApprovePlanRequest {
  seId: string;
  managerId: string;
  goals: SuggestedGoal[];
  approvedAt?: string;  // ISO timestamp
}

export interface ContentRequest {
  seId: string;
  seName: string;
  managerId: string;
  brief: ContentBrief;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ContentBrief {
  scenarioTitle: string;
  context: string;
  successCriteria: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  estimatedTime: string;
  competencies: string[];
  roleTarget: SERole;
  suggestedReviewer: string;
}
