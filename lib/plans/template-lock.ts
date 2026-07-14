import type { ProfileRole } from "@/lib/types";

const LOCKED_NAME_PATTERNS = [
  /^week \d/i,
  /^first week/i,
  /^60-day/i,
  /^90-day/i,
  /^120-day mastery/i,
];

export function isLockedTemplate(plan: { name: string; is_locked?: boolean | null }): boolean {
  if (plan.is_locked === true) return true;
  if (plan.is_locked === false) return false;
  return LOCKED_NAME_PATTERNS.some((pattern) => pattern.test(plan.name));
}

export function canEditTemplateStructure(role: ProfileRole, locked: boolean): boolean {
  if (!locked) return true;
  return role === "admin" || role === "super_admin" || role === "director";
}

export function templateAccentGradient(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ae") || lower.includes("account exec")) {
    return "linear-gradient(90deg,#9d174d,#be185d)";
  }
  if (lower.includes("sled") || lower.includes("specialist")) {
    return "linear-gradient(90deg,#065f46,#059669)";
  }
  if (lower.includes("lateral") || lower.includes("fast-track")) {
    return "linear-gradient(90deg,#92400e,#b45309)";
  }
  if (lower.includes("senior")) {
    return "linear-gradient(90deg,#5b21b6,#7c3aed)";
  }
  return "linear-gradient(90deg,#0033a1,#0071ce)";
}

const STEP_TYPE_PILL: Record<string, { label: string; bg: string; color: string }> = {
  content_review: { label: "Content", bg: "#EEF4FF", color: "#1D4ED8" },
  challenge: { label: "Challenge", bg: "#EDE9FE", color: "#5b21b6" },
  simulation: { label: "Sim", bg: "#FDF0FA", color: "#A51E8E" },
  deal_prep: { label: "Deal Prep", bg: "#FEF3C7", color: "#b45309" },
  shadow_meeting_log: { label: "Shadow", bg: "#F5F4F0", color: "#6B6860" },
  mentor_review: { label: "Review", bg: "#EDFAF3", color: "#0A6E45" },
  custom: { label: "Custom", bg: "#F5F4F0", color: "#6B6860" },
};

export function stepTypePills(steps: { step_type: string }[]) {
  const seen = new Set<string>();
  const pills: { label: string; bg: string; color: string }[] = [];
  for (const step of steps) {
    if (seen.has(step.step_type)) continue;
    seen.add(step.step_type);
    const pill = STEP_TYPE_PILL[step.step_type] ?? STEP_TYPE_PILL.custom;
    pills.push(pill);
  }
  return pills;
}

export function stepTypeIcon(type: string): { icon: string; iconBg: string } {
  const map: Record<string, { icon: string; iconBg: string }> = {
    content_review: { icon: "📄", iconBg: "#F0F7FF" },
    challenge: { icon: "🎯", iconBg: "#F5F0FF" },
    simulation: { icon: "🎭", iconBg: "#FDF0FA" },
    deal_prep: { icon: "📊", iconBg: "#FFFBF0" },
    mentor_review: { icon: "✅", iconBg: "#EDFAF3" },
    shadow_meeting_log: { icon: "👁", iconBg: "#F5F4F0" },
    custom: { icon: "⚙️", iconBg: "#F9F8F6" },
  };
  return map[type] ?? map.custom;
}
