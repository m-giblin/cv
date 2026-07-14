export type TaskStatus = "NEW" | "ASSIGNED" | "IN PROGRESS" | "COMPLETE";
export type TaskType = "Simulation" | "Module" | "Challenge" | "Certification prep";
export type TaskPriority = "High" | "Medium" | "Low";
export type FilterTab = "all" | "ai" | "new" | "progress" | "complete";
export type DetailTab = "brief" | "timeline" | "activity";

export interface TimelineStep {
  label: string;
  date: string;
  done: boolean;
}

export interface ActivityEntry {
  initials: string;
  avatarBg: string;
  note: string;
  time: string;
  createdAt?: string;
}

export interface Writer {
  id: string;
  name: string;
  initials: string;
  role: string;
  activeTasks: number;
  availability: "AVAILABLE" | "BUSY" | "OUT";
  avatarBg: string;
}

export interface ContentTask {
  id: string;
  isAI: boolean;
  title: string;
  meta: string;
  type: TaskType;
  priority: TaskPriority;
  requestedBy: string;
  forSE: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  due: string;
  createdAt?: string;
  aiNote: string;
  context: string;
  criteria: string[];
  competencies: string[];
  estTime: string;
  difficulty: string;
  roleTarget: string;
  timeline: TimelineStep[];
  activity: ActivityEntry[];
}

export interface TaskMutations {
  taskStatus: Record<string, TaskStatus>;
  taskAssignee: Record<string, string>;
  taskActivity: Record<string, ActivityEntry[]>;
  taskTimeline: Record<string, TimelineStep[]>;
}
