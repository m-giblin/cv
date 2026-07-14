// ============================================================
// utils/signals.ts — Compute AI data signals from SE profile
// ============================================================
// Call this server-side when building the SE dev plan profile.
// Each signal becomes one card in the FullPlanDrawer grid.
// ============================================================
import type { AISignal } from '../types/devPlans';

export interface RawSEData {
  day: number;
  simScores: number[];        // last 5, oldest first
  certCount: number;
  certTotal: number;
  rampPercent: number;
  expectedRampPercent: number; // based on day of program
  coachingSessions: number;
  lastCoachingDate: string | null;
  gateStatus: 'blocked' | 'pending' | 'approved';
  gateDaysBlocked?: number;
  overdueMilestones: number;
  competencies: Record<string, number>; // name -> score 0-100
  careerGoal?: string;
}

export function computeSignals(data: RawSEData): AISignal[] {
  const signals: AISignal[] = [];

  // Sim trend
  const first = data.simScores[0];
  const last = data.simScores[data.simScores.length - 1];
  const delta = last - first;
  const simColor = delta >= 0 ? '#0A6E45' : delta >= -10 ? '#D4810A' : '#B83128';
  signals.push({
    icon: delta >= 0 ? '📈' : '📉',
    label: 'Sim trend',
    value: `${first}→${last} (${delta >= 0 ? '+' : ''}${delta} pts)`,
    color: simColor,
    detail: delta >= 5 ? 'Consistent improvement — ready for harder scenarios'
          : delta >= -5 ? 'Plateau — consider changing sim difficulty or type'
          : 'Declining trend — coaching intervention recommended',
  });

  // Gate status
  if (data.gateStatus === 'blocked') {
    signals.push({
      icon: '🚧',
      label: 'Gate status',
      value: `Gate blocked ${data.gateDaysBlocked || 0} days`,
      color: '#B83128',
      detail: 'Cannot advance to next phase until manager signs off',
    });
  }

  // Coaching
  const coachingColor = data.coachingSessions === 0 ? '#B83128' : data.coachingSessions < 3 ? '#D4810A' : '#0A6E45';
  signals.push({
    icon: '🗓️',
    label: 'Coaching history',
    value: data.coachingSessions === 0 ? 'Zero 1:1s' : `${data.coachingSessions} sessions`,
    color: coachingColor,
    detail: data.coachingSessions === 0
      ? `Day ${data.day} with no coaching touchpoints recorded`
      : `Last session: ${data.lastCoachingDate || 'unknown'}`,
  });

  // Worst competency
  const compEntries = Object.entries(data.competencies);
  if (compEntries.length) {
    const [worstName, worstScore] = compEntries.sort((a, b) => a[1] - b[1])[0];
    const [bestName, bestScore] = compEntries.sort((a, b) => b[1] - a[1])[0];
    const compColor = worstScore < 50 ? '#B83128' : worstScore < 65 ? '#D4810A' : '#0071CE';
    signals.push({ icon: '🎯', label: worstName, value: `${worstScore} / 100`, color: compColor, detail: 'Lowest competency score — highest priority for development' });
    signals.push({ icon: '✅', label: bestName, value: `${bestScore} / 100`, color: '#0A6E45', detail: 'Strongest competency — foundation for specialist track' });
  }

  // Certs
  const certColor = data.certCount === 0 ? '#B83128' : data.certCount < 3 ? '#D4810A' : '#0A6E45';
  signals.push({
    icon: '🏆',
    label: 'Certifications',
    value: `${data.certCount} of ${data.certTotal}`,
    color: certColor,
    detail: data.certCount === 0 ? 'No certs started' : `${data.certTotal - data.certCount} remaining`,
  });

  // Ramp
  const rampDelta = data.rampPercent - data.expectedRampPercent;
  const rampColor = rampDelta >= 0 ? '#0A6E45' : rampDelta >= -10 ? '#D4810A' : '#B83128';
  signals.push({
    icon: '📋',
    label: 'Ramp progress',
    value: `${data.rampPercent}%`,
    color: rampColor,
    detail: rampDelta >= 0
      ? `Ahead of pace for Day ${data.day}`
      : `Behind pace (expected ${data.expectedRampPercent}% by Day ${data.day})`,
  });

  // Career goal (if set)
  if (data.careerGoal) {
    signals.push({ icon: '🎯', label: 'Career goal', value: data.careerGoal, color: '#6B2D82', detail: 'AI projects readiness by Q4 if current pace continues' });
  }

  return signals.slice(0, 6); // cap at 6 for the 2-col grid
}

// ── Build the AI reasoning string ─────────────────────────
// Use this to generate the one-line data summary shown in the drawer header.
export function buildAIReasoning(data: RawSEData, name: string): string {
  const simFirst = data.simScores[0];
  const simLast = data.simScores[data.simScores.length - 1];
  const delta = simLast - simFirst;
  const parts = [
    `Day ${data.day}`,
    `Sim avg ${simLast} (${delta >= 0 ? '+' : ''}${delta} pts, ${data.simScores.length} sessions)`,
    data.gateStatus === 'blocked' ? `Gate blocked ${data.gateDaysBlocked} days` : null,
    data.coachingSessions === 0 ? '0 coaching sessions' : null,
    `Ramp ${data.rampPercent}% (expected ${data.expectedRampPercent}%)`,
    `${data.certCount} of ${data.certTotal} certs`,
    `${data.overdueMilestones} overdue milestones`,
  ].filter(Boolean);
  return parts.join(' · ');
}
