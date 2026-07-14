export interface AISignal {
  icon: string;
  label: string;
  value: string;
  color: string;
  detail: string;
}

export interface GoalMilestone {
  label: string;
  date: string;
  done: boolean;
}

export interface DevGoal {
  icon: string;
  title: string;
  quarter: string;
  source: string;
  progress: number;
  tag: string;
  tagBg: string;
  tagColor: string;
  progressColor: string;
  dueDate: string;
  dueDateColor: string;
  bg: string;
  borderColor: string;
  milestones: GoalMilestone[];
}

export interface QuarterSummary {
  label: string;
  summary: string;
  needsAction: boolean;
  bg: string;
  border: string;
  labelColor: string;
}

export interface SeGrowthPlanData {
  hasPlan: boolean;
  signals: AISignal[];
  goals: DevGoal[];
  quarters: QuarterSummary[];
}
