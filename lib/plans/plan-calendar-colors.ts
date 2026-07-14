import type { PlanStepType } from "@/lib/types";

export const BAR_COLORS = {
  content: "#0071CE",
  challenge: "#D4810A",
  sim: "#CC27B0",
  mentor: "#0A6E45",
  gate: "#00143A",
} as const;

export const BAR_RGBA: Record<string, [string, string]> = {
  "#0071CE": ["rgba(0,113,206,.88)", "rgba(0,113,206,.28)"],
  "#D4810A": ["rgba(212,129,10,.88)", "rgba(212,129,10,.28)"],
  "#CC27B0": ["rgba(204,39,176,.88)", "rgba(204,39,176,.28)"],
  "#0A6E45": ["rgba(10,110,69,.88)", "rgba(10,110,69,.28)"],
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
    borderColor: "#0057a8",
    tagBg: "#EEF4FF",
    tagColor: "#1D4ED8",
    label: "Content",
    ganttType: "content",
  },
  challenge: {
    barColor: BAR_COLORS.challenge,
    borderColor: "#b45309",
    tagBg: "#FFFBF0",
    tagColor: "#D4810A",
    label: "Challenge",
    ganttType: "challenge",
  },
  simulation: {
    barColor: BAR_COLORS.sim,
    borderColor: "#A51E8E",
    tagBg: "#FDF0FA",
    tagColor: "#CC27B0",
    label: "Simulation",
    ganttType: "sim",
  },
  deal_prep: {
    barColor: BAR_COLORS.challenge,
    borderColor: "#b45309",
    tagBg: "#FEF3C7",
    tagColor: "#b45309",
    label: "Deal prep",
    ganttType: "challenge",
  },
  mentor_review: {
    barColor: BAR_COLORS.mentor,
    borderColor: "#0A6E45",
    tagBg: "#EDFAF3",
    tagColor: "#0A6E45",
    label: "Mentor",
    ganttType: "mentor",
  },
  shadow_meeting_log: {
    barColor: "#6B6860",
    borderColor: "#6B6860",
    tagBg: "#F5F4F0",
    tagColor: "#6B6860",
    label: "Shadow",
    ganttType: "content",
  },
  custom: {
    barColor: BAR_COLORS.content,
    borderColor: "#0071CE",
    tagBg: "#EEF4FF",
    tagColor: "#0071CE",
    label: "Custom",
    ganttType: "content",
  },
};

export function stepTypeStyle(type: PlanStepType): StepTypeStyle {
  return STYLES[type] ?? STYLES.custom;
}

export const GATE_DIAMOND_COLOR = BAR_COLORS.gate;

export const SEGMENT_BANDS = [
  { label: "SEG 1 · Days 1–30", bizStart: 1, bizEnd: 30, color: "#0057a8" },
  { label: "SEG 2 · Days 31–60", bizStart: 31, bizEnd: 60, color: "#A51E8E" },
  { label: "SEG 3 · Days 61–90", bizStart: 61, bizEnd: 90, color: "#0A6E45" },
] as const;

export const CALENDAR_LEGEND = [
  { label: "Content", color: BAR_COLORS.content, diamond: false },
  { label: "Challenge", color: BAR_COLORS.challenge, diamond: false },
  { label: "Simulation", color: BAR_COLORS.sim, diamond: false },
  { label: "Mentor", color: BAR_COLORS.mentor, diamond: false },
  { label: "Gate", color: BAR_COLORS.gate, diamond: true },
] as const;

export const CONFLICT_SEV_STYLES = {
  critical: {
    iconBg: "rgba(184,49,40,.25)",
    color: "#FF6B6B",
    ctaBg: "rgba(184,49,40,.25)",
    ctaColor: "#FF8080",
    label: "CRITICAL",
  },
  warning: {
    iconBg: "rgba(212,129,10,.25)",
    color: "#FFB347",
    ctaBg: "rgba(212,129,10,.2)",
    ctaColor: "#FFB347",
    label: "WARNING",
  },
  info: {
    iconBg: "rgba(0,113,206,.2)",
    color: "#5BB3FF",
    ctaBg: "rgba(0,113,206,.15)",
    ctaColor: "#5BB3FF",
    label: "INFO",
  },
} as const;
