// ============================================================
// CoachingQueue.tsx — Left panel priority queue
// ============================================================
import React from 'react';
import type { SEProfile } from './types';
import { urgencyScores } from './data';

const BADGES: Record<string, { text: string; color: string; bg: string; border: string }> = {
  DS: { text: 'COACH NOW', color: '#B83128', bg: 'rgba(184,49,40,.15)', border: '#B83128' },
  FG: { text: 'BEHIND',    color: '#D4810A', bg: 'rgba(212,129,10,.12)', border: '#D4810A' },
  GH: { text: 'ON PACE',   color: '#0A6E45', bg: 'rgba(10,110,69,.1)',  border: '#E2DFD9' },
  HI: { text: 'AHEAD',     color: '#0071CE', bg: 'rgba(0,113,206,.1)',  border: '#E2DFD9' },
};

const SIGNALS: Record<string, string> = {
  DS: '4 blocked milestones · Sim dropping 23 pts · Day 22, never coached',
  FG: '4 overdue items · Demo score below threshold · No 1:1 history',
  GH: 'On track · Sim improving · Competitive gap is the only blocker',
  HI: 'Ahead of pace · Top sim on team · Ready for career conversation',
};

interface Props {
  keys: string[];
  profiles: Record<string, SEProfile>;
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function CoachingQueue({ keys, profiles, selectedKey, onSelect }: Props) {
  return (
    <div style={{ width: 310, flexShrink: 0, borderRight: '1px solid #E2DFD9', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #E2DFD9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#3D3C38', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 500 }}>Coaching queue</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>Sorted by urgency</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {keys.map(key => {
          const p = profiles[key];
          const sel = key === selectedKey;
          const b = BADGES[key] || { text: 'UNKNOWN', color: '#888', bg: 'rgba(0,0,0,.05)', border: '#E2DFD9' };
          return (
            <div
              key={key}
              onClick={() => onSelect(key)}
              style={{
                padding: '12px 14px',
                borderLeft: `3px solid ${sel ? '#0071CE' : b.border}`,
                borderBottom: '1px solid #F0EFEB',
                background: sel ? '#F0F7FF' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'white', fontWeight: 500, flexShrink: 0 }}>
                    {p.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0D0E12' }}>{p.name}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', marginTop: 1 }}>{p.level} · Day {p.day}</div>
                  </div>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, fontWeight: 500, color: b.color, background: b.bg, padding: '2px 7px', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
                  {b.text}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: '#6B6860', lineHeight: 1.4, marginBottom: 7, paddingLeft: 43 }}>
                {SIGNALS[key]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 43 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>1:1 <strong style={{ color: p.lastColor }}>{p.lastLabel}</strong></span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>Sim <strong style={{ color: p.simColor }}>{p.simAvg}</strong></span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>Ramp <strong style={{ color: p.rampColor }}>{p.ramp}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
