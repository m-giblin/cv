export interface CalMilestone {
  day: string;
  title: string;
  type: string;
  status: "DONE" | "DUE TODAY" | "OPEN" | "UPCOMING";
  icon: string;
  managerNote?: string;
  date?: string;
}

export interface CalWeek {
  label: string;
  done: boolean;
  milestones: CalMilestone[];
}
