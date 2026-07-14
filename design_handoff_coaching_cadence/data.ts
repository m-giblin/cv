// ============================================================
// data.ts — Mock data. Use these shapes for your API responses.
// ============================================================
import type { SEProfile, CoachingHistoryEntry, BriefPoint, CompetencySkill } from './types';

// ── Helpers ───────────────────────────────────────────────

export function computeSkill(name: string, score: number): CompetencySkill {
  const color =
    score >= 75 ? '#0A6E45' :
    score >= 60 ? '#0071CE' :
    score >= 45 ? '#D4810A' : '#B83128';
  const tag =
    score >= 75 ? 'STRONG' :
    score >= 60 ? 'OK' :
    score >= 45 ? 'GAP' : 'CRITICAL';
  const tagBg =
    score >= 75 ? 'rgba(10,110,69,.08)' :
    score >= 60 ? 'rgba(0,113,206,.08)' :
    score >= 45 ? 'rgba(212,129,10,.08)' : 'rgba(184,49,40,.08)';
  return { name, score, color, tag: tag as any, tagBg, tagColor: color, width: score + '%' };
}

export function computeSparkline(scores: number[]) {
  const W = 260, H = 56, pad = 4;
  const min = Math.min(...scores) - 8;
  const max = Math.max(...scores) + 8;
  const range = max - min;
  const pts = scores.map((s, i) => ({
    x: +(pad + (i / (scores.length - 1)) * (W - pad * 2)).toFixed(1),
    y: +(H - pad - ((s - min) / range) * (H - pad * 2)).toFixed(1),
  }));
  return {
    sparkPts: pts.map(p => `${p.x},${p.y}`).join(' '),
    sparkArea: `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`,
    sparkDots: pts,
    thresholdY: +(H - pad - ((70 - min) / range) * (H - pad * 2)).toFixed(1),
  };
}

// ── Mock profiles ─────────────────────────────────────────

const DS_spark = computeSparkline([78, 72, 66, 61, 55]);
const FG_spark = computeSparkline([65, 58, 62, 55, 49]);
const GH_spark = computeSparkline([72, 74, 77, 79, 82]);
const HI_spark = computeSparkline([80, 83, 87, 89, 91]);

export const mockProfiles: Record<string, SEProfile> = {
  DS: {
    id: 'DS', name: 'Demo SE', email: 'demo.se@sailpoint.com',
    initials: 'DS', level: 'Basic SE', day: 22,
    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    healthLabel: 'CRITICAL', healthColor: '#B83128', healthBg: 'rgba(184,49,40,.2)',
    lastLabel: 'Never', lastColor: '#B83128',
    simAvg: '66', simColor: '#B83128', simScores: [78, 72, 66, 61, 55],
    trendLabel: '↓23 pts', trendColor: '#B83128', trendBg: 'rgba(184,49,40,.08)',
    trendDesc: 'Declining across all 5 sessions — requires intervention',
    ramp: '12%', rampColor: '#B83128',
    overdue: '4 items', overdueColor: '#B83128',
    sparkColor: '#B83128', sparkFill: '#B83128',
    ...DS_spark,
    briefDate: 'Generated Jul 13',
    skills: [
      computeSkill('Discovery', 45),
      computeSkill('Demo Execution', 68),
      computeSkill('Objection Handling', 52),
      computeSkill('Competitive Positioning', 38),
      computeSkill('Technical Depth', 71),
    ],
    brief: [
      {
        icon: '🚨', iconBg: '#FEF0EE',
        text: 'Gate 1 sign-off has been blocked for 13 days — Demo SE cannot advance to Phase 2 until you approve.',
        tag: 'MANAGER ACTION', tagColor: '#B83128', tagBg: 'rgba(184,49,40,.08)',
        hasAction: true, action: 'Sign off Gate 1 →',
        actionBg: '#B83128', actionColor: 'white', actionBorder: 'none',
      },
      {
        icon: '📉', iconBg: '#FEF0EE',
        text: 'Sim avg dropped 23 pts across 5 sessions (78→55). Competitive Positioning is the lowest score on the team at 38.',
        tag: 'DECLINING', tagColor: '#B83128', tagBg: 'rgba(184,49,40,.08)',
        hasAction: false, action: '', actionBg: '', actionColor: '', actionBorder: '',
      },
      {
        icon: '🎯', iconBg: '#FFF7ED',
        text: "Discovery score: 45 — has not attempted a multi-stakeholder scenario. Assign the 'Enterprise Discovery: IT + Security + HR' sim.",
        tag: 'ASSIGN SIM', tagColor: '#D4810A', tagBg: 'rgba(212,129,10,.08)',
        hasAction: true, action: 'Assign sim now',
        actionBg: '#F0F7FF', actionColor: '#0071CE', actionBorder: '1px solid rgba(0,113,206,.2)',
      },
      {
        icon: '⚠️', iconBg: '#FFF7ED',
        text: 'Day 22 with zero 1:1s logged. Every day without a coaching touchpoint at this ramp stage compounds the gap.',
        tag: 'OVERDUE', tagColor: '#D4810A', tagBg: 'rgba(212,129,10,.08)',
        hasAction: false, action: '', actionBg: '', actionColor: '', actionBorder: '',
      },
    ],
    hasHistory: false, noHistory: true, history: [],
    actions: [],  // populated by CoachingCadence.tsx
  },
  GH: {
    id: 'GH', name: 'Gray Hayes', email: 'gray.hayes@sailpoint.com',
    initials: 'GH', level: 'Senior SE', day: 45,
    avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    healthLabel: 'ON PACE', healthColor: '#0A6E45', healthBg: 'rgba(10,110,69,.2)',
    lastLabel: 'Jul 5', lastColor: '#0A6E45',
    simAvg: '78', simColor: '#0071CE', simScores: [72, 74, 77, 79, 82],
    trendLabel: '↑10 pts', trendColor: '#0A6E45', trendBg: 'rgba(10,110,69,.08)',
    trendDesc: 'Consistent improvement — ready for harder scenarios',
    ramp: '62%', rampColor: '#0071CE',
    overdue: '0', overdueColor: '#0A6E45',
    sparkColor: '#0071CE', sparkFill: '#0071CE',
    ...GH_spark,
    briefDate: 'Generated Jul 13',
    skills: [
      computeSkill('Discovery', 74), computeSkill('Demo Execution', 79),
      computeSkill('Objection Handling', 68), computeSkill('Competitive Positioning', 52),
      computeSkill('Technical Depth', 82),
    ],
    brief: [
      {
        icon: '🚀', iconBg: '#F0FDF7',
        text: "Sim trend is positive +10 pts. Ready for harder scenarios — assign the 'SailPoint vs. Saviynt Competitive Bakeoff' sim.",
        tag: 'PROMOTE', tagColor: '#0A6E45', tagBg: 'rgba(10,110,69,.08)',
        hasAction: true, action: 'Assign competitive sim',
        actionBg: '#EDFAF3', actionColor: '#0A6E45', actionBorder: '1px solid rgba(10,110,69,.2)',
      },
      {
        icon: '🎯', iconBg: '#F0F7FF',
        text: 'Competitive Positioning (52) is the single gap. The SLED specialization cert is the direct unlock.',
        tag: 'FOCUS AREA', tagColor: '#0071CE', tagBg: 'rgba(0,113,206,.08)',
        hasAction: false, action: '', actionBg: '', actionColor: '', actionBorder: '',
      },
    ],
    hasHistory: true, noHistory: false,
    history: [
      {
        date: 'Jul 5', dow: 'Sat', focus: 'Technical depth — ISC architecture deep dive',
        note: 'Ran through ISC connector architecture. Gray struggled with complex attribute mapping but recovered well.',
        outcomeLabel: 'IMPROVED', outcomeColor: '#0A6E45', outcomeBg: 'rgba(10,110,69,.08)',
        delta: '+4 pts', deltaColor: '#0A6E45',
      },
    ],
    actions: [],
  },
  // Add FG and HI following the same pattern
};

export const urgencyScores: Record<string, number> = {
  DS: 98, FG: 84, GH: 42, HI: 18,
};
