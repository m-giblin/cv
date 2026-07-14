import React, { useEffect, useRef } from 'react';
import { SE_DRAWER_PROFILES } from './data';
import type { DrawerSEProfile, DrawerProgram, ProgramStep, ActivityEntry } from './types';

// ─────────────────────────────────────────────
// SEProfileDrawer
//
// Slide-in panel from the right showing a single
// SE's full program + activity detail.
//
// Props:
//   seKey   — one of 'GH' | 'HI' | 'DS' | 'FG'
//             (matches keys in SE_DRAWER_PROFILES)
//   onClose — called when backdrop or × is clicked
//
// The backdrop is position:fixed and covers the
// full viewport. The panel slides in from the right
// with a CSS animation (slideIn keyframe, defined
// globally in your CSS file or Tailwind @layer).
//
// IMPORTANT: For this to work correctly, make sure
// no ancestor element has a CSS `transform` applied
// (transforms break position:fixed). If your layout
// scales the content container with transform:scale,
// mount this component outside that container —
// e.g. at the root <App> level, not inside the
// scaled shell.
// ─────────────────────────────────────────────

interface Props {
  seKey: string;
  onClose: () => void;
}

export default function SEProfileDrawer({ seKey, onClose }: Props) {
  const se: DrawerSEProfile = SE_DRAWER_PROFILES[seKey] ?? SE_DRAWER_PROFILES['GH'];
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      {/* Dim overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.32)' }} />

      {/* Panel — stop click propagation so it doesn't close */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width: 560, height: '100%',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 48px rgba(0,0,0,.22)',
          // Animation: add this keyframe to your global CSS:
          //   @keyframes slideIn {
          //     from { transform: translateX(40px); opacity: 0; }
          //     to   { transform: none; opacity: 1; }
          //   }
          animation: 'slideIn .2s ease-out',
        }}
      >
        <DrawerHeader se={se} onClose={onClose} />
        <DrawerBody se={se} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Drawer Header (dark navy, SailPoint brand)
// ─────────────────────────────────────────────

function DrawerHeader({ se, onClose }: { se: DrawerSEProfile; onClose: () => void }) {
  return (
    <div style={{ background: '#00143A', padding: '16px 18px', flexShrink: 0, position: 'relative' }}>
      {/* Gradient top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#0071CE,#CC27B0)' }} />

      {/* Name + close */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: se.avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'white', fontWeight: 500,
            flexShrink: 0, border: '2px solid rgba(255,255,255,.15)',
          }}>
            {se.initials}
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{se.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: 'rgba(255,255,255,.45)', letterSpacing: '.12em', marginTop: 3 }}>
              {se.level} · Day {se.day} of ramp
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 8,
            color: se.healthColor, background: se.healthBg,
            padding: '3px 9px', letterSpacing: '.07em',
          }}>
            {se.healthLabel}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
              color: 'rgba(255,255,255,.7)', width: 28, height: 28, cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Quick stats — 4 cells */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 1, background: 'rgba(255,255,255,.08)',
        marginTop: 14, border: '1px solid rgba(255,255,255,.08)',
      }}>
        {[
          { value: String(se.programCount), label: 'PROGRAMS',     color: '#fff'           },
          { value: se.overall,              label: 'AVG PROGRESS', color: se.healthColor    },
          { value: String(se.overdueCount), label: 'OVERDUE',      color: '#B83128'         },
          { value: String(se.certsCleared), label: 'GATES CLEARED',color: '#0A6E45'         },
        ].map(({ value, label, color }) => (
          <div key={label} style={{ background: 'rgba(0,0,0,.2)', padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color }}>{value}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button style={{ ...actionBtn, flex: 1, justifyContent: 'center', background: '#0071CE', color: 'white', border: 'none' }}>
          Schedule 1:1
        </button>
        <button style={{ ...actionBtn, flex: 1, justifyContent: 'center', background: '#D4810A', color: 'white', border: 'none' }}>
          Nudge SE
        </button>
        <button style={{ ...actionBtn, flex: 1, justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }}>
          View plan →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Drawer Body (scrollable)
// ─────────────────────────────────────────────

function DrawerBody({ se }: { se: DrawerSEProfile }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#F5F4F0' }}>
      {/* Programs */}
      <div style={{ padding: '14px 16px 0' }}>
        <SectionLabel>Active programs</SectionLabel>
        {se.programs.map((prog) => (
          <ProgramBlock key={prog.name} prog={prog} />
        ))}
      </div>

      {/* Activity */}
      <div style={{ padding: '14px 16px' }}>
        <SectionLabel>Recent activity</SectionLabel>
        {se.activity.map((act, i) => (
          <ActivityRow key={i} act={act} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Program block with step checklist
// ─────────────────────────────────────────────

function ProgramBlock({ prog }: { prog: DrawerProgram }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${prog.borderColor}`, marginBottom: 10 }}>
      {/* Program header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #F0EFEB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: prog.typeColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0D0E12' }}>{prog.name}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: prog.typeColor, letterSpacing: '.06em', textTransform: 'uppercase' }}>{prog.type}</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: prog.statusColor, background: prog.statusBg, padding: '2px 7px', letterSpacing: '.05em' }}>
          {prog.status}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: '#6B6860' }}>Progress</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: prog.statusColor, fontWeight: 500 }}>{prog.pct}%</span>
          </div>
          <div style={{ height: 4, background: '#ECEAE6' }}>
            <div style={{ height: 4, width: `${prog.pct}%`, background: prog.statusColor }} />
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: '#A09D98', whiteSpace: 'nowrap' }}>Due {prog.due}</span>
      </div>

      {/* Step checklist */}
      <div style={{ borderTop: '1px solid #F0EFEB' }}>
        {prog.steps.map((step, i) => (
          <StepRow key={i} step={step} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step row
// ─────────────────────────────────────────────

function StepRow({ step }: { step: ProgramStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px', borderBottom: '1px solid #F9F8F6' }}>
      {/* Status dot */}
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: step.dotBg, border: `1.5px solid ${step.dotBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, color: step.dotColor }}>{step.check}</span>
      </div>
      <span style={{ fontSize: 11, color: step.textColor, flex: 1, textDecoration: step.strike }}>
        {step.label}
      </span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: step.dateColor, whiteSpace: 'nowrap' }}>
        {step.date}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Activity row
// ─────────────────────────────────────────────

function ActivityRow({ act }: { act: ActivityEntry }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid #ECEAE6' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: act.dotColor, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 11, color: '#0D0E12' }}>{act.label}</span>
        <span style={{ fontSize: 10, color: '#A09D98', marginLeft: 6 }}>{act.program}</span>
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: '#A09D98', whiteSpace: 'nowrap' }}>
        {act.date}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
  padding: '7px 10px', cursor: 'pointer', border: 'none',
};
