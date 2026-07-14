// ============================================================
// types.ts — All TypeScript interfaces for Coaching Cadence
// ============================================================

export type HealthStatus = 'CRITICAL' | 'BEHIND' | 'ON PACE' | 'AHEAD';
export type OutcomeLabel = 'IMPROVED' | 'PARTIAL' | 'LOGGED' | 'NO CHANGE';
export type SkillTag = 'STRONG' | 'OK' | 'GAP' | 'CRITICAL';

// ── One competency bar ────────────────────────────────────
export interface CompetencySkill {
  name: string;
  score: number;           // 0–100
  color: string;           // hex — driven by score thresholds
  tag: SkillTag;
  tagBg: string;
  tagColor: string;
  width: string;           // CSS percentage string e.g. "72%"
}

// ── One AI brief talking point ────────────────────────────
export interface BriefPoint {
  icon: string;            // emoji
  iconBg: string;          // background hex for icon container
  text: string;            // the coaching insight
  tag: string;             // label badge e.g. "MANAGER ACTION"
  tagColor: string;
  tagBg: string;
  hasAction: boolean;
  action: string;          // button label, empty string if none
  actionBg: string;
  actionColor: string;
  actionBorder: string;
  // Wired at runtime by the component — not from API
  actionFn?: () => void;
}

// ── One past coaching session row ─────────────────────────
export interface CoachingHistoryEntry {
  date: string;            // "Jul 5"
  dow: string;             // "Mon"
  focus: string;           // session topic
  note: string;            // freeform session note
  outcomeLabel: OutcomeLabel;
  outcomeColor: string;
  outcomeBg: string;
  delta: string;           // sim score change e.g. "+4 pts" or "—"
  deltaColor: string;
}

// ── Full SE profile (right panel) ────────────────────────
export interface SEProfile {
  // Identity
  id: string;              // e.g. "DS", "GH" — used as queue key
  name: string;
  email: string;           // IMPORTANT: populate for mailto to work
  initials: string;
  level: string;           // "Basic SE" | "Senior SE" | "Advisory SE"
  day: number;             // day of ramp program

  // Visuals
  avatarBg: string;        // CSS gradient string

  // Health
  healthLabel: HealthStatus;
  healthColor: string;
  healthBg: string;

  // Last 1:1
  lastLabel: string;       // "Jul 5" or "Never"
  lastColor: string;

  // Sim data
  simAvg: string;
  simColor: string;
  simScores: number[];     // last 5 session scores, oldest first
  trendLabel: string;      // "↑10 pts" | "↓23 pts"
  trendColor: string;
  trendBg: string;
  trendDesc: string;       // one-line trend narrative

  // Ramp
  ramp: string;            // "62%" — percentage of ramp complete
  rampColor: string;

  // Overdue
  overdue: string;         // "4 items" or "0"
  overdueColor: string;

  // Sparkline (computed from simScores — see utils/sparkline.ts)
  sparkPts: string;        // SVG polyline points string
  sparkArea: string;       // SVG path d string for area fill
  sparkDots: { x: number; y: number }[];
  sparkColor: string;
  sparkFill: string;
  thresholdY: number;      // Y pixel position of score=70 threshold line

  // Content
  briefDate: string;       // "Generated Jul 13"
  skills: CompetencySkill[];
  brief: BriefPoint[];
  history: CoachingHistoryEntry[];
  hasHistory: boolean;
  noHistory: boolean;

  // Quick actions (bottom bar)
  actions: ActionButton[];
}

// ── Bottom action bar button ──────────────────────────────
export interface ActionButton {
  label: string;
  bg: string;
  color: string;
  border: string;
  fn: () => void;
}

// ── Left panel queue entry ────────────────────────────────
export interface QueueEntry {
  key: string;
  name: string;
  initials: string;
  level: string;
  day: number;
  avatarBg: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  bgColor: string;
  signal: string;          // one-line urgency summary
  lastLabel: string;
  lastColor: string;
  simLabel: string;        // "82 ↑"
  simColor: string;
  ramp: string;
  rampColor: string;
  selected: boolean;
  onSelect: () => void;
}

// ── Saved coaching note (from localStorage or API) ────────
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
  createdAt?: string;      // ISO timestamp
}

// ── Page-level state ──────────────────────────────────────
export interface CoachingCadenceState {
  selectedKey: string;
  toast: { msg: string; color: string } | null;
  noteModal: boolean;
  notes: Record<string, SavedNote[]>;
}

// ── API response shapes ───────────────────────────────────
export interface CoachingNotesResponse {
  seId: string;
  notes: SavedNote[];
}

export interface GateSignOffRequest {
  gateId: string;
  seId: string;
  managerId: string;
  status: 'approved' | 'rejected';
}

export interface SimAssignmentRequest {
  seId: string;
  simId: string;
  simName: string;
  assignedBy: string;
  dueDate?: string;        // ISO date string
}
