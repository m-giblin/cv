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
    return "var(--color-ink)";
  }
  return "var(--color-blue)";
}

const STEP_TYPE_PILL: Record<string, { label: string; bg: string; color: string }> = {
  content_review: { label: "Content", bg: "var(--color-blue-soft)", color: "var(--color-blue)" },
  challenge: { label: "Challenge", bg: "var(--color-ink)", color: "#fff" },
  simulation: { label: "Sim", bg: "var(--color-blue)", color: "#fff" },
  deal_prep: { label: "Deal prep", bg: "var(--color-signal-soft)", color: "var(--color-ink)" },
  shadow_meeting_log: { label: "Shadow", bg: "var(--color-divider)", color: "var(--color-ink-2)" },
  mentor_review: { label: "Review", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  knowledge_check: { label: "Check", bg: "var(--color-blue-soft)", color: "var(--color-blue)" },
  playbook: { label: "Playbook", bg: "var(--color-blue-soft)", color: "var(--color-blue)" },
  custom: { label: "Custom", bg: "var(--color-divider)", color: "var(--color-muted)" },
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
    content_review: { icon: "≡", iconBg: "var(--color-blue-soft)" },
    challenge: { icon: "▲", iconBg: "var(--color-divider)" },
    simulation: { icon: "●", iconBg: "var(--color-blue-soft)" },
    deal_prep: { icon: "◆", iconBg: "var(--color-signal-soft)" },
    mentor_review: { icon: "✓", iconBg: "var(--color-success-soft)" },
    shadow_meeting_log: { icon: "○", iconBg: "var(--color-divider)" },
    knowledge_check: { icon: "?", iconBg: "var(--color-blue-soft)" },
    playbook: { icon: "≡", iconBg: "var(--color-blue-soft)" },
    custom: { icon: "•", iconBg: "var(--color-bg)" },
  };
  return map[type] ?? map.custom;
}
