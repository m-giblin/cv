/**
 * PlanCalendar.tsx
 *
 * Plan Calendar v2 — Ramp Intelligence Gantt
 *
 * CURSOR INSTRUCTIONS:
 * 1. Drop this file into your pages/ or app/ directory.
 * 2. Add Google Fonts to your layout: DM Sans (400,500,600), DM Mono (300,400,500), Syne (700,800)
 * 3. Replace SE_DATA with real API data from your backend.
 * 4. The sidebar is a stub — replace with your app's navigation shell.
 * 5. Drag-and-drop uses native mouse events wired in useEffect — no drag library needed.
 *
 * VIEWS: Timeline (Gantt) | Month calendar | Team summary cards
 * ROLES: Manager (drag enabled) | SE (own plan only, read-only) | Mentor (mentees, read-only)
 * AI ALERTS: Auto-detected from plan data — weekend gates, overloaded weeks, missing mentors, pace issues
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────

const DAY_PX = 26;          // pixels per day in Gantt
const TODAY_DAY = 42;       // July 13 = day 42 from June 1 2026
const TOTAL_DAYS = 120;     // June 1 – Sep 28
const CALENDAR_ORIGIN = new Date(2026, 5, 1); // June 1 2026

const BAR_COLORS: Record<string, string> = {
  content:   '#0071CE',
  challenge: '#D4810A',
  sim:       '#CC27B0',
  mentor:    '#0A6E45',
  gate:      '#00143A',
};

const RGBA_COLORS: Record<string, [string, string]> = {
  '#0071CE': ['rgba(0,113,206,.88)',  'rgba(0,113,206,.28)'],
  '#D4810A': ['rgba(212,129,10,.88)', 'rgba(212,129,10,.28)'],
  '#CC27B0': ['rgba(204,39,176,.88)', 'rgba(204,39,176,.28)'],
  '#0A6E45': ['rgba(10,110,69,.88)',  'rgba(10,110,69,.28)'],
};

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'manager' | 'se' | 'mentor';
type ViewMode = 'timeline' | 'month' | 'team';
type BarType = 'content' | 'challenge' | 'sim' | 'mentor' | 'gate';
type Health = 'critical' | 'behind' | 'on-pace' | 'ahead';

interface BarItem {
  id: string;
  type: BarType;
  label: string;
  startDay: number;
  days?: number;
  pct?: number;
}

interface SEProfile {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  health: Health;
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  rampPct: number;
  dayInRamp: number;
  mentor: string | null;
  planName: string;
  bars: BarItem[];
}

interface Conflict {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  seId: string;
  barId?: string;
  seName: string;
  title: string;
  msg: string;
  ctaLabel: string;
  onCta: () => void;
}

// ─── Initial SE Data ────────────────────────────────────────────────────────
// Replace this with your real API call

const SE_DATA: SEProfile[] = [
  {
    id: 'finn', name: 'Finn Grant', initials: 'FG',
    avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    health: 'behind', healthLabel: 'BEHIND', healthColor: '#D4810A', healthBg: 'rgba(212,129,10,.1)',
    rampPct: 18, dayInRamp: 22, mentor: 'Demo Manager', planName: '90-Day Ramp',
    bars: [
      { id: 'finn-c1',  type: 'content',   label: 'Week 1–2: Boots on ground', startDay: 0,  days: 14, pct: 100 },
      { id: 'finn-ch1', type: 'challenge', label: 'Wk2: First challenge',       startDay: 7,  days: 5,  pct: 100 },
      { id: 'finn-g1',  type: 'gate',      label: 'Gate 1',                     startDay: 13 },
      { id: 'finn-c2',  type: 'content',   label: 'Week 3–4: Building basics',  startDay: 14, days: 14, pct: 40 },
      { id: 'finn-m1',  type: 'mentor',    label: '1:1 Mentor',                 startDay: 10, days: 1 },
      { id: 'finn-m2',  type: 'mentor',    label: '1:1 Mentor',                 startDay: 21, days: 1 },
      { id: 'finn-s1',  type: 'sim',       label: 'Sim: Discovery call',        startDay: 29, days: 2 },
      { id: 'finn-g2',  type: 'gate',      label: 'Gate 2',                     startDay: 28 }, // weekend!
    ],
  },
  {
    id: 'gray', name: 'Gray Hayes', initials: 'GH',
    avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    health: 'on-pace', healthLabel: 'ON PACE', healthColor: '#0A6E45', healthBg: 'rgba(10,110,69,.1)',
    rampPct: 62, dayInRamp: 45, mentor: 'Demo Manager', planName: '90-Day Ramp',
    bars: [
      { id: 'gray-c1',  type: 'content',   label: 'Week 1–4: Foundation',   startDay: 0,  days: 28, pct: 100 },
      { id: 'gray-g1',  type: 'gate',      label: 'Gate 1',                 startDay: 14 },
      { id: 'gray-ch1', type: 'challenge', label: 'Challenge pack 1',       startDay: 21, days: 7,  pct: 100 },
      { id: 'gray-c2',  type: 'content',   label: 'Week 5–7: Advanced',     startDay: 28, days: 21, pct: 55 },
      { id: 'gray-s1',  type: 'sim',       label: 'Sim: CISO discovery',    startDay: 35, days: 2 },
      { id: 'gray-s2',  type: 'sim',       label: 'Sim: SLED vertical',     startDay: 42, days: 2 }, // overloaded
      { id: 'gray-ch2', type: 'challenge', label: 'Challenge pack 2',       startDay: 42, days: 5 }, // same week
      { id: 'gray-g2',  type: 'gate',      label: 'Gate 2',                 startDay: 49 },
      { id: 'gray-m1',  type: 'mentor',    label: '1:1 Mentor',             startDay: 38, days: 1 },
    ],
  },
  {
    id: 'harper', name: 'Harper Ivan', initials: 'HI',
    avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)',
    health: 'ahead', healthLabel: 'AHEAD', healthColor: '#0071CE', healthBg: 'rgba(0,113,206,.1)',
    rampPct: 78, dayInRamp: 68, mentor: 'Demo Manager', planName: '90-Day Ramp',
    bars: [
      { id: 'harper-c1', type: 'content', label: 'Weeks 1–6: Foundation + Advanced', startDay: 0,  days: 42, pct: 100 },
      { id: 'harper-g1', type: 'gate',    label: 'Gate 1',                           startDay: 14 },
      { id: 'harper-g2', type: 'gate',    label: 'Gate 2',                           startDay: 35 },
      { id: 'harper-c2', type: 'content', label: 'Week 7–10: Expert track',          startDay: 42, days: 28, pct: 75 },
      { id: 'harper-g3', type: 'gate',    label: 'Gate 3',                           startDay: 63 },
      { id: 'harper-s1', type: 'sim',     label: 'Sim: Executive demo',              startDay: 55, days: 2 },
      { id: 'harper-m1', type: 'mentor',  label: '1:1 Mentor',                       startDay: 61, days: 1 },
    ],
  },
  {
    id: 'demo', name: 'Demo SE', initials: 'DS',
    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    health: 'critical', healthLabel: 'CRITICAL', healthColor: '#B83128', healthBg: 'rgba(184,49,40,.12)',
    rampPct: 12, dayInRamp: 22, mentor: null, planName: '90-Day Ramp',
    bars: [
      { id: 'demo-c1', type: 'content', label: 'Week 1–2: Boots on ground', startDay: 0,  days: 14, pct: 12 },
      { id: 'demo-g1', type: 'gate',    label: 'Gate 1',                    startDay: 14 },
    ],
  },
];

// ─── Conflict detection ──────────────────────────────────────────────────────

function detectConflicts(planData: SEProfile[], onAction: (seId: string, barId?: string) => void): Conflict[] {
  const conflicts: Conflict[] = [];
  const isWeekend = (d: number) => d % 7 === 5 || d % 7 === 6; // June 1 = Mon

  planData.forEach(se => {
    // Gate on weekend
    se.bars.filter(b => b.type === 'gate').forEach(bar => {
      if (isWeekend(bar.startDay)) {
        conflicts.push({
          id: `wknd-${bar.id}`, severity: 'warning', seId: se.id, barId: bar.id,
          seName: se.name, title: `${bar.label} falls on weekend`,
          msg: `${se.name}'s ${bar.label} is on a weekend. Shift to nearest weekday.`,
          ctaLabel: 'Shift to Mon',
          onCta: () => onAction(se.id, bar.id),
        });
      }
    });

    // Overloaded week
    const weekMap: Record<number, BarItem[]> = {};
    se.bars.filter(b => b.type !== 'content' && b.type !== 'gate').forEach(bar => {
      const wk = Math.floor(bar.startDay / 7);
      weekMap[wk] = [...(weekMap[wk] || []), bar];
    });
    Object.entries(weekMap).forEach(([wk, bars]) => {
      if (bars.length >= 2) {
        conflicts.push({
          id: `overload-${se.id}-${wk}`, severity: 'warning', seId: se.id,
          seName: se.name, title: `Week ${parseInt(wk) + 1} overloaded`,
          msg: `${bars.length} deliverables in same week. Consider spacing out.`,
          ctaLabel: 'Rebalance', onCta: () => onAction(se.id),
        });
      }
    });

    // No mentor
    if (!se.mentor) {
      conflicts.push({
        id: `no-mentor-${se.id}`, severity: 'info', seId: se.id,
        seName: se.name, title: 'No mentor assigned',
        msg: `${se.name} has no mentor. 1:1 sessions unscheduled.`,
        ctaLabel: 'Assign mentor', onCta: () => onAction(se.id),
      });
    }

    // Critical pace
    if (se.health === 'critical') {
      const expected = Math.round(se.dayInRamp * 1.6);
      conflicts.push({
        id: `pace-${se.id}`, severity: 'critical', seId: se.id,
        seName: se.name, title: `${se.name} critically behind`,
        msg: `${se.rampPct}% at day ${se.dayInRamp}. Expected ~${expected}%. Gate at risk.`,
        ctaLabel: 'Review plan', onCta: () => onAction(se.id),
      });
    }
  });
  return conflicts;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Avatar: React.FC<{ initials: string; bg: string; size?: number; fontSize?: number }> = ({
  initials, bg, size = 30, fontSize = 10,
}) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Mono', monospace", fontSize, fontWeight: 500, color: 'white',
    flexShrink: 0,
  }}>{initials}</div>
);

const RampBar: React.FC<{ pct: number; color: string; height?: number }> = ({ pct, color, height = 3 }) => (
  <div style={{ height, background: '#ECEAE6', overflow: 'hidden', borderRadius: height }}>
    <div style={{ height, background: color, width: `${pct}%`, transition: 'width 400ms' }} />
  </div>
);

const HealthBadge: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span style={{
    fontFamily: "'DM Mono', monospace", fontSize: 7.5, color, background: bg,
    padding: '2px 6px', letterSpacing: '.06em',
  }}>{label}</span>
);

// ─── Calendar header helpers ─────────────────────────────────────────────────

interface HeaderDay { dayNum: number; isToday: boolean; isWeekend: boolean }
interface HeaderMonth { label: string; leftPx: number; widthPx: number }

function buildCalendarHeader(): { days: HeaderDay[]; months: HeaderMonth[] } {
  const monthDefs = [
    { name: 'June 2026',      m: 5, y: 2026, d: 30 },
    { name: 'July 2026',      m: 6, y: 2026, d: 31 },
    { name: 'August 2026',    m: 7, y: 2026, d: 31 },
    { name: 'September 2026', m: 8, y: 2026, d: 28 },
  ];
  const days: HeaderDay[] = [];
  const months: HeaderMonth[] = [];
  let offset = 0;
  monthDefs.forEach(({ name, m, y, d }) => {
    months.push({ label: name, leftPx: offset * DAY_PX, widthPx: d * DAY_PX });
    for (let i = 1; i <= d; i++) {
      const dow = new Date(y, m, i).getDay();
      days.push({ dayNum: i, isToday: offset === TODAY_DAY, isWeekend: dow === 0 || dow === 6 });
      offset++;
    }
  });
  return { days, months };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PlanCalendar() {
  const [role, setRole] = useState<Role>('manager');
  const [view, setView] = useState<ViewMode>('timeline');
  const [planData, setPlanData] = useState<SEProfile[]>(SE_DATA);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [monthOffset, setMonthOffset] = useState(1); // 1 = July
  const ganttRowsRef = useRef<HTMLDivElement>(null);

  // Conflict detection
  const handleConflictAction = useCallback((seId: string, barId?: string) => {
    if (barId) {
      // Shift gate to next Monday
      setPlanData(prev => prev.map(se => {
        if (se.id !== seId) return se;
        return { ...se, bars: se.bars.map(b => {
          if (b.id !== barId) return b;
          let d = b.startDay;
          while (d % 7 === 5 || d % 7 === 6) d++;
          return { ...b, startDay: d };
        })};
      }));
      setPendingChanges(n => n + 1);
    }
  }, []);

  const conflicts = detectConflicts(planData, handleConflictAction);
  const activeConflicts = conflicts.filter(c => !dismissedAlerts.includes(c.id)).slice(0, 3);

  // Update bar day after drag
  const updateBarDay = useCallback((seId: string, barId: string, newDay: number) => {
    setPlanData(prev => prev.map(se => {
      if (se.id !== seId) return se;
      return { ...se, bars: se.bars.map(b => {
        if (b.id !== barId) return b;
        return { ...b, startDay: Math.max(0, newDay) };
      })};
    }));
    setPendingChanges(n => n + 1);
  }, []);

  // Drag-and-drop
  useEffect(() => {
    const gantt = ganttRowsRef.current;
    if (!gantt) return;
    let drag: { el: HTMLElement; barId: string; seId: string; startX: number; origLeft: number; currentLeft: number } | null = null;

    const onMouseDown = (e: MouseEvent) => {
      if (role !== 'manager') return;
      const bar = (e.target as HTMLElement).closest<HTMLElement>('[data-bar-id]');
      if (!bar) return;
      e.preventDefault();
      const origLeft = parseInt(bar.style.left) || 0;
      drag = { el: bar, barId: bar.dataset.barId!, seId: bar.dataset.seId!, startX: e.clientX, origLeft, currentLeft: origLeft };
      bar.style.opacity = '0.6';
      bar.style.cursor = 'grabbing';
      bar.style.zIndex = '50';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!drag) return;
      const newLeft = Math.max(0, drag.origLeft + (e.clientX - drag.startX));
      drag.el.style.left = `${newLeft}px`;
      drag.currentLeft = newLeft;
    };
    const onMouseUp = () => {
      if (!drag) return;
      const snappedDay = Math.round(drag.currentLeft / DAY_PX);
      drag.el.style.left = `${snappedDay * DAY_PX}px`;
      drag.el.style.opacity = '';
      drag.el.style.cursor = '';
      drag.el.style.zIndex = '';
      updateBarDay(drag.seId, drag.barId, snappedDay);
      drag = null;
    };

    gantt.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      gantt.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [role, updateBarDay]);

  // Filtered SE list by role
  const visibleSEs = role === 'se'
    ? planData.filter(s => s.id === 'demo') // replace with current user's SE ID
    : role === 'mentor'
      ? planData.filter(s => s.mentor === 'Demo Manager') // replace with current user's name
      : planData;

  const conflictBarIds = new Set(activeConflicts.filter(c => c.barId).map(c => c.barId!));
  const { days: headerDays, months: headerMonths } = buildCalendarHeader();
  const ganttTotalWidth = 200 + TOTAL_DAYS * DAY_PX;

  // ── Month view data ──
  const displayMonth = 5 + monthOffset; // 5=June base
  const displayYear = 2026;
  const monthFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDow = new Date(displayYear, displayMonth, 1).getDay();
  const monthCells: { day: number; isToday: boolean; isWeekend: boolean; isOther: boolean; events: { color: string; label: string }[] }[] = [];
  for (let i = 0; i < firstDow; i++) {
    const d = new Date(displayYear, displayMonth, -firstDow + i + 1);
    monthCells.push({ day: d.getDate(), isToday: false, isWeekend: false, isOther: true, events: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(displayYear, displayMonth, d);
    const isToday = date.getFullYear() === 2026 && date.getMonth() === 6 && date.getDate() === 13;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dayOff = Math.round((date.getTime() - CALENDAR_ORIGIN.getTime()) / 86400000);
    const events: { color: string; label: string }[] = [];
    planData.forEach(se => se.bars.forEach(bar => {
      if (bar.startDay === dayOff) events.push({ color: BAR_COLORS[bar.type] || '#888', label: `${se.initials}: ${bar.label}` });
    }));
    monthCells.push({ day: d, isToday, isWeekend, isOther: false, events: events.slice(0, 4) });
  }
  const rem = 7 - (monthCells.length % 7);
  if (rem < 7) for (let i = 1; i <= rem; i++) monthCells.push({ day: i, isToday: false, isWeekend: false, isOther: true, events: [] });

  // ── Severity styles ──
  const sevStyle = {
    critical: { iconBg: 'rgba(184,49,40,.25)', color: '#FF6B6B', ctaBg: 'rgba(184,49,40,.25)', ctaColor: '#FF8080', label: 'CRITICAL' },
    warning:  { iconBg: 'rgba(212,129,10,.25)', color: '#FFB347', ctaBg: 'rgba(212,129,10,.2)', ctaColor: '#FFB347', label: 'WARNING' },
    info:     { iconBg: 'rgba(0,113,206,.2)',   color: '#5BB3FF', ctaBg: 'rgba(0,113,206,.15)', ctaColor: '#5BB3FF', label: 'INFO' },
  };

  const rampColor = (h: Health) => h === 'critical' ? '#B83128' : h === 'behind' ? '#D4810A' : h === 'ahead' ? '#0071CE' : '#0A6E45';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#DEDAD4' }}>

      {/* ── SIDEBAR (replace with your nav shell) ── */}
      <aside style={{ width: 214, flexShrink: 0, background: '#00143A', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#0071CE,#CC27B0)', zIndex: 2 }} />
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: '#fff' }}>SailPoint</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: 'rgba(255,255,255,.2)', letterSpacing: '.14em', marginTop: 4 }}>
            {role === 'manager' ? 'MANAGER' : role === 'se' ? 'SE VIEW' : 'MENTOR'}
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {['Assign Plans', 'Plan Calendar', 'Program Tracker', 'Certifications', 'Team Roster', 'Readiness Map'].map((item, i) => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 5px 16px',
              fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              borderLeft: item === 'Plan Calendar' ? '2px solid #0071CE' : '2px solid transparent',
              background: item === 'Plan Calendar' ? 'rgba(255,255,255,.06)' : 'transparent',
              color: item === 'Plan Calendar' ? '#fff' : 'rgba(255,255,255,.62)',
            }}>{item}</div>
          ))}
        </nav>
        <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar initials="DM" bg="linear-gradient(135deg,#0033a1,#0071CE)" size={28} fontSize={9.5} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.82)' }}>Demo Manager</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,.25)' }}>Manager</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ height: 44, background: '#fff', borderBottom: '1px solid #E2DFD9', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#A09D98' }}>Program</span>
            <span style={{ color: '#C4C1BB', fontSize: 11, margin: '0 2px' }}>›</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#3D3C38', fontWeight: 500 }}>Plan Calendar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Role toggle */}
            <div style={{ display: 'flex', border: '1px solid #D4D1CB', overflow: 'hidden' }}>
              {(['manager', 'se', 'mentor'] as Role[]).map((r, i) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: '5px 12px', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '.07em',
                    cursor: 'pointer', border: 'none',
                    borderLeft: i > 0 ? '1px solid #D4D1CB' : 'none',
                    background: role === r ? '#00143A' : '#fff',
                    color: role === r ? '#fff' : '#7A7772',
                    transition: 'background 100ms, color 100ms',
                  }}
                >
                  {r === 'manager' ? 'MANAGER' : r === 'se' ? 'SE VIEW' : 'MENTOR'}
                </button>
              ))}
            </div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #D4D1CB', padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Block / Holiday
            </button>
            <button
              onClick={() => setPendingChanges(0)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#0071CE', color: 'white', border: 'none', padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Save changes
            </button>
          </div>
        </header>

        {/* AI Intel Strip */}
        <div style={{ background: '#00143A', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B83128' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,.5)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                AI Scheduling Intelligence · {activeConflicts.length} issues detected
              </span>
            </div>
            <button onClick={() => setDismissedAlerts(conflicts.map(c => c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,.3)' }}>
              Dismiss all
            </button>
          </div>
          <div style={{ display: 'flex', padding: '6px 20px 10px' }}>
            {activeConflicts.map(c => {
              const s = sevStyle[c.severity];
              return (
                <div key={c.id} style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 2, background: s.iconBg, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{c.title}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: s.color, letterSpacing: '.06em', marginTop: 1 }}>
                          {s.label} · {c.seName}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setDismissedAlerts(prev => [...prev, c.id])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.25)', fontSize: 13, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)', lineHeight: 1.45, marginBottom: 6 }}>{c.msg}</div>
                  <button onClick={c.onCta} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.ctaBg, border: 'none', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: s.ctaColor, cursor: 'pointer' }}>
                    {c.ctaLabel} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* View tabs */}
        <div style={{ height: 38, background: '#fff', borderBottom: '1px solid #E2DFD9', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', height: '100%' }}>
            {(['timeline', 'month', 'team'] as ViewMode[]).map(v => (
              <div key={v} onClick={() => setView(v)} style={{
                display: 'flex', alignItems: 'center', padding: '0 14px',
                fontFamily: "'DM Mono', monospace", fontSize: 8.5, letterSpacing: '.07em', cursor: 'pointer',
                borderBottom: view === v ? '2px solid #0071CE' : '2px solid transparent',
                color: view === v ? '#0071CE' : '#A09D98',
                transition: 'color 100ms, border-color 100ms',
              }}>{v.toUpperCase()}</div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {Object.entries(BAR_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, background: color, transform: type === 'gate' ? 'rotate(45deg)' : 'none' }} />
                <span style={{ fontSize: 9.5, color: '#7A7772', textTransform: 'capitalize' }}>{type}</span>
              </div>
            ))}
            <div style={{ width: 1, height: 16, background: '#E2DFD9' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#B83128' }}>● Conflict</span>
            <div style={{ width: 1, height: 16, background: '#E2DFD9' }} />
            <span style={{ fontSize: 9.5, color: '#A09D98' }}>{role === 'manager' ? 'Drag bars to shift dates' : 'Read-only view'}</span>
          </div>
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => setMonthOffset(n => n - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #D4D1CB', padding: '3px 8px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>← Prev</button>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#0D0E12' }}>{monthFull[displayMonth]} {displayYear}</span>
              <button onClick={() => setMonthOffset(n => n + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #D4D1CB', padding: '3px 8px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#E2DFD9', border: '1px solid #E2DFD9', marginBottom: 1 }}>
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                <div key={d} style={{ background: '#F9F8F6', padding: '6px 8px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', letterSpacing: '.08em' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#E2DFD9', border: '1px solid #E2DFD9' }}>
              {monthCells.map((cell, i) => (
                <div key={i} style={{ background: cell.isOther ? '#F5F4F0' : cell.isToday ? '#EFF6FF' : cell.isWeekend ? '#F9F8F6' : '#fff', minHeight: 90, padding: 6 }}>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 4,
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', background: cell.isToday ? '#0071CE' : 'transparent',
                    color: cell.isOther ? '#C4C1BB' : cell.isToday ? 'white' : cell.isWeekend ? '#A09D98' : '#0D0E12',
                    fontWeight: cell.isToday ? 700 : 400,
                  }}>{cell.day}</div>
                  {cell.events.map((ev, j) => (
                    <div key={j} style={{ padding: '2px 5px', marginBottom: 2, background: ev.color, borderRadius: 2, fontSize: 9, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEAM VIEW ── */}
        {view === 'team' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#0D0E12' }}>Team Summary</div>
                <div style={{ fontSize: 11, color: '#7A7772', marginTop: 2 }}>All ramp plans · Week of Jul 13, 2026</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[
                  { label: 'AVG RAMP', val: Math.round(planData.reduce((s,se)=>s+se.rampPct,0)/planData.length)+'%', color: '#0D0E12' },
                  { label: 'AT RISK', val: planData.filter(se=>se.health==='critical'||se.health==='behind').length, color: '#B83128' },
                  { label: 'CONFLICTS', val: conflicts.length, color: '#D4810A' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#F9F8F6', border: '1px solid #E2DFD9', padding: '6px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: stat.color }}>{stat.val}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: '#A09D98', marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              {visibleSEs.map(se => {
                const upcoming = se.bars.filter(b=>b.startDay>=TODAY_DAY).sort((a,b)=>a.startDay-b.startDay)[0];
                const daysAway = upcoming ? upcoming.startDay - TODAY_DAY : 999;
                const nmColor = daysAway<=7?'#B83128':daysAway<=14?'#D4810A':'#0A6E45';
                const gatesCleared = se.bars.filter(b=>b.type==='gate'&&b.startDay<TODAY_DAY).length;
                return (
                  <div key={se.id} style={{ background: '#fff', border: `1px solid ${se.health==='critical'?'rgba(184,49,40,.3)':'#E2DFD9'}`, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={se.initials} bg={se.avatarBg} size={36} fontSize={12} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0E12' }}>{se.name}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: '#A09D98' }}>Basic SE · Day {se.dayInRamp}</div>
                        </div>
                      </div>
                      <HealthBadge label={se.healthLabel} color={se.healthColor} bg={se.healthBg} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10.5, color: '#6B6860' }}>Ramp progress</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: rampColor(se.health) }}>{se.rampPct}%</span>
                      </div>
                      <RampBar pct={se.rampPct} color={rampColor(se.health)} height={4} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#E2DFD9', border: '1px solid #E2DFD9', marginBottom: 10 }}>
                      {[['—', 'SIM AVG'], ['0/8', 'CERTS'], [`${gatesCleared}/5`, 'GATES']].map(([val, lbl]) => (
                        <div key={lbl} style={{ background: '#F9F8F6', padding: '7px 8px', textAlign: 'center' }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#0D0E12' }}>{val}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: '#A09D98', marginTop: 2 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: daysAway<=7?'#FFF5F5':daysAway<=14?'#FFFBF0':'#F0FDF7', border: `1px solid ${nmColor}22`, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 6, height: 6, background: nmColor, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: '#3D3C38' }}>{upcoming?.label || 'Plan complete'}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: nmColor }}>{upcoming ? `in ${daysAway}d` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: '#A09D98' }}>Mentor: <span style={{ color: se.mentor ? '#0D0E12' : '#B83128' }}>{se.mentor || 'Unassigned'}</span></span>
                      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #D4D1CB', padding: '3px 8px', fontSize: 9.5, fontWeight: 600, cursor: 'pointer' }}>Open plan →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIMELINE / GANTT VIEW ── */}
        {view === 'timeline' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
              <div style={{ minWidth: ganttTotalWidth, display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: '#F9F8F6', borderBottom: '2px solid #E2DFD9' }}>
                  <div style={{ width: 200, flexShrink: 0, position: 'sticky', left: 0, zIndex: 21, background: '#F9F8F6', borderRight: '1px solid #E2DFD9', padding: '0 14px', display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: '#A09D98', letterSpacing: '.12em', textTransform: 'uppercase' }}>MY TEAM · {visibleSEs.length} SEs</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                    {/* Month labels */}
                    <div style={{ height: 22, display: 'flex', position: 'relative', borderBottom: '1px solid #E2DFD9' }}>
                      {headerMonths.map(mon => (
                        <div key={mon.label} style={{ position: 'absolute', left: mon.leftPx, top: 0, height: 22, width: mon.widthPx, display: 'flex', alignItems: 'center', padding: '0 8px', borderRight: '1px solid #D4D1CB' }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 500, color: '#3D3C38', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{mon.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Day numbers */}
                    <div style={{ height: 26, display: 'flex', alignItems: 'center' }}>
                      {headerDays.map((hd, i) => (
                        <div key={i} style={{ width: DAY_PX, flexShrink: 0, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hd.isToday ? '#EFF6FF' : hd.isWeekend ? '#F5F4F0' : 'transparent', borderRight: '1px solid #F0EFEB' }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: hd.isToday ? '#0071CE' : hd.isWeekend ? '#C4C1BB' : '#7A7772', fontWeight: hd.isToday ? 600 : 400 }}>{hd.dayNum}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SE rows */}
                <div ref={ganttRowsRef}>
                  {visibleSEs.map(se => (
                    <div key={se.id} style={{ display: 'flex', borderBottom: '1px solid #E2DFD9', minHeight: 80 }}>
                      {/* SE info (sticky left) */}
                      <div style={{ width: 200, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, borderRight: '1px solid #E2DFD9', padding: '10px 14px', background: '#fff', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                          <Avatar initials={se.initials} bg={se.avatarBg} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0E12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{se.name}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98' }}>Day {se.dayInRamp} · {se.planName}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <HealthBadge label={se.healthLabel} color={se.healthColor} bg={se.healthBg} />
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3D3C38', fontWeight: 500 }}>{se.rampPct}%</span>
                        </div>
                        <RampBar pct={se.rampPct} color={rampColor(se.health)} />
                      </div>

                      {/* Bars area */}
                      <div style={{ flex: 1, position: 'relative', minHeight: 80, background: conflicts.some(c => c.seId === se.id) ? 'rgba(184,49,40,.02)' : 'transparent' }}>
                        {/* Weekend stripes */}
                        <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(90deg, transparent 0, transparent ${5*DAY_PX}px, rgba(0,0,0,.025) ${5*DAY_PX}px, rgba(0,0,0,.025) ${7*DAY_PX}px)`, pointerEvents: 'none', zIndex: 1 }} />
                        {/* Today line */}
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: TODAY_DAY * DAY_PX, width: 2, background: '#0071CE', zIndex: 9, pointerEvents: 'none' }}>
                          <span style={{ position: 'absolute', top: 2, left: 3, fontFamily: "'DM Mono', monospace", fontSize: 7, color: '#0071CE', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>TODAY</span>
                        </div>
                        {/* Bars */}
                        {se.bars.map(bar => {
                          const color = BAR_COLORS[bar.type] || '#888';
                          const leftPx = bar.startDay * DAY_PX;
                          const isGate = bar.type === 'gate';
                          if (isGate) {
                            const hasConflict = conflictBarIds.has(bar.id);
                            return (
                              <React.Fragment key={bar.id}>
                                <div title={bar.label} style={{ position: 'absolute', left: leftPx - 7, top: 30, zIndex: 8, pointerEvents: 'none' }}>
                                  <div style={{ width: 14, height: 14, background: hasConflict ? '#B83128' : '#00143A', transform: 'rotate(45deg)' }} />
                                </div>
                                <div style={{ position: 'absolute', left: leftPx - 10, top: 48, fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: hasConflict ? '#B83128' : '#00143A', whiteSpace: 'nowrap', zIndex: 8, pointerEvents: 'none' }}>{bar.label}</div>
                                {hasConflict && <div style={{ position: 'absolute', left: leftPx - 4, top: 26, width: 8, height: 8, borderRadius: '50%', background: '#B83128', border: '1.5px solid white', zIndex: 20, pointerEvents: 'none' }} />}
                              </React.Fragment>
                            );
                          }
                          const widthPx = Math.max((bar.days || 1) * DAY_PX, 30);
                          const isTrackA = bar.type === 'content';
                          const topPx = isTrackA ? 8 : 34;
                          const heightPx = isTrackA ? 22 : 16;
                          const pct = bar.pct ?? 100;
                          const rgbaSet = RGBA_COLORS[color] || ['rgba(128,128,128,.88)', 'rgba(128,128,128,.28)'];
                          const bgColor = pct === 100 ? rgbaSet[0] : rgbaSet[1];
                          const progressWidth = Math.round(pct * widthPx / 100);
                          const hasConflict = conflictBarIds.has(bar.id);
                          const shortLabel = bar.label.length > 24 ? bar.label.slice(0, 22) + '…' : bar.label;
                          return (
                            <div
                              key={bar.id}
                              data-bar-id={bar.id}
                              data-se-id={se.id}
                              title={bar.label}
                              style={{
                                position: 'absolute', left: leftPx, width: widthPx, top: topPx, height: heightPx,
                                background: bgColor, zIndex: isTrackA ? 3 : 5,
                                cursor: role === 'manager' ? 'grab' : 'default',
                                userSelect: 'none', overflow: 'hidden', transition: 'filter 80ms',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
                              onMouseLeave={e => (e.currentTarget.style.filter = '')}
                            >
                              <div style={{ position: 'absolute', top: 0, left: 0, width: progressWidth, bottom: 0, background: color }} />
                              <div style={{ position: 'absolute', inset: 0, padding: '0 6px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,.25)' }}>
                                  {shortLabel}
                                </span>
                              </div>
                              {hasConflict && <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#B83128', border: '1.5px solid white', zIndex: 20, pointerEvents: 'none' }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Segment bands footer */}
                  <div style={{ height: 28, display: 'flex', borderTop: '2px solid #E2DFD9', background: '#F9F8F6' }}>
                    <div style={{ width: 200, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: '#F9F8F6', borderRight: '1px solid #E2DFD9', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: '#A09D98', letterSpacing: '.1em', textTransform: 'uppercase' }}>Segments</span>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {[
                        { label: 'SEG 1 · Days 1–30',  left: 0,          color: '#0057a8' },
                        { label: 'SEG 2 · Days 31–60', left: 30 * DAY_PX, color: '#A51E8E' },
                        { label: 'SEG 3 · Days 61–90', left: 60 * DAY_PX, color: '#0A6E45' },
                      ].map(seg => (
                        <div key={seg.label} style={{ position: 'absolute', left: seg.left, width: 30 * DAY_PX, top: 0, bottom: 0, borderRight: '1px dashed rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: seg.color, letterSpacing: '.07em', whiteSpace: 'nowrap' }}>{seg.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status bar */}
        <div style={{ height: 30, background: '#fff', borderTop: '1px solid #E2DFD9', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#A09D98' }}>
              {pendingChanges > 0 ? `${pendingChanges} unsaved change${pendingChanges > 1 ? 's' : ''}` : 'No unsaved changes'}
            </span>
            {conflicts.length > 0 && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#B83128' }}>
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need attention
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0A6E45' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#6B6860' }}>Jun 1 – Sep 28, 2026 · 120 days</span>
          </div>
        </div>

      </div>
    </div>
  );
}
