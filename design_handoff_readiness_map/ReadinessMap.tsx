/**
 * ReadinessMap.tsx
 *
 * Manager Coaching Intelligence — Readiness Map
 *
 * INSTRUCTIONS FOR CURSOR:
 * 1. This is a self-contained React component. Drop it into your pages/ or app/ directory.
 * 2. It uses Tailwind-compatible inline styles — no external CSS needed beyond font imports.
 * 3. Add these Google Fonts to your layout/head:
 *    DM Sans (400,500,600), DM Mono (300,400,500), Syne (600,700,800)
 * 4. Replace the mock `SE_DATA` and `COACHING_DATA` with real API data.
 * 5. The sidebar/topbar are included as stubs — replace with your app's nav shell.
 *
 * KEY INTERACTIONS:
 * - Click any heatmap cell → panel slides in from right
 * - Click × → panel closes
 * - WEEKLY/MONTHLY toggle → sparklines + labels update
 */

import React, { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

type SEName = 'Finn' | 'Demo' | 'Gray' | 'Harper';
type DimName = 'Ramp' | 'Sims' | 'Segments' | 'Certs' | 'Lab' | 'Pitch';
type ViewMode = 'weekly' | 'monthly';
type StatusLevel = 'critical' | 'risk' | 'good';

interface CellData {
  score: string;
  status: string;
  insight: string;
  level: StatusLevel;
  actions: [string, string][];
}

interface SEProfile {
  initial: string;
  avatarGradient: string;
  composite: number;
  compositeColor: string;
  tenure: string;
  dims: Record<DimName, CellData>;
}

interface SparklineSet {
  pts: string;
  endY: number;
  delta: string;
}

// ─── Colors ────────────────────────────────────────────────────────────────

const C = {
  navy: '#00143A',
  blue: '#0071CE',
  pink: '#CC27B0',
  green: '#0A6E45',
  red: '#B83128',
  amber: '#D4810A',
  border: '#E2DFD9',
  surface: '#F9F8F6',
  bg: '#F5F4F0',
  text: '#0D0E12',
  gray: '#7A7772',
  muted: '#A09D98',
};

const levelStyles: Record<StatusLevel, { bg: string; text: string; border: string; cellBg: string }> = {
  critical: { bg: 'rgba(184,49,40,.06)', text: '#B83128', border: 'rgba(184,49,40,.2)', cellBg: 'rgba(184,49,40,.14)' },
  risk:     { bg: 'rgba(212,129,10,.06)', text: '#D4810A', border: 'rgba(212,129,10,.2)', cellBg: 'rgba(212,129,10,.10)' },
  good:     { bg: 'rgba(10,110,69,.06)', text: '#0A6E45', border: 'rgba(10,110,69,.2)', cellBg: 'rgba(10,110,69,.10)' },
};

// ─── Data ──────────────────────────────────────────────────────────────────

const SE_DATA: Record<SEName, SEProfile> = {
  Finn: {
    initial: 'F', avatarGradient: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    composite: 14, compositeColor: '#B83128', tenure: 'Day 22',
    dims: {
      Ramp:     { score: '18%', status: 'Critical delay',    level: 'critical', insight: 'Finn is at 18% completion on day 22 — expected pace is ~35%. Recommend reviewing blockers in next 1:1 and adjusting step deadlines.', actions: [['Open ramp plan', "Review Finn's current step and unblock"], ['Assign challenge', 'A targeted practice challenge to re-engage'], ['Adjust step dates', 'Push out blocked steps in Plan Calendar']] },
      Sims:     { score: '0',    status: 'No sims completed', level: 'critical', insight: 'Finn has not run any simulations yet. At day 22, at least 2 coaching sim reviews should be logged.', actions: [['Assign SailPoint sim', 'Send discovery call sim to Finn today'], ['Create coaching card', 'Log a manual coaching card after next shadow'], ['View sim library', "Browse available sims for Finn's current segment"]] },
      Segments: { score: '1/4',  status: 'Segment 1 only',   level: 'critical', insight: 'Finn has only unlocked Segment 1. Segment 2 requires completing 3 ramp activities — check which are blocking.', actions: [['View segment criteria', 'See exactly what unlocks Segment 2 for Finn'], ['Assign lab exercise', 'Technical lab to accelerate segment unlock'], ['Add mentor session', 'Pair Finn with Harper for segment walkthrough']] },
      Certs:    { score: '0/8',  status: 'No certifications', level: 'risk',     insight: 'Zero certs at day 22 is expected — first cert is typically targeted at day 45. No action needed yet, but set a target.', actions: [['Set cert target date', 'Pin the first cert goal in Certifications'], ['Preview cert path', 'Show Finn the 8-cert roadmap so they plan ahead'], ['Assign prep material', 'Queue cert prep activities in ramp plan']] },
      Lab:      { score: '0.5h', status: 'Far behind target', level: 'critical', insight: "Target is 5 lab hours per week. 0.5h means Finn may not have access to the lab environment. Check lab provisioning.", actions: [["Check lab access", "Verify Finn's lab environment is provisioned"], ['Assign lab challenge', 'Add a 2h structured lab activity to the plan'], ['Schedule lab time', 'Block 1h daily in calendar for lab practice']] },
      Pitch:    { score: '52',   status: 'Needs coaching',    level: 'risk',     insight: 'Pitch score of 52 is below the 70 threshold. Finn has room to improve value positioning — recommend a roleplay session.', actions: [['Run pitch sim', 'Assign a product pitch sim for immediate practice'], ['Send pitch framework', 'Share SailPoint value framework reference card'], ['Shadow next pitch', 'Schedule Finn to shadow your next customer call']] },
    },
  },
  Demo: {
    initial: 'D', avatarGradient: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    composite: 22, compositeColor: '#B83128', tenure: 'Day 45',
    dims: {
      Ramp:     { score: '12%', status: 'Critical — 33pts behind', level: 'critical', insight: "At day 45, expected completion is ~45%. Demo is at 12% — this is a significant gap. Identify if it's a workload, motivation, or clarity issue.", actions: [['1:1 ramp review', 'Dedicated 30min to walk the plan step by step'], ['Remove blockers', 'Check for steps waiting on manager approval'], ['Adjust plan scope', 'Consider resetting timeline in Assign Plans']] },
      Sims:     { score: '78',  status: 'Strong performer',        level: 'good',     insight: 'Demo has the highest sim score on the team at 78. This is a genuine strength — leverage for peer coaching.', actions: [['Peer coaching', 'Ask Demo to run a sim debrief for Finn'], ['Advanced sim', 'Assign a complex multi-stakeholder sim'], ['Recognize achievement', 'Log a positive coaching card for this strength']] },
      Segments: { score: '1/4', status: 'Segment 1 only',          level: 'critical', insight: "Segment unlock depends on ramp completion. Demo's ramp delay is the root cause — fixing ramp unblocks segments.", actions: [['Accelerate ramp steps', 'Focus this week on segment-unlocking activities'], ['Pair with Harper', 'Harper completed seg 2 — can guide Demo'], ['Review segment map', 'Clarify what each segment unlock requires']] },
      Certs:    { score: '0/8', status: 'No certifications yet',   level: 'critical', insight: "At day 45, first cert is overdue by ~2 weeks. Demo's ramp delay may be blocking cert eligibility — check prereqs.", actions: [['Check cert prereqs', 'See what ramp steps unlock cert eligibility'], ['Fast-track cert prep', 'Prioritize cert-adjacent ramp activities'], ['Set cert deadline', 'Create an urgent milestone in Plan Calendar']] },
      Lab:      { score: '3.2h', status: 'Short of 5h target',     level: 'risk',     insight: '3.2h lab time is decent but below the weekly target of 5h. Encourage focused lab sessions on SailPoint core modules.', actions: [['Recommend lab module', 'Queue the IIQ core module for this week'], ['Block lab time', 'Add 2h lab blocks to calendar to hit target'], ['Lab buddy pairing', 'Pair Demo with Harper for co-lab sessions']] },
      Pitch:    { score: '63',  status: 'Approaching threshold',   level: 'risk',     insight: "Demo's pitch is trending up. 7 more points to hit the 70 threshold. One focused roleplay session could close the gap.", actions: [['Roleplay session', 'Schedule a 30min pitch practice with feedback'], ['Assign pitch sim', 'Send executive pitch sim for extra practice'], ['Review last pitch card', 'Revisit notes from last coaching card together']] },
    },
  },
  Gray: {
    initial: 'G', avatarGradient: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    composite: 48, compositeColor: '#D4810A', tenure: 'Day 68',
    dims: {
      Ramp:     { score: '62%', status: 'On pace',          level: 'risk',     insight: 'Gray is on pace for their tenure. Expected is ~65% at day 68 — nearly there. Maintain current momentum.', actions: [['Review next milestones', 'Preview the remaining plan steps together'], ['Accelerate one step', 'Identify one step to complete ahead of schedule'], ['Plan final stretch', 'Map out remaining weeks to completion']] },
      Sims:     { score: '0',   status: 'No sims completed', level: 'critical', insight: 'At day 68, Gray should have completed 4–6 sim reviews. Zero sims is a gap — may indicate coaching cadence missed.', actions: [['Assign 2 sims now', 'Queue discovery + technical sims immediately'], ['Open coaching cadence', "Review Gray's coaching schedule — likely missed"], ['Schedule shadow', 'Book a live customer call shadow with debrief']] },
      Segments: { score: '1/4', status: 'Behind at day 68', level: 'critical', insight: 'Segment 1 only at day 68 is behind. At this stage, seg 2 should be unlocked. Linked to ramp and lab gaps.', actions: [['Unlock seg 2 sprint', 'Focused week on the 3 activities blocking seg 2'], ['Review with Harper', 'Harper on seg 2 — pair for peer walkthrough'], ['Adjust seg milestones', 'Reset target dates in Program Tracker']] },
      Certs:    { score: '0/8', status: 'Urgent at day 68', level: 'critical', insight: 'Zero certs at day 68 is a red flag. First 2 certs should be approved by now. Check if submissions are in review or not started.', actions: [['Check cert submissions', 'See if any certs are in review or blocked'], ['Fast-track first cert', 'Start the IdentityIQ core cert this week'], ['Set cert deadline', 'Add urgent cert deadline in Plan Calendar']] },
      Lab:      { score: '1.8h', status: 'Critical lab gap', level: 'critical', insight: "1.8h vs 5h target is a significant deficit at day 68. Gray may have capacity constraints — worth exploring in 1:1.", actions: [["1:1 capacity check", "Discuss what's blocking lab time this week"], ['Assign focused lab', '3h lab exercise targeting cert prereqs'], ['Remove meetings', 'Check if over-scheduled — clear lab time in calendar']] },
      Pitch:    { score: '71',  status: 'Above threshold',   level: 'good',     insight: 'Pitch score of 71 is above the 70 threshold. Gray is solid here — no action needed beyond routine coaching.', actions: [['Advanced pitch sim', 'Challenge Gray with a C-level pitch sim'], ['Peer coach', 'Ask Gray to mentor Finn on pitch delivery'], ['Log coaching card', "Document this strength for Gray's record"]] },
    },
  },
  Harper: {
    initial: 'H', avatarGradient: 'linear-gradient(135deg,#0A6E45,#14a065)',
    composite: 71, compositeColor: '#0A6E45', tenure: 'Day 90',
    dims: {
      Ramp:     { score: '78%', status: 'Ahead of pace',     level: 'good',     insight: 'Harper is ahead of expected pace at day 90. On track to complete ramp before the 120-day target. Minimal management needed.', actions: [['Accelerate final steps', 'Identify steps completable in next 2 weeks'], ['Plan post-ramp goals', 'Start discussing Q3 development goals'], ['Peer mentor role', 'Formalize Harper as a peer mentor for Finn']] },
      Sims:     { score: '78',  status: 'Strong performer',   level: 'good',     insight: "Harper's sim score of 78 is the team high. Consistently strong — ready for advanced sim scenarios.", actions: [['Enterprise sim', 'Assign advanced multi-stakeholder sim'], ['Log coaching card', 'Document this strength for career record'], ['Peer sim debrief', 'Run a team sim debrief led by Harper']] },
      Segments: { score: '2/4', status: 'Halfway through',    level: 'risk',     insight: 'Seg 2 unlocked at day 90 is reasonable but seg 3 should be targeted this month. At current pace, will finish on schedule.', actions: [['Unlock seg 3 plan', 'Map the 4 activities needed for seg 3'], ['Assign seg 3 lab', 'Technical lab aligned to segment 3 criteria'], ['Set target date', 'Pin seg 3 milestone in Plan Calendar']] },
      Certs:    { score: '0/8', status: 'First cert overdue', level: 'critical', insight: 'At day 90, first cert should be approved. Check if a submission is in progress or if it hasn\'t been started yet.', actions: [['Check cert status', 'See if Harper has a cert in review'], ['Start first cert now', 'Begin the IdentityIQ Admin cert immediately'], ['Set cert deadline', 'Target: first cert approved by end of month']] },
      Lab:      { score: '4.2h', status: 'Close to target',   level: 'risk',     insight: '4.2h vs 5h target — Harper is nearly there. One additional focused session would clear the weekly goal.', actions: [['One more lab session', 'Encourage a 1h session to hit the 5h target'], ['Advanced lab module', 'Assign a complex IIQ module matching seg 3'], ['Track lab habit', 'Check in on daily lab routine in next 1:1']] },
      Pitch:    { score: '82',  status: 'Ready for field',    level: 'good',     insight: "Harper's pitch score of 82 is excellent — top of the team. Ready to lead customer pitches independently.", actions: [['Solo pitch assignment', 'Give Harper a real customer discovery call'], ['Document as example', 'Capture pitch recording as team training material'], ['Advanced scenario', 'Assign a competitive displacement pitch sim']] },
    },
  },
};

const SPARKLINES: Record<ViewMode, Record<SEName, SparklineSet>> = {
  weekly: {
    Finn:   { pts: '0,20 12,18 24,22 36,20 48,17 60,16', endY: 16, delta: '+2 wk' },
    Demo:   { pts: '0,22 12,18 24,16 36,14 48,11 60,10', endY: 10, delta: '+5 wk' },
    Gray:   { pts: '0,18 12,20 24,17 36,15 48,14 60,13', endY: 13, delta: '+3 wk' },
    Harper: { pts: '0,22 12,17 24,13 36,10 48,7 60,5',   endY:  5, delta: '+8 wk' },
  },
  monthly: {
    Finn:   { pts: '0,22 15,21 30,20 45,19 60,17', endY: 17, delta: '+5 mo' },
    Demo:   { pts: '0,23 15,20 30,17 45,14 60,10', endY: 10, delta: '+13 mo' },
    Gray:   { pts: '0,21 15,19 30,17 45,15 60,12', endY: 12, delta: '+9 mo' },
    Harper: { pts: '0,20 15,16 30,12 45,8 60,4',   endY:  4, delta: '+16 mo' },
  },
};

const SE_NAMES: SEName[] = ['Finn', 'Demo', 'Gray', 'Harper'];
const DIM_NAMES: DimName[] = ['Ramp', 'Sims', 'Segments', 'Certs', 'Lab', 'Pitch'];

const PRIORITIES: { se: SEName; dim: DimName; desc: string }[] = [
  { se: 'Finn',  dim: 'Sims',  desc: '0 sims, 0 certs, stuck on segment 1' },
  { se: 'Demo',  dim: 'Ramp',  desc: 'ramp only 12%, 0 certs' },
  { se: 'Gray',  dim: 'Certs', desc: 'cert gap, lab hours behind' },
];

const ACTION_COLORS = ['#0071CE', '#CC27B0', '#0A6E45'];

// ─── Sub-components ────────────────────────────────────────────────────────

const Avatar: React.FC<{ initial: string; gradient: string; size?: number; fontSize?: number }> = ({
  initial, gradient, size = 28, fontSize = 10
}) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: gradient,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Mono', monospace", fontSize, fontWeight: 600, color: 'white',
    flexShrink: 0,
  }}>{initial}</div>
);

const Sparkline: React.FC<{ se: SEName; viewMode: ViewMode }> = ({ se, viewMode }) => {
  const sp = SPARKLINES[viewMode][se];
  const color = sp.delta.startsWith('+') ? '#0A6E45' : '#B83128';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <svg width="60" height="24" viewBox="0 0 60 24">
        <polyline points={sp.pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy={sp.endY} r="2.5" fill={color} />
      </svg>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color }}>{sp.delta}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{ height: 3, background: '#ECEAE6', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: color }} />
  </div>
);

const SegBar: React.FC<{ unlocked: number; total: number; color: string }> = ({ unlocked, total, color }) => (
  <div style={{ height: 3, display: 'flex', gap: 2 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ flex: 1, background: i < unlocked ? color : '#ECEAE6' }} />
    ))}
  </div>
);

const HeatCell: React.FC<{
  se: SEName; dim: DimName; data: CellData;
  onClick: () => void; isSelected: boolean;
}> = ({ dim, data, onClick, isSelected }) => {
  const s = levelStyles[data.level];
  const pctMap: Record<string, number | null> = {
    '18%': 18, '12%': 12, '62%': 62, '78%': 78,
    '52': 52, '63': 63, '71': 71, '82': 82,
  };
  const pct = pctMap[data.score] ?? null;
  const segMatch = data.score.match(/^(\d)\/(\d)$/);

  return (
    <div
      onClick={onClick}
      style={{
        borderLeft: `1px solid ${C.border}`,
        background: isSelected ? s.cellBg + '99' : s.cellBg,
        padding: '12px 8px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
        cursor: 'pointer',
        outline: isSelected ? `2px solid ${C.blue}` : 'none',
        outlineOffset: -1,
        transition: 'filter 80ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(.92)')}
      onMouseLeave={e => (e.currentTarget.style.filter = '')}
    >
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: s.text }}>
        {data.score}
      </div>
      {pct !== null && dim !== 'Sims' && dim !== 'Lab' && (
        <ProgressBar pct={pct} color={s.text} />
      )}
      {segMatch && (
        <SegBar unlocked={parseInt(segMatch[1])} total={parseInt(segMatch[2])} color={s.text} />
      )}
      <div style={{ fontSize: 8.5, color: s.text }}>{data.status}</div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReadinessMap() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedSe, setSelectedSe] = useState<SEName>('Finn');
  const [selectedDim, setSelectedDim] = useState<DimName>('Ramp');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  const openPanel = (se: SEName, dim: DimName) => {
    setSelectedSe(se);
    setSelectedDim(dim);
    setPanelOpen(true);
  };

  const seData = SE_DATA[selectedSe];
  const dimData = seData?.dims[selectedDim];
  const levelS = dimData ? levelStyles[dimData.level] : levelStyles.risk;

  const viewLabel = viewMode === 'weekly' ? 'W28 · Jul 7–13' : 'Jun 2026';
  const trendLabel = viewMode === 'weekly' ? 'Trend' : '4-wk Trend';
  const trendSub   = viewMode === 'weekly' ? 'vs last week' : 'rolling 4 weeks';
  const trendDelta = viewMode === 'weekly' ? '+4 vs last week' : '+11 vs last month';

  // ── Shared text styles ──
  const mono = (size: number, color: string = C.text, weight: number = 400): React.CSSProperties => ({
    fontFamily: "'DM Mono', monospace", fontSize: size, color, fontWeight: weight,
  });
  const sans = (size: number, color: string = C.text, weight: number = 400): React.CSSProperties => ({
    fontFamily: "'DM Sans', sans-serif", fontSize: size, color, fontWeight: weight,
  });
  const syne = (size: number, color: string = C.text, weight: number = 800): React.CSSProperties => ({
    fontFamily: "'Syne', sans-serif", fontSize: size, color, fontWeight: weight,
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 214, flexShrink: 0, background: C.navy,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      }}>
        {/* Gradient top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,#0071CE,#CC27B0)', zIndex: 2,
        }} />

        {/* Wordmark */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10.5 2C10.5 2 16.5 6 16.5 13H10.5V2Z" fill="white" />
              <path d="M10.5 5C10.5 5 4.5 8 4.5 13H10.5V5Z" fill="rgba(255,255,255,0.32)" />
              <path d="M3 14.5H17" stroke="white" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
            <span style={syne(14, '#fff', 800)}>SailPoint</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            <span style={mono(8, 'rgba(255,255,255,.2)')}>ENABLEMENT</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(204,39,176,.6)', flexShrink: 0 }} />
            <span style={mono(8, 'rgba(204,39,176,.65)')}>MANAGER</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {/* COMMAND */}
          <div style={{ padding: '10px 16px 4px', ...mono(7.5, 'rgba(255,255,255,.38)'), letterSpacing: '.16em' }}>COMMAND</div>
          <NavItem label="Command Center" active={false} />
          <NavItem label="Action Inbox"   active={false} badge="7" />
          <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '8px 0' }} />
          <div style={{ padding: '3px 16px', ...mono(7.5, 'rgba(255,255,255,.38)'), letterSpacing: '.16em' }}>TEAM</div>
          <NavItem label="Team Roster"   active={false} />
          <NavItem label="Readiness Map" active={true} />
          <NavItem label="Leaderboard"   active={false} />
          <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '8px 0' }} />
          <div style={{ padding: '3px 16px', ...mono(7.5, 'rgba(255,255,255,.38)'), letterSpacing: '.16em' }}>COACHING</div>
          <NavItem label="Coaching Cadence" active={false} />
          <NavItem label="My Mentees"       active={false} />
        </nav>

        {/* User */}
        <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar initial="DM" gradient="linear-gradient(135deg,#0033a1,#0071CE)" size={28} fontSize={9.5} />
          <div>
            <div style={sans(11.5, 'rgba(255,255,255,.82)', 500)}>Demo Manager</div>
            <div style={mono(8, 'rgba(255,255,255,.25)')}>Manager</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 44, background: '#fff', borderBottom: `1px solid ${C.border}`,
          padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={mono(10.5, C.muted)}>Team</span>
            <span style={{ color: '#C4C1BB', fontSize: 11, margin: '0 2px' }}>›</span>
            <span style={mono(10.5, '#3D3C38', 500)}>Readiness Map</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Weekly/Monthly toggle */}
            <div style={{ display: 'flex', border: `1px solid #D4D1CB`, overflow: 'hidden' }}>
              {(['weekly', 'monthly'] as ViewMode[]).map((v, i) => (
                <React.Fragment key={v}>
                  {i > 0 && <div style={{ width: 1, background: '#D4D1CB' }} />}
                  <button
                    onClick={() => setViewMode(v)}
                    style={{
                      padding: '4px 10px',
                      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '.06em',
                      cursor: 'pointer', border: 'none',
                      background: viewMode === v ? C.navy : '#fff',
                      color: viewMode === v ? '#fff' : '#7A7772',
                      transition: 'background 100ms, color 100ms',
                    }}
                  >
                    {v.toUpperCase()}
                  </button>
                </React.Fragment>
              ))}
            </div>
            {/* Date badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0F7FF', border: '1px solid #C5DCF5', padding: '4px 10px' }}>
              <span style={mono(9, C.blue)}>{viewLabel}</span>
            </div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: `1px solid #D4D1CB`,
              padding: '5px 10px', fontFamily: "'DM Sans', sans-serif",
              fontSize: 10, fontWeight: 600, color: '#3D3C38', cursor: 'pointer',
            }}>
              + New coaching card
            </button>
            <Avatar initial="DM" gradient="linear-gradient(135deg,#0033a1,#0071CE)" size={30} fontSize={9.5} />
          </div>
        </header>

        {/* Intel Strip */}
        <div style={{
          background: C.navy, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
        }}>
          {/* Team score */}
          <div style={{ paddingRight: 20, borderRight: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ ...mono(7.5, 'rgba(255,255,255,.35)'), letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 2 }}>Team Readiness</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={syne(26, '#fff')}>36</span>
              <span style={mono(9, 'rgba(255,255,255,.4)')}>/100</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(212,129,10,.18)', border: '1px solid rgba(212,129,10,.3)', padding: '2px 7px' }}>
                <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1 6l3-4 3 4" stroke="#D4810A" strokeWidth="1.3" strokeLinecap="round" /></svg>
                <span style={mono(8.5, '#D4810A')}>{trendDelta}</span>
              </div>
            </div>
          </div>

          {/* Dimension pillars */}
          {([
            { label: 'RAMP',     value: '43%',  badge: 'AT RISK',  badgeColor: 'rgba(212,129,10,.8)',  badgeBg: 'rgba(212,129,10,.12)' },
            { label: 'SIMS',     value: '20',   badge: 'LOW',      badgeColor: 'rgba(184,49,40,.9)',   badgeBg: 'rgba(184,49,40,.15)' },
            { label: 'SEGMENTS', value: '1.0',  badge: 'LOW',      badgeColor: 'rgba(184,49,40,.9)',   badgeBg: 'rgba(184,49,40,.15)' },
            { label: 'CERTS',    value: '0',    badge: 'CRITICAL', badgeColor: 'rgba(184,49,40,.9)',   badgeBg: 'rgba(184,49,40,.15)' },
            { label: 'LAB',      value: '2.4h', badge: 'AT RISK',  badgeColor: 'rgba(212,129,10,.8)',  badgeBg: 'rgba(212,129,10,.12)' },
            { label: 'PITCH',    value: '61',   badge: 'AT RISK',  badgeColor: 'rgba(212,129,10,.8)',  badgeBg: 'rgba(212,129,10,.12)' },
          ] as const).map((dim, i, arr) => (
            <div key={dim.label} style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: '0 16px',
              paddingLeft: i === 0 ? 20 : 16,
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none',
            }}>
              <span style={{ ...mono(7.5, 'rgba(255,255,255,.3)'), letterSpacing: '.1em' }}>{dim.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={sans(14, '#fff', 600)}>{dim.value}</span>
                <span style={{ ...mono(7.5, dim.badgeColor), background: dim.badgeBg, padding: '1px 5px' }}>{dim.badge}</span>
              </div>
            </div>
          ))}

          <div style={{ marginLeft: 'auto' }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,113,206,.15)', border: '1px solid rgba(0,113,206,.4)',
              color: 'rgba(0,113,206,.9)', padding: '6px 12px', fontSize: 10,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: 'pointer',
            }}>
              Open all coaching plans
            </button>
          </div>
        </div>

        {/* Heatmap + Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Heatmap */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

            {/* Priority callout */}
            <div style={{
              background: '#fff', border: `1px solid ${C.border}`, padding: '12px 16px',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 3, alignSelf: 'stretch', background: C.red, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={sans(11.5, C.text, 600)}>3 coaching priorities this week</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
                  {PRIORITIES.map((p, i) => (
                    <React.Fragment key={p.se}>
                      {i > 0 && <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar initial={p.se[0]} gradient={SE_DATA[p.se].avatarGradient} size={20} fontSize={9} />
                        <div>
                          <span style={sans(11, C.text, 500)}>{p.se}</span>
                          <span style={sans(11, C.gray)}> — {p.desc}</span>
                        </div>
                        <button
                          onClick={() => openPanel(p.se, p.dim)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: i < 2 ? C.blue : 'transparent',
                            border: i < 2 ? 'none' : `1px solid #D4D1CB`,
                            color: i < 2 ? '#fff' : '#3D3C38',
                            padding: '4px 9px', fontSize: 9.5, fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                          }}
                        >
                          Coach now →
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap table */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(6,1fr) 90px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...mono(8, C.muted), letterSpacing: '.1em', textTransform: 'uppercase' }}>SE</span>
                  <span style={{ ...mono(8, C.muted), letterSpacing: '.05em' }}>Composite</span>
                </div>
                {DIM_NAMES.map(dim => (
                  <div key={dim} style={{ padding: '10px 8px', borderLeft: `1px solid ${C.border}` }}>
                    <div style={{ ...mono(8, '#3D3C38', 500), letterSpacing: '.07em', textTransform: 'uppercase' }}>{dim}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>
                      {dim === 'Ramp' ? 'plan %' : dim === 'Sims' ? 'avg score /100' : dim === 'Segments' ? 'unlocked /4' : dim === 'Certs' ? 'approved /8' : dim === 'Lab' ? 'hours this week' : 'last score /100'}
                    </div>
                  </div>
                ))}
                <div style={{ padding: '10px 8px', borderLeft: `1px solid ${C.border}` }}>
                  <div style={{ ...mono(8, C.muted), letterSpacing: '.07em', textTransform: 'uppercase' }}>{trendLabel}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{trendSub}</div>
                </div>
              </div>

              {/* SE rows */}
              {SE_NAMES.map((se, seIdx) => {
                const profile = SE_DATA[se];
                return (
                  <div
                    key={se}
                    style={{
                      display: 'grid', gridTemplateColumns: '180px repeat(6,1fr) 90px',
                      borderBottom: seIdx < SE_NAMES.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    {/* Name column */}
                    <div
                      onClick={() => openPanel(se, 'Ramp')}
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <Avatar initial={profile.initial} gradient={profile.avatarGradient} />
                      <div>
                        <div style={sans(12, C.text, 500)}>{se}</div>
                        <div style={mono(8, C.muted)}>{profile.tenure}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', ...syne(16, profile.compositeColor, 700) }}>{profile.composite}</div>
                    </div>

                    {/* Data cells */}
                    {DIM_NAMES.map(dim => (
                      <HeatCell
                        key={dim}
                        se={se} dim={dim}
                        data={profile.dims[dim]}
                        onClick={() => openPanel(se, dim)}
                        isSelected={panelOpen && selectedSe === se && selectedDim === dim}
                      />
                    ))}

                    {/* Sparkline */}
                    <div style={{ borderLeft: `1px solid ${C.border}`, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkline se={se} viewMode={viewMode} />
                    </div>
                  </div>
                );
              })}

              {/* Team avg footer */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(6,1fr) 90px', background: C.surface, borderTop: `2px solid ${C.border}` }}>
                <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ ...mono(8, C.muted), letterSpacing: '.08em', textTransform: 'uppercase' }}>Team avg</span>
                </div>
                {(['43%','20','1.0/4','0/8','2.4h','67'] as const).map((v, i) => (
                  <div key={i} style={{ borderLeft: `1px solid ${C.border}`, padding: 8 }}>
                    <span style={{ ...mono(11, i === 0 ? '#D4810A' : '#B83128', 500) }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderLeft: `1px solid ${C.border}` }} />
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
              {[
                { label: 'Critical (<40)',  bg: 'rgba(184,49,40,.18)', border: 'rgba(184,49,40,.3)' },
                { label: 'At risk (40–69)', bg: 'rgba(212,129,10,.12)', border: 'rgba(212,129,10,.3)' },
                { label: 'On track (70+)',  bg: 'rgba(10,110,69,.12)',  border: 'rgba(10,110,69,.25)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, background: l.bg, border: `1px solid ${l.border}` }} />
                  <span style={sans(10, C.gray)}>{l.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', ...sans(10, C.muted) }}>Click any cell to open coaching actions</div>
            </div>
          </div>

          {/* Coaching Panel */}
          <div style={{
            width: 300, flexShrink: 0,
            borderLeft: panelOpen ? `1px solid ${C.border}` : 'none',
            overflowY: 'auto', background: '#fff',
            display: 'flex', flexDirection: 'column',
            transform: panelOpen ? 'translateX(0)' : 'translateX(300px)',
            transition: 'transform 200ms cubic-bezier(.16,1,.3,1)',
          }}>
            {dimData && (
              <>
                {/* Panel header */}
                <div style={{
                  padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0, background: C.surface,
                }}>
                  <div>
                    <div style={{ ...mono(8, C.muted), letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>Coaching Focus</div>
                    <div style={sans(13, C.text, 600)}>{selectedSe} · {selectedDim}</div>
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.gray, flexShrink: 0,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 1l10 10M11 1L1 11" />
                    </svg>
                  </button>
                </div>

                {/* Context score */}
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Avatar initial={seData.initial} gradient={seData.avatarGradient} size={36} fontSize={13} />
                    <div>
                      <div style={sans(13, C.text, 600)}>{selectedSe}</div>
                      <div style={sans(11, C.gray)}>{seData.tenure} · composite score {seData.composite}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ ...mono(9, C.muted), marginBottom: 1 }}>{selectedDim}</div>
                      <div style={syne(22, levelS.text)}>{dimData.score}</div>
                    </div>
                  </div>
                  <div style={{ background: levelS.bg, border: `1px solid ${levelS.border}`, padding: '8px 10px' }}>
                    <div style={sans(11, levelS.text, 500)}>{dimData.status}</div>
                    <div style={{ fontSize: 10.5, color: '#5A5855', lineHeight: 1.4, marginTop: 2 }}>{dimData.insight}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <div style={{ ...mono(8, C.muted), letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Recommended Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dimData.actions.map(([title, desc], i) => (
                      <div key={i} style={{ border: `1px solid ${C.border}`, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: ACTION_COLORS[i], flexShrink: 0 }} />
                            <span style={sans(11.5, C.text, 500)}>{title}</span>
                          </div>
                          <button style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: i === 0 ? C.blue : 'transparent',
                            border: i === 0 ? 'none' : `1px solid #D4D1CB`,
                            color: i === 0 ? '#fff' : '#3D3C38',
                            padding: '4px 9px', fontSize: 9.5, fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                          }}>Go →</button>
                        </div>
                        <div style={{ fontSize: 10.5, color: C.gray, paddingLeft: 11 }}>{desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Schedule 1:1 */}
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                    <button style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      background: C.navy, color: '#fff', border: 'none',
                      padding: 10, fontSize: 11, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                        <rect x="1" y="2" width="10" height="9" rx="1" /><path d="M1 5h10M4 1v2M8 1v2" />
                      </svg>
                      Schedule 1:1 with {selectedSe}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── NavItem helper ─────────────────────────────────────────────────────────

function NavItem({ label, active, badge }: { label: string; active: boolean; badge?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 14px 5px 16px',
      borderLeft: active ? `2px solid #0071CE` : '2px solid transparent',
      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
      color: active ? '#fff' : 'rgba(255,255,255,.62)',
      fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
      transition: 'background 80ms, color 80ms',
    }}>
      <span>{label}</span>
      {badge && (
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 8.5,
          background: '#D4810A', color: 'white', padding: '1px 6px',
        }}>{badge}</span>
      )}
    </div>
  );
}
