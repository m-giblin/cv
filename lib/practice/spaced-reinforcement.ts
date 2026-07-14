import type { CoachingCard } from "@/lib/types";

const REINFORCEMENT_DAYS = [30, 60, 90] as const;

export type SpacedReinforcementItem = {
  competency: string;
  daysSince: number;
  intervalDays: number;
  label: string;
  href: string;
};

export function getSpacedReinforcementItems(cards: CoachingCard[]): SpacedReinforcementItem[] {
  const now = Date.now();
  const byCompetency = new Map<string, { lastGapAt: number; count: number }>();

  for (const card of cards) {
    const cardTime = new Date(card.sentToManagerAt).getTime();
    for (const gap of card.gaps) {
      const key = gap.trim();
      if (!key) continue;
      const existing = byCompetency.get(key);
      if (!existing || cardTime > existing.lastGapAt) {
        byCompetency.set(key, {
          lastGapAt: cardTime,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
  }

  const items: SpacedReinforcementItem[] = [];

  for (const [competency, meta] of byCompetency) {
    const daysSince = Math.floor((now - meta.lastGapAt) / (1000 * 60 * 60 * 24));
    const interval = REINFORCEMENT_DAYS.find((d) => daysSince >= d);
    if (!interval) continue;

    items.push({
      competency,
      daysSince,
      intervalDays: interval,
      label: `${daysSince} days since last signal — ${interval}-day reinforcement`,
      href: `/simulations?focus=simulation&reinforce=${encodeURIComponent(competency)}`,
    });
  }

  return items.sort((a, b) => b.daysSince - a.daysSince);
}
