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

/**
 * Accent bar colour for a template card. Kept under its historical name for
 * callers; v2 has no gradients or per-track accents, so this is a solid
 * colour: blue for most tracks, ink for senior tracks.
 */
export function templateAccentGradient(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("senior")) {
    return "#0A1A3F";
  }
  return "#0033A1";
}

const STEP_TYPE_PILL: Record<string, { label: string; bg: string; color: string }> = {
  content_review: { label: "Content", bg: "#E5ECFA", color: "#0033A1" },
  challenge: { label: "Challenge", bg: "#0A1A3F", color: "#FFFFFF" },
  simulation: { label: "Sim", bg: "#0033A1", color: "#FFFFFF" },
  deal_prep: { label: "Deal prep", bg: "#FFF6E0", color: "#0A1A3F" },
  shadow_meeting_log: { label: "Shadow", bg: "#E9EDF5", color: "#2B3A5C" },
  mentor_review: { label: "Review", bg: "#E7F4EC", color: "#12703F" },
  custom: { label: "Custom", bg: "#E9EDF5", color: "#4A5878" },
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
    content_review: { icon: "≡", iconBg: "#E5ECFA" },
    challenge: { icon: "▲", iconBg: "#E9EDF5" },
    simulation: { icon: "●", iconBg: "#E5ECFA" },
    deal_prep: { icon: "◆", iconBg: "#FFF6E0" },
    mentor_review: { icon: "✓", iconBg: "#E7F4EC" },
    shadow_meeting_log: { icon: "○", iconBg: "#E9EDF5" },
    custom: { icon: "•", iconBg: "#F2F4F8" },
  };
  return map[type] ?? map.custom;
}
