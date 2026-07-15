export type HealthStatus = "CRITICAL" | "BEHIND" | "ON PACE" | "AHEAD";
export type OutcomeLabel = "IMPROVED" | "PARTIAL" | "LOGGED" | "NO CHANGE";
export type SkillTag = "STRONG" | "OK" | "GAP" | "CRITICAL";

export interface CompetencySkill {
  name: string;
  score: number;
  color: string;
  tag: SkillTag;
  tagBg: string;
  tagColor: string;
  width: string;
}

export interface BriefPoint {
  icon: string;
  iconBg: string;
  text: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  hasAction: boolean;
  action: string;
  actionBg: string;
  actionColor: string;
  actionBorder: string;
  actionFn?: () => void;
}

export interface CoachingHistoryEntry {
  date: string;
  dow: string;
  focus: string;
  note: string;
  outcomeLabel: OutcomeLabel;
  outcomeColor: string;
  outcomeBg: string;
  delta: string;
  deltaColor: string;
}

export interface SEProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: string;
  day: number;
  avatarBg: string;
  healthLabel: HealthStatus;
  healthColor: string;
  healthBg: string;
  lastLabel: string;
  lastColor: string;
  simAvg: string;
  simColor: string;
  simScores: number[];
  trendLabel: string;
  trendColor: string;
  trendBg: string;
  trendDesc: string;
  ramp: string;
  rampColor: string;
  overdue: string;
  overdueColor: string;
  sparkPts: string;
  sparkArea: string;
  sparkDots: { x: number; y: number }[];
  sparkColor: string;
  sparkFill: string;
  thresholdY: number;
  briefDate: string;
  skills: CompetencySkill[];
  brief: BriefPoint[];
  history: CoachingHistoryEntry[];
  hasHistory: boolean;
  noHistory: boolean;
  actions: ActionButton[];
  gateStepId?: string;
}

export interface ActionButton {
  label: string;
  bg: string;
  color: string;
  border: string;
  fn: () => void;
}

export interface SavedNote {
  id?: string;
  seId: string;
  managerId?: string;
  date: string;
  dow: string;
  focus: string;
  note: string;
  outcomeLabel: OutcomeLabel;
  outcomeColor: string;
  outcomeBg: string;
  delta: string;
  deltaColor: string;
  createdAt?: string;
}
