// ============================================================
// utils/goalBuilder.ts — Build goal cards from approved plan
// ============================================================
import type { GoalCard, Milestone, GoalTag } from '../types/devPlans';

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
  const tag: GoalTag = tagOverride ?? (
    progress >= 70 ? 'ON TRACK' :
    progress >= 40 ? 'IN PROGRESS' :
    progress > 0  ? 'AT RISK' : 'NOT STARTED'
  );
  return {
    ...opts,
    overdue,
    tag,
    isNewContent: opts.isNewContent ?? false,
    newContentNote: opts.newContentNote ?? '',
    milestones: opts.milestones.map(m => ({ ...m, isCalendar: m.isCalendar ?? true })),
  };
}

// Color helpers — use these for inline styles
export function goalProgressColor(progress: number): string {
  return progress >= 70 ? '#0A6E45' : progress >= 40 ? '#0071CE' : '#D4810A';
}

export function goalTagStyle(tag: GoalTag): { bg: string; color: string } {
  switch (tag) {
    case 'ON TRACK':    return { bg: 'rgba(10,110,69,.08)',  color: '#0A6E45' };
    case 'IN PROGRESS': return { bg: 'rgba(0,113,206,.08)',  color: '#0071CE' };
    case 'AT RISK':     return { bg: 'rgba(212,129,10,.08)', color: '#D4810A' };
    case 'NOT STARTED': return { bg: '#F5F4F0',              color: '#A09D98' };
    case 'AI CHALLENGE':return { bg: 'rgba(204,39,176,.08)', color: '#CC27B0' };
  }
}
