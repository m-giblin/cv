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
  return progress >= 70 ? "#0A6E45" : progress >= 40 ? "#0071CE" : "#D4810A";
}

export function goalTagStyle(tag: GoalTag): { bg: string; color: string } {
  switch (tag) {
    case "ON TRACK":
      return { bg: "rgba(10,110,69,.08)", color: "#0A6E45" };
    case "IN PROGRESS":
      return { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
    case "AT RISK":
      return { bg: "rgba(212,129,10,.08)", color: "#D4810A" };
    case "NOT STARTED":
      return { bg: "#F5F4F0", color: "#A09D98" };
    case "AI CHALLENGE":
      return { bg: "rgba(204,39,176,.08)", color: "#CC27B0" };
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
      return { bg: "#F0F7FF", border: "rgba(0,113,206,.2)", labelColor: "#0071CE" };
    case "done":
      return { bg: "#F5FDF9", border: "rgba(10,110,69,.15)", labelColor: "#0A6E45" };
    case "action":
      return { bg: "#fff", border: "#F0EFEB", labelColor: "#D4810A" };
    case "upcoming":
      return { bg: "#fff", border: "#F0EFEB", labelColor: "#A09D98" };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
