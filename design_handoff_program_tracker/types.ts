// ─────────────────────────────────────────────
// Program Tracker — TypeScript types
// ─────────────────────────────────────────────

export type PhaseStatus = 'complete' | 'active' | 'blocked' | 'upcoming';
export type StepStatus  = 'done' | 'active' | 'blocked' | 'upcoming';
export type SEHealth    = 'ON PACE' | 'AHEAD' | 'BEHIND' | 'CRITICAL';
export type ActiveTab   = 'cohort' | 'programs' | 'milestones';

// ── Cohort tab ────────────────────────────────

export interface PhaseCell {
  status: PhaseStatus;
  bg: string;       // background color hex/rgba
  color: string;    // text/icon color
  icon: string;     // ✓ → ! ○
  label: string;    // "Complete" | "In progress" | "Blocked" | "Upcoming"
  sub: string;      // "Signed off" | "On track" | "Needs help" | ""
}

export interface CohortRow {
  initials: string;
  name: string;
  level: string;        // "Senior" | "Advisory" | "Basic"
  day: number;          // day of ramp
  avatarBg: string;     // CSS gradient
  overall: string;      // "62%"
  overallColor: string; // hex
  phases: PhaseCell[];  // always 4 elements
}

export interface PhaseDef {
  emoji: string;
  bg: string;
  border: string;
  title: string;
  desc: string;
}

// ── Programs tab ─────────────────────────────

export interface ProgramCard {
  name: string;
  subtitle: string;
  type: string;           // "Onboarding" | "Certification" | "Specialization" | "Dev Plan"
  typeColor: string;
  pct: number;            // 0–100
  status: string;         // "On track" | "In progress" | "Critical" | etc.
  statusColor: string;
  statusBg: string;
  due: string;            // "Sep 30"
  borderColor: string;
}

export interface SEProgramsRow {
  initials: string;
  name: string;
  level: string;
  day: number;
  avatarBg: string;
  healthLabel: SEHealth;
  healthColor: string;
  healthBg: string;
  programCount: number;
  programs: ProgramCard[];
}

// ── Milestones tab ───────────────────────────

export interface MilestoneItem {
  dateShort: string;   // "Jul 9"
  dayOfWeek: string;   // "Wed"
  se: string;          // full name
  initials: string;
  avatarBg: string;
  label: string;       // milestone title
  program: string;     // "SE-I Onboarding · Phase 1"
  daysAway?: string;   // "in 5d"
}

export type MilestoneSection = 'overdue' | 'thisWeek' | 'upcoming';

// ── SE Profile Drawer ─────────────────────────

export interface ProgramStep {
  label: string;
  date: string;
  status: StepStatus;
  dotBg: string;
  dotBorder: string;
  dotColor: string;
  check: string;       // "✓" | "!" | "→" | ""
  textColor: string;
  dateColor: string;
  strike: 'line-through' | 'none';
}

export interface DrawerProgram {
  name: string;
  type: string;
  typeColor: string;
  pct: number;
  status: string;
  statusColor: string;
  statusBg: string;
  due: string;
  borderColor: string;
  steps: ProgramStep[];
}

export interface ActivityEntry {
  label: string;
  program: string;
  date: string;
  dotColor: string;
}

export interface DrawerSEProfile {
  name: string;
  initials: string;
  level: string;
  day: number;
  avatarBg: string;
  healthLabel: SEHealth;
  healthColor: string;
  healthBg: string;
  programCount: number;
  overall: string;       // "62%"
  overdueCount: number;
  certsCleared: number;
  programs: DrawerProgram[];
  activity: ActivityEntry[];
}

// ── Manager queue item ────────────────────────

export interface ManagerQueueItem {
  seInitials: string;
  seName: string;
  avatarBg: string;
  title: string;         // "Demo SE — Gate 1 sign-off pending"
  actionLabel: string;   // "Sign off →"
  actionStyle: 'amber' | 'blue';
}

// ── Sign-off queue (Milestones sidebar) ───────

export interface SignOffItem {
  seInitials: string;
  seName: string;
  avatarBg: string;
  title: string;
  description: string;
}
