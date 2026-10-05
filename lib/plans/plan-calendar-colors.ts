import type { PlanStepType } from "@/lib/types";

/**
 * v2 palette for the plan calendar. Step types are no longer a rainbow: they are told apart by
 * fill (blue / ink / blue-soft / signal-soft / surface-2) plus their text label, never colour alone.
 */
export const BAR_COLORS = {
  content: "#0033A1", // blue
  challenge: "#0A1A3F", // ink
  sim: "#E5ECFA", // blue-soft
  mentor: "#FFF6E0", // signal-soft
  gate: "#0A1A3F", // ink
} as const;

export type BarStyle = {
  /** Bar / chip fill. */
  fill: string;
  /** 1.5px outline so light fills still read on white. */
  border: string;
  /** Label colour on the fill. */
  text: string;
  /** Progress strip colour drawn along the bottom of an incomplete bar. */
  progress: string;
};

/** Full render recipe for each Gantt bar type, keyed like BAR_COLORS. */
export const BAR_STYLES: Record<keyof typeof BAR_COLORS, BarStyle> = {
  content: { fill: "#0033A1", border: "#0033A1", text: "#FFFFFF", progress: "#FFB81C" },
  challenge: { fill: "#0A1A3F", border: "#0A1A3F", text: "#FFFFFF", progress: "#FFB81C" },
  sim: { fill: "#E5ECFA", border: "#0033A1", text: "#0A1A3F", progress: "#0033A1" },
  mentor: { fill: "#FFF6E0", border: "#0A1A3F", text: "#0A1A3F", progress: "#0A1A3F" },
  gate: { fill: "#0A1A3F", border: "#0A1A3F", text: "#0A1A3F", progress: "#0A1A3F" },
};

/** [complete fill, progress colour] per bar colour. Kept for API compatibility; prefer BAR_STYLES. */
export const BAR_RGBA: Record<string, [string, string]> = {
  "#0033A1": ["#0033A1", "#FFB81C"],
  "#0A1A3F": ["#0A1A3F", "#FFB81C"],
  "#E5ECFA": ["#E5ECFA", "#0033A1"],
  "#FFF6E0": ["#FFF6E0", "#0A1A3F"],
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
    borderColor: "#0033A1",
    tagBg: "#E5ECFA",
    tagColor: "#0033A1",
    label: "Content",
    ganttType: "content",
  },
  challenge: {
    barColor: BAR_COLORS.challenge,
    borderColor: "#0A1A3F",
    tagBg: "#E9EDF5",
    tagColor: "#0A1A3F",
    label: "Challenge",
    ganttType: "challenge",
  },
  simulation: {
    barColor: BAR_COLORS.sim,
    borderColor: "#0033A1",
    tagBg: "#E5ECFA",
    tagColor: "#0033A1",
    label: "Simulation",
    ganttType: "sim",
  },
  deal_prep: {
    barColor: BAR_COLORS.challenge,
    borderColor: "#0A1A3F",
    tagBg: "#E9EDF5",
    tagColor: "#2B3A5C",
    label: "Deal prep",
    ganttType: "challenge",
  },
  mentor_review: {
    barColor: BAR_COLORS.mentor,
    borderColor: "#0A1A3F",
    tagBg: "#FFF6E0",
    tagColor: "#0A1A3F",
    label: "Mentor",
    ganttType: "mentor",
  },
  shadow_meeting_log: {
    barColor: "#E9EDF5",
    borderColor: "#B7C0D3",
    tagBg: "#E9EDF5",
    tagColor: "#2B3A5C",
    label: "Shadow",
    ganttType: "content",
  },
  custom: {
    barColor: BAR_COLORS.content,
    borderColor: "#0033A1",
    tagBg: "#E5ECFA",
    tagColor: "#0033A1",
    label: "Custom",
    ganttType: "content",
  },
};

export function stepTypeStyle(type: PlanStepType): StepTypeStyle {
  return STYLES[type] ?? STYLES.custom;
}

export const GATE_DIAMOND_COLOR = BAR_COLORS.gate;

export const SEGMENT_BANDS = [
  { label: "SEG 1 · Days 1–30", bizStart: 1, bizEnd: 30, color: "#2B3A5C" },
  { label: "SEG 2 · Days 31–60", bizStart: 31, bizEnd: 60, color: "#2B3A5C" },
  { label: "SEG 3 · Days 61–90", bizStart: 61, bizEnd: 90, color: "#2B3A5C" },
] as const;

export const CALENDAR_LEGEND = [
  { label: "Content", color: BAR_COLORS.content, border: BAR_STYLES.content.border, diamond: false },
  { label: "Challenge", color: BAR_COLORS.challenge, border: BAR_STYLES.challenge.border, diamond: false },
  { label: "Simulation", color: BAR_COLORS.sim, border: BAR_STYLES.sim.border, diamond: false },
  { label: "Mentor", color: BAR_COLORS.mentor, border: BAR_STYLES.mentor.border, diamond: false },
  { label: "Gate", color: BAR_COLORS.gate, border: BAR_STYLES.gate.border, diamond: true },
] as const;

/** Conflict severities: v2 status colours, always paired with a symbol and the label text. */
export const CONFLICT_SEV_STYLES = {
  critical: {
    iconBg: "#FCEBEA",
    color: "#B42318",
    ctaBg: "#FCEBEA",
    ctaColor: "#B42318",
    label: "CRITICAL",
    tone: "danger",
    symbol: "▲",
  },
  warning: {
    iconBg: "#FBF1DF",
    color: "#8A5300",
    ctaBg: "#FBF1DF",
    ctaColor: "#8A5300",
    label: "WARNING",
    tone: "warning",
    symbol: "●",
  },
  info: {
    iconBg: "#E5ECFA",
    color: "#0033A1",
    ctaBg: "#E5ECFA",
    ctaColor: "#0033A1",
    label: "INFO",
    tone: "blue",
    symbol: "•",
  },
} as const;
