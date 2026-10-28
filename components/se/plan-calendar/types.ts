export interface CalMilestone {
  day: string;
  title: string;
  type: string;
  status: "DONE" | "IN REVIEW" | "DUE TODAY" | "OPEN" | "UPCOMING";
  icon: string;
  managerNote?: string;
  date?: string;
  /** Opens the step on My ramp. Absent for demo data. */
  href?: string;
}

export interface CalWeek {
  label: string;
  done: boolean;
  milestones: CalMilestone[];
}
