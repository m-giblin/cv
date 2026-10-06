import type { PlanStepType } from "@/lib/types";

/**
 * v3 palette for the plan calendar, expressed as CSS custom properties so the theme tokens in
 * app/globals.css stay the single source of truth. Plan bars are blue; step types are told apart
 * by fill (solid blue / white with a blue edge / blue-soft / white with a warm edge) plus their
 * text label, never colour alone. Gates are solid blue and always labelled "Gate".
 */
const C = {
  blue: "var(--color-blue)",
  blueSoft: "var(--color-blue-soft)",
  signal: "var(--color-signal)",
  surface: "var(--color-surface)",
  lineStrong: "var(--color-line-strong)",
  divider: "var(--color-divider)",
  ink: "var(--color-ink)",
  ink2: "var(--color-ink-2)",
  muted: "var(--color-muted)",
  white: "var(--color-surface)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  dangerSoft: "var(--color-danger-soft)",
  signalSoft: "var(--color-signal-soft)",
} as const;

export const BAR_COLORS = {
  content: C.blue,
  challenge: C.surface,
  sim: C.blueSoft,
  mentor: C.surface,
  gate: C.blue,
} as const;

export type BarStyle = {
  /** Bar / chip fill. */
  fill: string;
  /** 1px outline so light fills still read on white. */
  border: string;
  /** Label colour on the fill. */
  text: string;
  /** Progress strip colour drawn along the bottom of an incomplete bar. */
  progress: string;
};

/** Full render recipe for each Gantt bar type, keyed like BAR_COLORS. */
export const BAR_STYLES: Record<keyof typeof BAR_COLORS, BarStyle> = {
  content: { fill: C.blue, border: C.blue, text: C.white, progress: C.signal },
  challenge: { fill: C.surface, border: C.blue, text: C.blue, progress: C.blue },
  sim: { fill: C.blueSoft, border: C.blue, text: C.ink, progress: C.blue },
  mentor: { fill: C.surface, border: C.lineStrong, text: C.ink, progress: C.ink2 },
  gate: { fill: C.blue, border: C.blue, text: C.white, progress: C.signal },
};

/** [complete fill, progress colour] per bar colour. Kept for API compatibility; prefer BAR_STYLES. */
export const BAR_RGBA: Record<string, [string, string]> = {
  [C.blue]: [C.blue, C.signal],
  [C.surface]: [C.surface, C.blue],
  [C.blueSoft]: [C.blueSoft, C.blue],
};

export type StepTypeStyle = {
  barColor: string;
  borderColor: string;
  tagBg: string;
  tagColor: string;
  label: string;
  ganttType: keyof typeof BAR_COLORS;
};

const STYLES: Record<string, StepTypeStyle> = {
  content_review: {
    barColor: BAR_COLORS.content,
    borderColor: C.blue,
    tagBg: C.blueSoft,
    tagColor: C.blue,
    label: "Content",
    ganttType: "content",
  },
  challenge: {
    barColor: BAR_COLORS.challenge,
    borderColor: C.blue,
    tagBg: C.divider,
    tagColor: C.ink2,
    label: "Challenge",
    ganttType: "challenge",
  },
  simulation: {
    barColor: BAR_COLORS.sim,
    borderColor: C.blue,
    tagBg: C.blueSoft,
    tagColor: C.blue,
    label: "Simulation",
    ganttType: "sim",
  },
  deal_prep: {
    barColor: BAR_COLORS.challenge,
    borderColor: C.blue,
    tagBg: C.divider,
    tagColor: C.ink2,
    label: "Deal prep",
    ganttType: "challenge",
  },
  mentor_review: {
    barColor: BAR_COLORS.mentor,
    borderColor: C.lineStrong,
    tagBg: C.divider,
    tagColor: C.ink2,
    label: "Mentor",
    ganttType: "mentor",
  },
  shadow_meeting_log: {
    barColor: C.divider,
    borderColor: C.lineStrong,
    tagBg: C.divider,
    tagColor: C.ink2,
    label: "Shadow",
    ganttType: "content",
  },
  custom: {
    barColor: BAR_COLORS.content,
    borderColor: C.blue,
    tagBg: C.blueSoft,
    tagColor: C.blue,
    label: "Custom",
    ganttType: "content",
  },
};

export function stepTypeStyle(type: PlanStepType): StepTypeStyle {
  return STYLES[type] ?? STYLES.custom;
}

/** Gate marker colour (solid blue, always labelled "Gate"). Name kept for API compatibility. */
export const GATE_DIAMOND_COLOR = BAR_COLORS.gate;

export const SEGMENT_BANDS = [
  { label: "Segment 1, days 1 to 30", bizStart: 1, bizEnd: 30, color: C.blue },
  { label: "Segment 2, days 31 to 60", bizStart: 31, bizEnd: 60, color: C.blue },
  { label: "Segment 3, days 61 to 90", bizStart: 61, bizEnd: 90, color: C.blue },
] as const;

/** `diamond` is kept for API compatibility; gates now render as a labelled blue block. */
export const CALENDAR_LEGEND = [
  { label: "Content", color: BAR_COLORS.content, border: BAR_STYLES.content.border, diamond: false },
  { label: "Challenge", color: BAR_COLORS.challenge, border: BAR_STYLES.challenge.border, diamond: false },
  { label: "Simulation", color: BAR_COLORS.sim, border: BAR_STYLES.sim.border, diamond: false },
  { label: "Mentor", color: BAR_COLORS.mentor, border: BAR_STYLES.mentor.border, diamond: false },
  { label: "Gate", color: BAR_COLORS.gate, border: BAR_STYLES.gate.border, diamond: false },
] as const;

/**
 * Conflict severities on the v3 status colours. Render with StatusPill (dot + word); `symbol` is
 * kept for API compatibility and is empty so no glyph is used as status.
 */
export const CONFLICT_SEV_STYLES = {
  critical: {
    iconBg: C.dangerSoft,
    color: C.danger,
    ctaBg: C.dangerSoft,
    ctaColor: C.danger,
    label: "Critical",
    tone: "danger",
    symbol: "",
  },
  warning: {
    iconBg: C.signalSoft,
    color: C.warning,
    ctaBg: C.signalSoft,
    ctaColor: C.warning,
    label: "Warning",
    tone: "warning",
    symbol: "",
  },
  info: {
    iconBg: C.blueSoft,
    color: C.blue,
    ctaBg: C.blueSoft,
    ctaColor: C.blue,
    label: "Info",
    tone: "blue",
    symbol: "",
  },
} as const;
