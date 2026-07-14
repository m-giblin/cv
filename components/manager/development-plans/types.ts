export type PlanStatus = "NO PLAN" | "AI PLAN READY" | "ACTIVE" | "COMPLETE";
export type GoalTag = "ON TRACK" | "IN PROGRESS" | "AT RISK" | "NOT STARTED" | "AI CHALLENGE";
export type SERole = "SE" | "AE" | "DSR";

export interface AISignal {
  icon: string;
  label: string;
  value: string;
  color: string;
  detail: string;
}

export interface Milestone {
  label: string;
  date: string;
  done: boolean;
  isCalendar: boolean;
}

export interface GoalCard {
  icon: string;
  title: string;
  quarter: string;
  source: string;
  progress: number;
  dueDate: string;
  overdue: boolean;
  tag: GoalTag;
  milestones: Milestone[];
  isNewContent: boolean;
  newContentNote: string;
}

export interface SuggestedGoal {
  icon: string;
  title: string;
  quarter: string;
  effort: string;
  tag: string;
  rationale: string;
  chips: string[];
  isNew: boolean;
}

export interface SEDevProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: string;
  role: SERole;
  day: number;
  avatarBg: string;
  status: PlanStatus;
  goalCount: string;
  goals: GoalCard[];
  hasAiSuggestion: boolean;
  aiLabel: string;
  suggestedGoals: SuggestedGoal[];
  aiReasoning: string;
  signals: AISignal[];
  quarters: QuarterSummary[];
  calendarItems: string[];
}

export interface QuarterSummary {
  label: string;
  summary: string;
  state: "done" | "current" | "action" | "upcoming";
  needsAction: boolean;
}

export interface ContentBrief {
  scenarioTitle: string;
  context: string;
  successCriteria: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  estimatedTime: string;
  competencies: string[];
  roleTarget: SERole;
  suggestedReviewer: string;
}
