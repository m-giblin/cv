import React, { useState } from 'react';
import type { ActiveTab, CohortRow, MilestoneItem, SEProgramsRow } from './types';
import {
  COHORT_ROWS, PHASE_DEFS, OVERDUE_MILESTONES, MILESTONES_THIS_WEEK, MILESTONES_UPCOMING,
  SE_PROGRAMS, MANAGER_QUEUE_ITEMS, SIGN_OFF_ITEMS, COLORS,
} from './data';
import SEProfileDrawer from './SEProfileDrawer';

// ─────────────────────────────────────────────
// ProgramTracker
//
// Full-page manager view. Renders inside a
// fixed 1360px-wide shell that scales to fit
// the viewport (same technique as the mock).
//
// Usage:
//   <ProgramTracker />
//
// Expect to wire real data via props/context once
// the API layer is ready; swap out the imports
// from ./data for your API responses.
// ─────────────────────────────────────────────

export default function ProgramTracker() {
  const [tab, setTab] = useState<ActiveTab>('cohort');
  const [drawerSEKey, setDrawerSEKey] = useState<string | null>(null);

  return (
    <>
      {/* Viewport scale wrapper — mirrors the mock's #co / #cr trick */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          background: '#DEDAD4',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            width: 1360,
            transformOrigin: 'top left',
            // In production use a ResizeObserver to set scale:
            // scale = containerWidth / 1360
            // For now the container scrolls at narrow widths.
            padding: '24px 28px 40px',
          }}
        >
          {/* ── SHELL ── */}
          <div
            style={{
              border: '1px solid rgba(0,0,0,.15)',
              overflow: 'hidden',
              display: 'flex',
              height: 920,
              background: '#F5F4F0',
              boxShadow: '0 24px 70px rgba(0,0,0,.2)',
            }}
          >
            <Sidebar />

            {/* ── MAIN ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <Topbar />
              <ManagerQueueStrip />
              <PageHeader tab={tab} setTab={setTab} />

              {/* ── BODY ── */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#F5F4F0' }}>
                {tab === 'cohort'     && <CohortTab     onOpenSE={setDrawerSEKey} />}
                {tab === 'programs'   && <ProgramsTab   onOpenSE={setDrawerSEKey} />}
                {tab === 'milestones' && <MilestonesTab />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SE PROFILE DRAWER ── */}
      {drawerSEKey && (
        <SEProfileDrawer
          seKey={drawerSEKey}
          onClose={() => setDrawerSEKey(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────

function Sidebar() {
  return (
    <aside
      style={{
        width: 214,
        flexShrink: 0,
        background: '#00143A',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Gradient top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#0071CE,#CC27B0)', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 2 }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 13px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* SailPoint logomark — replace with your <img> or SVG component */}
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10.5 2C10.5 2 16.5 6 16.5 13H10.5V2Z" fill="white" />
              <path d="M10.5 5C10.5 5 4.5 8 4.5 13H10.5V5Z" fill="rgba(255,255,255,0.32)" />
              <path d="M3 14.5H17" stroke="white" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: '#fff' }}>SailPoint</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: 'rgba(255,255,255,.2)', letterSpacing: '.14em' }}>MANAGER</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          <NavSection label="COMMAND">
            <NavItem label="Command Center" />
            <NavItem label="Action Inbox" badge="7" badgeColor="#D4810A" />
          </NavSection>
          <NavDivider />
          <NavSection label="PROGRAM">
            <NavItem label="Program Tracker" active />
            <NavItem label="Assign Plans" />
            <NavItem label="Plan Calendar" />
            <NavItem label="Certifications" />
          </NavSection>
          <NavDivider />
          <NavSection label="TEAM">
            <NavItem label="Team Roster" />
            <NavItem label="Readiness Map" />
          </NavSection>
          <NavDivider />
          <NavSection label="COACHING">
            <NavItem label="Coaching Cadence" />
            <NavItem label="My Mentees" />
          </NavSection>
        </div>

        {/* User footer */}
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar initials="DM" bg="linear-gradient(135deg,#0033a1,#0071CE)" size={28} fontSize={9.5} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.82)' }}>Demo Manager</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,.25)' }}>Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ padding: '8px 16px 3px' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: 'rgba(255,255,255,.38)', letterSpacing: '.16em' }}>{label}</span>
      </div>
      {children}
    </>
  );
}

function NavItem({ label, active, badge, badgeColor }: { label: string; active?: boolean; badge?: string; badgeColor?: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '5px 14px 5px 16px', fontSize: 11.5, fontWeight: 500,
        borderLeft: active ? '2px solid #0071CE' : '2px solid transparent',
        cursor: 'pointer', userSelect: 'none',
        background: active ? 'rgba(255,255,255,.06)' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,.62)',
      }}
    >
      <span>{label}</span>
      {badge && (
        <span style={{ fontFamily: "'DM Mono', monospace", background: badgeColor, color: 'white', fontSize: 8.5, padding: '1px 6px' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function NavDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '8px 0' }} />;
}

// ─────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────

function Topbar() {
  return (
    <header style={{
      height: 44, background: '#fff', borderBottom: '1px solid #E2DFD9',
      padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#A09D98' }}>Program</span>
        <span style={{ color: '#C4C1BB', fontSize: 11, margin: '0 2px' }}>›</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#3D3C38', fontWeight: 500 }}>Program Tracker</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btnStyles.outline}>+ Add program</button>
        <Avatar initials="DM" bg="linear-gradient(135deg,#0033a1,#0071CE)" size={30} fontSize={9.5} />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// Manager Queue Strip (dark alert bar)
// ─────────────────────────────────────────────

function ManagerQueueStrip() {
  return (
    <div style={{
      background: '#00143A', padding: '8px 20px',
      display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
    }}>
      {/* Pulsing dot */}
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4810A', flexShrink: 0, animation: 'alertPulse 2.8s ease-in-out infinite' }} />
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,.5)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Manager queue</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {MANAGER_QUEUE_ITEMS.map((item) => (
          <div key={item.seInitials} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', padding: '5px 12px',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{item.title}</span>
            <button style={{
              ...btnStyles.base,
              background: item.actionStyle === 'amber' ? '#D4810A' : 'rgba(0,113,206,.6)',
              color: 'white', border: 'none', fontSize: 9, padding: '2px 8px',
            }}>
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.3)' }}>
        {MANAGER_QUEUE_ITEMS.length} pending your action
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Header + Stats strip + Tab bar
// ─────────────────────────────────────────────

function PageHeader({ tab, setTab }: { tab: ActiveTab; setTab: (t: ActiveTab) => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E2DFD9', padding: '16px 20px 0', flexShrink: 0 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: '#A09D98', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 4 }}>
            West Region · Q3 FY2026 · 4 SEs
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: '#0D0E12', letterSpacing: '-.025em', lineHeight: 1, marginBottom: 4 }}>
            Program Tracker
          </div>
          <div style={{ fontSize: 11.5, color: '#7A7772' }}>
            All structured programs — onboarding, certifications, specialization tracks, dev plans
          </div>
        </div>
        {/* Quarter switcher */}
        <div style={{ display: 'flex', border: '1px solid #D4D1CB', overflow: 'hidden' }}>
          {['Q3 FY2026', 'Q2 FY2026', 'All'].map((q, i) => (
            <div key={q} style={{
              padding: '4px 10px', fontFamily: "'DM Mono', monospace", fontSize: 8.5, cursor: 'pointer',
              background: i === 0 ? '#00143A' : 'transparent',
              color: i === 0 ? '#fff' : '#7A7772',
              borderLeft: i > 0 ? '1px solid #D4D1CB' : 'none',
            }}>{q}</div>
          ))}
        </div>
      </div>

      {/* Stats strip — 6 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', borderTop: '1px solid #E2DFD9', margin: '0 -20px' }}>
        <StatCell label="Active programs" value="14" sub="across 4 SEs" />
        <StatCell label="On track"        value="9"  sub="64% of programs" valueColor="#0A6E45" />
        <StatCell label="At risk"         value="3"  sub="behind pace"     valueColor="#D4810A" />
        <StatCell label="Overdue items"   value="6"  sub="need action now" valueColor="#B83128" subColor="#B83128" />
        <StatCell label="Avg completion"  value="43%" sub="" valueColor="#0071CE" progress={43} />
        <StatCell label="Cert gates cleared" value="3" sub="this quarter" valueSuffix="/20" last />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', margin: '0 -20px', borderTop: '1px solid #E2DFD9' }}>
        {(['cohort', 'programs', 'milestones'] as ActiveTab[]).map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 8.5, letterSpacing: '.08em', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #0071CE' : '2px solid transparent',
              color: tab === t ? '#0071CE' : '#A09D98',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.toUpperCase()}
            {t === 'milestones' && (
              <span style={{ background: '#B83128', color: 'white', fontSize: 7.5, padding: '1px 5px', borderRadius: 99 }}>6</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, valueColor = '#0D0E12', subColor = '#7A7772', progress, valueSuffix, last }: {
  label: string; value: string; sub: string;
  valueColor?: string; subColor?: string;
  progress?: number; valueSuffix?: string; last?: boolean;
}) {
  return (
    <div style={{ padding: '12px 16px', borderRight: last ? 'none' : '1px solid #E2DFD9' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1 }}>
        {value}
        {valueSuffix && <span style={{ fontSize: 14, color: '#A09D98', fontWeight: 500 }}>{valueSuffix}</span>}
      </div>
      {progress !== undefined ? (
        <div style={{ height: 3, background: '#ECEAE6', marginTop: 6 }}>
          <div style={{ height: 3, width: `${progress}%`, background: valueColor }} />
        </div>
      ) : (
        <div style={{ fontSize: 10, color: subColor, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COHORT TAB
// ─────────────────────────────────────────────

function CohortTab({ onOpenSE }: { onOpenSE: (key: string) => void }) {
  return (
    <div style={{ padding: 20 }}>
      {/* Phase grid */}
      <div style={{ background: '#fff', border: '1px solid #E2DFD9', overflow: 'hidden', marginBottom: 16 }}>
        {/* Grid header */}
        <div style={{ padding: '11px 16px', borderBottom: '1px solid #E2DFD9', background: '#F9F8F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: '#0D0E12' }}>SE-I Onboarding Program</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', letterSpacing: '.1em', textTransform: 'uppercase', marginLeft: 10 }}>4-phase · Weeks 1–12</span>
          </div>
          <button style={btnStyles.outline}>View plan calendar →</button>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(4,1fr) 80px', gap: 1, background: '#E2DFD9', borderBottom: '1px solid #E2DFD9' }}>
          <div style={{ background: '#F9F8F6', padding: '8px 14px' }}><MonoLabel>SE</MonoLabel></div>
          {[
            ['PHASE 1', 'Foundations · Wks 1–2'],
            ['PHASE 2', 'Technical Depth · Wks 3–4'],
            ['PHASE 3', 'Field Application · Wks 5–6'],
            ['PHASE 4', 'Cert Gates · Ongoing'],
          ].map(([ph, sub]) => (
            <div key={ph} style={{ background: '#F9F8F6', padding: '8px 12px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: '#3D3C38', fontWeight: 500 }}>{ph}</div>
              <div style={{ fontSize: 9, color: '#A09D98', marginTop: 1 }}>{sub}</div>
            </div>
          ))}
          <div style={{ background: '#F9F8F6', padding: '8px 12px', textAlign: 'center' }}><MonoLabel>Overall</MonoLabel></div>
        </div>

        {/* SE rows */}
        {COHORT_ROWS.map((row) => (
          <CohortRow key={row.initials} row={row} onClick={() => onOpenSE(row.initials)} />
        ))}
      </div>

      {/* Bottom split: phase defs + overdue milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Phase definitions */}
        <div style={{ background: '#fff', border: '1px solid #E2DFD9', padding: '14px 16px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: '#0D0E12', marginBottom: 12 }}>Phase definitions</div>
          {PHASE_DEFS.map((pd) => (
            <div key={pd.title} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EFEB' }}>
              <div style={{ width: 28, height: 28, background: pd.bg, border: `1px solid ${pd.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>{pd.emoji}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0E12', marginBottom: 2 }}>{pd.title}</div>
                <div style={{ fontSize: 10.5, color: '#7A7772', lineHeight: 1.5 }}>{pd.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue milestones mini-list */}
        <div style={{ background: '#fff', border: '1px solid #E2DFD9' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2DFD9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: '#0D0E12' }}>Overdue milestones</div>
              <div style={{ fontSize: 10.5, color: '#B83128', marginTop: 1 }}>{OVERDUE_MILESTONES.length} items need action now</div>
            </div>
            <button style={btnStyles.outline}>See all →</button>
          </div>
          {OVERDUE_MILESTONES.map((od, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid #F0EFEB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#B83128', fontWeight: 500 }}>{od.dateShort}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#0D0E12' }}>{od.label}</div>
                  <div style={{ fontSize: 9.5, color: '#A09D98', marginTop: 1 }}>{od.program}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, background: '#FEF0EE', color: '#B83128', padding: '2px 7px', letterSpacing: '.05em' }}>OVERDUE</span>
                <button style={{ ...btnStyles.base, background: '#F0F7FF', color: '#0071CE', border: '1px solid rgba(0,113,206,.2)', fontSize: 9, padding: '3px 8px' }}>Nudge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CohortRow({ row, onClick }: { row: CohortRow; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '180px repeat(4,1fr) 80px',
        gap: 1, background: '#E2DFD9', borderBottom: '1px solid #E2DFD9',
        cursor: 'pointer', transition: 'background 80ms',
      }}
    >
      {/* SE name cell */}
      <div style={{ background: hovered ? '#F9F8F6' : '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Avatar initials={row.initials} bg={row.avatarBg} size={28} fontSize={9.5} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#0D0E12' }}>{row.name}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>{row.level} · Day {row.day}</div>
        </div>
      </div>
      {/* Phase cells */}
      {row.phases.map((ph, i) => (
        <div key={i} style={{ background: hovered ? adjustAlpha(ph.bg) : ph.bg, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: ph.color, lineHeight: 1 }}>{ph.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: ph.color }}>{ph.label}</span>
          </div>
          <div style={{ fontSize: 9, color: '#A09D98' }}>{ph.sub}</div>
        </div>
      ))}
      {/* Overall */}
      <div style={{ background: hovered ? '#F9F8F6' : '#fff', padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: row.overallColor }}>{row.overall}</span>
        <div style={{ height: 3, width: 56, background: '#ECEAE6' }}>
          <div style={{ height: 3, width: row.overall, background: row.overallColor }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRAMS TAB
// ─────────────────────────────────────────────

function ProgramsTab({ onOpenSE }: { onOpenSE: (key: string) => void }) {
  return (
    <div style={{ padding: 20 }}>
      {SE_PROGRAMS.map((sep) => (
        <div key={sep.initials} style={{ marginBottom: 16 }}>
          {/* SE header — click to open drawer */}
          <div onClick={() => onOpenSE(sep.initials)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
            <Avatar initials={sep.initials} bg={sep.avatarBg} size={32} fontSize={10} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0D0E12' }}>{sep.name}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#A09D98', marginLeft: 8 }}>{sep.level} · Day {sep.day}</span>
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: sep.healthColor, background: sep.healthBg, padding: '2px 8px', marginLeft: 4, letterSpacing: '.06em' }}>
              {sep.healthLabel}
            </span>
            <span style={{ fontSize: 10, color: '#A09D98', marginLeft: 'auto' }}>{sep.programCount} active programs</span>
          </div>
          {/* Program cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {sep.programs.map((prog) => (
              <div key={prog.name} style={{ background: '#fff', border: `1px solid ${prog.borderColor}`, padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: prog.typeColor, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: prog.typeColor, letterSpacing: '.07em', textTransform: 'uppercase' }}>{prog.type}</span>
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: prog.statusColor, background: prog.statusBg, padding: '2px 6px', letterSpacing: '.05em' }}>{prog.status}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0E12', marginBottom: 4, lineHeight: 1.3 }}>{prog.name}</div>
                <div style={{ fontSize: 10, color: '#7A7772', marginBottom: 8 }}>{prog.subtitle}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, color: '#6B6860' }}>Progress</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 500, color: prog.statusColor }}>{prog.pct}%</span>
                </div>
                <div style={{ height: 3, background: '#ECEAE6' }}>
                  <div style={{ height: 3, width: `${prog.pct}%`, background: prog.statusColor }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 9, color: '#A09D98' }}>Due {prog.due}</span>
                  <button style={btnStyles.outline}>Open →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MILESTONES TAB
// ─────────────────────────────────────────────

function MilestonesTab() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Main milestone list */}
        <div>
          <MilestoneSection
            label="Overdue"
            count={OVERDUE_MILESTONES.length}
            dotColor="#B83128"
            borderColor="rgba(184,49,40,.2)"
            items={OVERDUE_MILESTONES}
            actions="overdue"
          />
          <MilestoneSection
            label="Due this week"
            count={MILESTONES_THIS_WEEK.length}
            dotColor="#D4810A"
            borderColor="rgba(212,129,10,.2)"
            items={MILESTONES_THIS_WEEK}
            actions="thisWeek"
          />
          <MilestoneSection
            label="Upcoming · next 2 weeks"
            count={MILESTONES_UPCOMING.length}
            dotColor="#A09D98"
            borderColor="#E2DFD9"
            items={MILESTONES_UPCOMING}
            actions="upcoming"
          />
        </div>

        {/* Manager sign-off sidebar */}
        <SignOffSidebar />
      </div>
    </div>
  );
}

function MilestoneSection({ label, count, dotColor, borderColor, items, actions }: {
  label: string; count: number; dotColor: string; borderColor: string;
  items: MilestoneItem[]; actions: 'overdue' | 'thisWeek' | 'upcoming';
}) {
  const textColor = actions === 'overdue' ? '#B83128' : actions === 'thisWeek' ? '#D4810A' : '#A09D98';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: textColor, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500 }}>
          {label} · {count} items
        </span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${borderColor}` }}>
        {items.map((ms, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #F0EFEB', gap: 14 }}>
            <div style={{ width: 36, flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: textColor, fontWeight: 500 }}>{ms.dateShort}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: textColor, opacity: .7 }}>{ms.dayOfWeek}</div>
            </div>
            <div style={{ width: 1, height: 28, background: borderColor, flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Avatar initials={ms.initials} bg={ms.avatarBg} size={24} fontSize={8.5} />
              <span style={{ fontSize: 11, fontWeight: 500, color: '#0D0E12', whiteSpace: 'nowrap' }}>{ms.se}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: '#0D0E12' }}>{ms.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: '#A09D98', marginTop: 1 }}>{ms.program}</div>
            </div>
            {actions === 'overdue' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button style={{ ...btnStyles.base, background: '#F0F7FF', border: '1px solid rgba(0,113,206,.2)', color: '#0071CE', fontSize: 9, padding: '3px 8px' }}>Nudge SE</button>
                <button style={btnStyles.outline}>Reschedule</button>
                <button style={{ ...btnStyles.base, background: '#EDFAF3', border: '1px solid rgba(10,110,69,.2)', color: '#0A6E45', fontSize: 9, padding: '3px 8px' }}>Mark done</button>
              </div>
            )}
            {actions === 'thisWeek' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button style={{ ...btnStyles.base, background: '#FFFBF0', border: '1px solid rgba(212,129,10,.2)', color: '#D4810A', fontSize: 9, padding: '3px 8px' }}>Remind SE</button>
                <button style={btnStyles.outline}>View step</button>
              </div>
            )}
            {actions === 'upcoming' && ms.daysAway && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: '#A09D98', flexShrink: 0 }}>{ms.daysAway}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignOffSidebar() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2DFD9', position: 'sticky', top: 0 }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E2DFD9', background: '#F9F8F6' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#D4810A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>Manager sign-off queue</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0D0E12' }}>{SIGN_OFF_ITEMS.length} items waiting on you</div>
      </div>
      {SIGN_OFF_ITEMS.map((item) => (
        <div key={item.seInitials} style={{ padding: '12px 14px', borderBottom: '1px solid #E2DFD9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Avatar initials={item.seInitials} bg={item.avatarBg} size={22} fontSize={8} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#0D0E12' }}>{item.title}</span>
          </div>
          <div style={{ fontSize: 10.5, color: '#6B6860', lineHeight: 1.5, marginBottom: 8 }}>{item.description}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btnStyles.primary, flex: 1, justifyContent: 'center', fontSize: 9, padding: '3px 8px' }}>Approve ✓</button>
            <button style={btnStyles.outline}>Review first</button>
          </div>
        </div>
      ))}
      {/* Completed this quarter */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#0A6E45', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Completed this quarter</div>
        {['Harper — SLED Vertical cert ✓', 'Gray — Phase 2 sign-off ✓', 'Harper — Phase 1 sign-off ✓'].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0A6E45', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: '#3D3C38' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

function Avatar({ initials, bg, size, fontSize }: { initials: string; bg: string; size: number; fontSize: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Mono', monospace", fontSize, color: 'white', fontWeight: 500, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: '#A09D98', letterSpacing: '.1em', textTransform: 'uppercase' }}>{children}</span>
  );
}

// ─────────────────────────────────────────────
// Shared button styles
// ─────────────────────────────────────────────

const btnStyles = {
  base: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    border: 'none', fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '.01em', cursor: 'pointer', lineHeight: 1,
    transition: 'background 100ms, border-color 100ms, color 100ms',
  } as React.CSSProperties,
  outline: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'transparent', color: '#3D3C38',
    border: '1px solid #D4D1CB', fontFamily: "'DM Sans', sans-serif",
    fontSize: 9, fontWeight: 600, padding: '3px 8px',
    cursor: 'pointer', letterSpacing: '.01em', lineHeight: 1,
  } as React.CSSProperties,
  primary: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: '#0071CE', color: 'white', border: 'none',
    fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
    padding: '3px 8px', cursor: 'pointer',
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

/** Slightly darken a light hex/rgba bg on hover — simple pass-through for now */
function adjustAlpha(bg: string) { return bg; }
