// ============================================================
// types/contentAdmin.ts — All interfaces for Content Admin Portal
// ============================================================

export type TaskStatus = 'NEW' | 'ASSIGNED' | 'IN PROGRESS' | 'COMPLETE';
export type TaskType = 'Simulation' | 'Module' | 'Challenge' | 'Certification prep';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type FilterTab = 'all' | 'ai' | 'new' | 'progress' | 'complete';
export type DetailTab = 'brief' | 'timeline' | 'activity';

// ── Timeline step ─────────────────────────────────────────
export interface TimelineStep {
  label: string;
  date: string;
  done: boolean;
}

// ── Activity log entry ────────────────────────────────────
export interface ActivityEntry {
  initials: string;
  avatarBg: string;
  note: string;
  time: string;         // "Just now" | "Jul 10" | ISO string
  createdAt?: string;   // ISO timestamp for sorting
}

// ── Content writer ────────────────────────────────────────
export interface Writer {
  id: string;
  name: string;
  initials: string;
  role: string;         // "Senior Content Writer" | "Sim Designer"
  activeTasks: number;
  availability: 'AVAILABLE' | 'BUSY' | 'OUT';
  avatarBg: string;
}

// ── Content task ─────────────────────────────────────────
export interface ContentTask {
  id: string;
  isAI: boolean;        // true = auto-created by AI from a content request

  // Identity
  title: string;
  meta: string;         // subtitle shown in table row
  type: TaskType;
  priority: TaskPriority;
  requestedBy: string;  // manager name
  forSE: string;        // SE name(s) or "All SEs"

  // Status
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;

  // Dates
  due: string;          // "Jul 25"
  createdAt?: string;   // ISO

  // Brief (AI-pre-filled when isAI=true)
  aiNote: string;       // explains why AI created this task
  context: string;
  criteria: string[];
  competencies: string[];
  estTime: string;
  difficulty: string;
  roleTarget: string;

  // Build data
  timeline: TimelineStep[];
  activity: ActivityEntry[];
}

// ── Mutable task state (optimistic UI, sync to API) ──────
export interface TaskMutations {
  taskStatus: Record<string, TaskStatus>;
  taskAssignee: Record<string, string>;
  taskActivity: Record<string, ActivityEntry[]>;
  taskTimeline: Record<string, TimelineStep[]>;
}

// ── API shapes ────────────────────────────────────────────
export interface AssignTaskRequest {
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  assignedBy: string;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: TaskStatus;
  updatedBy: string;
  publishedAt?: string; // ISO — set when status = 'COMPLETE'
}

export interface AddActivityRequest {
  taskId: string;
  authorId: string;
  note: string;
}

export interface ToggleTimelineStepRequest {
  taskId: string;
  stepIndex: number;
  done: boolean;
}

export interface CreateTaskRequest {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  context: string;
  due: string;
  requestedBy: string;
  isAI: false;
}
