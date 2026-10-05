import type { GoalCard, GoalTag, QuarterSummary } from "../types";

export function buildGoalCard(opts: {
  icon: string;
  title: string;
  quarter: string;
  source: string;
  progress: number;
  dueDate: string;
  overdue?: boolean;
  milestones: Array<{ label: string; date: string; done: boolean; isCalendar?: boolean }>;
  isNewContent?: boolean;
  newContentNote?: string;
  tagOverride?: GoalTag;
}): GoalCard {
  const { progress, overdue = false, tagOverride } = opts;
  const tag: GoalTag =
    tagOverride ??
    (progress >= 70 ? "ON TRACK" : progress >= 40 ? "IN PROGRESS" : progress > 0 ? "AT RISK" : "NOT STARTED");
  return {
    ...opts,
    overdue,
    tag,
    isNewContent: opts.isNewContent ?? false,
    newContentNote: opts.newContentNote ?? "",
    milestones: opts.milestones.map((m) => ({ ...m, isCalendar: m.isCalendar ?? true })),
  };
}

export function goalProgressColor(progress: number): string {
  return progress >= 70 ? "#12703F" : progress >= 40 ? "#0033A1" : "#8A5300";
}

export function goalTagStyle(tag: GoalTag): { bg: string; color: string } {
  switch (tag) {
    case "ON TRACK":
      return { bg: "#E7F4EC", color: "#12703F" };
    case "IN PROGRESS":
      return { bg: "#E5ECFA", color: "#0033A1" };
    case "AT RISK":
      return { bg: "#FBF1DF", color: "#8A5300" };
    case "NOT STARTED":
      return { bg: "#E9EDF5", color: "#4A5878" };
    case "AI CHALLENGE":
      return { bg: "#E5ECFA", color: "#0033A1" };
    default: {
      const _exhaustive: never = tag;
      return _exhaustive;
    }
  }
}

export function quarterStyle(state: QuarterSummary["state"]): {
  bg: string;
  border: string;
  labelColor: string;
} {
  switch (state) {
    case "current":
      return { bg: "#E5ECFA", border: "#3A62C0", labelColor: "#0033A1" };
    case "done":
      return { bg: "#E7F4EC", border: "#D6DCE8", labelColor: "#12703F" };
    case "action":
      return { bg: "#FFFFFF", border: "#D6DCE8", labelColor: "#8A5300" };
    case "upcoming":
      return { bg: "#FFFFFF", border: "#D6DCE8", labelColor: "#4A5878" };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
