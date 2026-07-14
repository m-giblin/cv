/** Display order for standard onboarding ramp templates. */
export const TEMPLATE_SORT_ORDER: Record<string, number> = {
  "Week 1–2 — Boots on the ground": 1,
  "Week 2–3 — First steps": 2,
  "Week 3–4 — Second step": 3,
  "Week 5–6 — Third step": 4,
  "Week 7–8 — Fourth step": 5,
  "First week — new SE": 6,
  "Week 2 — building depth": 7,
  "Week 3 — customer ready": 8,
  "Week 4 — first customer motions": 9,
  "60-day ramp check-in": 10,
  "90-day SE readiness": 11,
  "120-Day Mastery — Days 1–30 (Foundation)": 20,
  "120-Day Mastery — Days 31–60 (Field Ready)": 21,
  "120-Day Mastery — Days 61–90 (Advanced)": 22,
  "120-Day Mastery — Days 91–120 (Advisory)": 23,
};

export function sortPlanTemplates<T extends { name: string }>(templates: T[]): T[] {
  return [...templates].sort((a, b) => {
    const aOrder = TEMPLATE_SORT_ORDER[a.name] ?? 99;
    const bOrder = TEMPLATE_SORT_ORDER[b.name] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}

export function templateDurationDays(steps: { metadata?: unknown }[]): number {
  let max = 7;
  for (const step of steps) {
    const meta = step.metadata as { dueOffsetDays?: number } | null | undefined;
    if (typeof meta?.dueOffsetDays === "number") {
      max = Math.max(max, meta.dueOffsetDays);
    }
  }
  return max;
}

export function templateDurationLabel(days: number): string {
  if (days <= 7) return "Week 1";
  if (days <= 14) return "Week 2";
  if (days <= 21) return "Week 3";
  if (days <= 28) return "Week 4";
  if (days <= 60) return "60 days";
  if (days <= 90) return "90 days";
  return `${days} days`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function stepTypeSummary(steps: { step_type: string }[]): string {
  const counts = steps.reduce<Record<string, number>>((acc, step) => {
    acc[step.step_type] = (acc[step.step_type] ?? 0) + 1;
    return acc;
  }, {});

  const labels: string[] = [];
  if (counts.content_review) labels.push(`${counts.content_review} content`);
  if (counts.challenge) labels.push(`${counts.challenge} challenge${counts.challenge > 1 ? "s" : ""}`);
  if (counts.simulation) labels.push(`${counts.simulation} sim${counts.simulation > 1 ? "s" : ""}`);
  if (counts.deal_prep) labels.push(`${counts.deal_prep} deal prep`);
  if (counts.shadow_meeting_log) labels.push(`${counts.shadow_meeting_log} shadow`);
  if (counts.mentor_review) labels.push(`${counts.mentor_review} mentor`);

  return labels.join(" · ") || `${steps.length} steps`;
}
