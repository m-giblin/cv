// ─────────────────────────────────────────────
// Program Tracker — Mock data
// Replace with real API calls in production.
// ─────────────────────────────────────────────

import type {
  CohortRow, PhaseDef, MilestoneItem, SEProgramsRow,
  DrawerSEProfile, ManagerQueueItem, SignOffItem, PhaseCell, ProgramStep,
} from './types';

// ── Helpers ──────────────────────────────────

export function phaseCell(status: 'complete' | 'active' | 'blocked' | 'upcoming'): PhaseCell {
  const S = {
    complete: { bg: '#EDFAF3', color: '#0A6E45', icon: '✓', label: 'Complete',     sub: 'Signed off'  },
    active:   { bg: '#F0F7FF', color: '#0071CE', icon: '→', label: 'In progress',  sub: 'On track'    },
    blocked:  { bg: '#FEF0EE', color: '#B83128', icon: '!', label: 'Blocked',       sub: 'Needs help'  },
    upcoming: { bg: '#F9F8F6', color: '#A09D98', icon: '○', label: 'Upcoming',      sub: ''            },
  };
  return { status, ...S[status] };
}

export function makeStep(label: string, date: string, status: 'done' | 'active' | 'blocked' | 'upcoming'): ProgramStep {
  const done    = status === 'done';
  const blocked = status === 'blocked';
  const active  = status === 'active';
  return {
    label, date, status,
    dotBg:     done ? '#0A6E45' : blocked ? '#B83128' : active ? '#0071CE' : '#F9F8F6',
    dotBorder: done ? '#0A6E45' : blocked ? '#B83128' : active ? '#0071CE' : '#D4D1CB',
    dotColor:  done || blocked || active ? '#fff' : '#D4D1CB',
    check:     done ? '✓' : blocked ? '!' : active ? '→' : '',
    textColor: done ? '#6B6860' : blocked ? '#B83128' : '#0D0E12',
    dateColor: blocked ? '#B83128' : '#A09D98',
    strike:    done ? 'line-through' : 'none',
  };
}

// ── Colors ───────────────────────────────────

export const COLORS = {
  blue:    '#0071CE',
  amber:   '#D4810A',
  red:     '#B83128',
  green:   '#0A6E45',
  navy:    '#00143A',
  purple:  '#CC27B0',
  border:  '#E2DFD9',
  bg:      '#F5F4F0',
  bgCard:  '#F9F8F6',
  text:    '#0D0E12',
  textMid: '#3D3C38',
  textDim: '#7A7772',
  textFaint: '#A09D98',
};

// ── Cohort data ───────────────────────────────

export const COHORT_ROWS: CohortRow[] = [
  {
    initials: 'GH', name: 'Gray Hayes',  level: 'Senior',   day: 45,
    avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    overall: '62%', overallColor: COLORS.blue,
    phases: [phaseCell('complete'), phaseCell('active'),   phaseCell('upcoming'), phaseCell('upcoming')],
  },
  {
    initials: 'HI', name: 'Harper Ivan', level: 'Advisory', day: 68,
    avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)',
    overall: '78%', overallColor: COLORS.blue,
    phases: [phaseCell('complete'), phaseCell('complete'), phaseCell('active'),   phaseCell('upcoming')],
  },
  {
    initials: 'DS', name: 'Demo SE',     level: 'Basic',    day: 22,
    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    overall: '12%', overallColor: COLORS.red,
    phases: [phaseCell('blocked'),  phaseCell('upcoming'), phaseCell('upcoming'), phaseCell('upcoming')],
  },
  {
    initials: 'FG', name: 'Finn Grant',  level: 'Basic',    day: 22,
    avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    overall: '18%', overallColor: COLORS.amber,
    phases: [phaseCell('active'),   phaseCell('upcoming'), phaseCell('upcoming'), phaseCell('upcoming')],
  },
];

export const PHASE_DEFS: PhaseDef[] = [
  { emoji: '📚', bg: '#F0F7FF', border: 'rgba(0,113,206,.15)',   title: 'Phase 1 — Foundations (Wks 1–2)',      desc: 'Product overview · ISC basics · Sales motion · IGA landscape' },
  { emoji: '⚙️', bg: '#F0FDF7', border: 'rgba(10,110,69,.15)',   title: 'Phase 2 — Technical Depth (Wks 3–4)',  desc: 'Demo env setup · ISC lab · Technical challenges · Architecture' },
  { emoji: '🎯', bg: '#FFF7ED', border: 'rgba(212,129,10,.15)',  title: 'Phase 3 — Field Application (Wks 5–6)', desc: 'Discovery sims · Deal prep · Objection handling · SLED/ENT verticals' },
  { emoji: '🏆', bg: '#EDFAF3', border: 'rgba(10,110,69,.15)',   title: 'Phase 4 — Cert Gates (Ongoing)',       desc: 'Solo discovery · Executive demo · Competitive bakeoff · Manager sign-off' },
];

// ── Overdue milestones ────────────────────────

export const OVERDUE_MILESTONES: MilestoneItem[] = [
  { dateShort: 'Jul 9',  dayOfWeek: 'Wed', se: 'Demo SE',    initials: 'DS', avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)', label: 'SLED & FED team meet-and-greet',   program: 'SE-I Onboarding · Phase 1' },
  { dateShort: 'Jul 9',  dayOfWeek: 'Wed', se: 'Finn Grant', initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'SailPoint tools overview',          program: 'SE-I Onboarding · Phase 1' },
  { dateShort: 'Jul 10', dayOfWeek: 'Thu', se: 'Finn Grant', initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'Slack communication setup',         program: 'SE-I Onboarding · Phase 1' },
  { dateShort: 'Jul 11', dayOfWeek: 'Fri', se: 'Finn Grant', initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'DemoHub submission & management',   program: 'SE-I Onboarding · Phase 1' },
  { dateShort: 'Jul 12', dayOfWeek: 'Sat', se: 'Finn Grant', initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'Booking travel guidelines',         program: 'SE-I Onboarding · Phase 1' },
  { dateShort: 'Jul 13', dayOfWeek: 'Sun', se: 'Demo SE',    initials: 'DS', avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)', label: 'Start shadowing SE meetings',       program: 'SE-I Onboarding · Phase 2' },
];

export const MILESTONES_THIS_WEEK: MilestoneItem[] = [
  { dateShort: 'Jul 14', dayOfWeek: 'Mon', se: 'Gray Hayes',  initials: 'GH', avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)', label: 'ISC lab environment setup',              program: '90-Day Ramp · Phase 2' },
  { dateShort: 'Jul 15', dayOfWeek: 'Tue', se: 'Demo SE',     initials: 'DS', avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)', label: 'Complete product overview module',       program: '90-Day Ramp · Phase 1' },
  { dateShort: 'Jul 16', dayOfWeek: 'Wed', se: 'Finn Grant',  initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'First 1:1 with mentor',                  program: '90-Day Ramp · Phase 1' },
];

export const MILESTONES_UPCOMING: MilestoneItem[] = [
  { dateShort: 'Jul 18', dayOfWeek: 'Fri', se: 'Harper Ivan', initials: 'HI', avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)', label: 'Phase 3 kickoff — discovery sims start', program: '90-Day Ramp · Phase 3',  daysAway: 'in 5d'  },
  { dateShort: 'Jul 21', dayOfWeek: 'Mon', se: 'Gray Hayes',  initials: 'GH', avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)', label: 'IdentityIQ cert study group',            program: 'IIQ Admin Cert',           daysAway: 'in 8d'  },
  { dateShort: 'Jul 22', dayOfWeek: 'Tue', se: 'Demo SE',     initials: 'DS', avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)', label: 'Gate 1 assessment due',                  program: '90-Day Ramp · Phase 1 gate', daysAway: 'in 9d' },
  { dateShort: 'Jul 24', dayOfWeek: 'Thu', se: 'Finn Grant',  initials: 'FG', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', label: 'SailPoint competitive positioning',      program: 'SLED Track',               daysAway: 'in 11d' },
  { dateShort: 'Jul 25', dayOfWeek: 'Fri', se: 'Harper Ivan', initials: 'HI', avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)', label: 'Q3 dev plan mid-point review',           program: 'Q3 Dev Goals',             daysAway: 'in 12d' },
];

// ── SE Programs tab data ──────────────────────

export const SE_PROGRAMS: SEProgramsRow[] = [
  {
    initials: 'GH', name: 'Gray Hayes',  level: 'Senior SE',   day: 45,
    avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    healthLabel: 'ON PACE', healthColor: COLORS.green, healthBg: 'rgba(10,110,69,.1)', programCount: 4,
    programs: [
      { name: '90-Day Ramp',          subtitle: 'SE-I Onboarding Program',   type: 'Onboarding',     typeColor: COLORS.blue,   pct: 62, status: 'On track',    statusColor: COLORS.blue,   statusBg: 'rgba(0,113,206,.08)',   due: 'Sep 30', borderColor: COLORS.border },
      { name: 'IdentityIQ Admin Cert', subtitle: 'Core certification track', type: 'Certification',  typeColor: COLORS.green,  pct: 35, status: 'In progress', statusColor: COLORS.green,  statusBg: 'rgba(10,110,69,.08)',   due: 'Aug 15', borderColor: COLORS.border },
      { name: 'SLED Vertical Track',   subtitle: 'Specialization program',   type: 'Specialization', typeColor: COLORS.purple, pct: 20, status: 'In progress', statusColor: COLORS.purple, statusBg: 'rgba(204,39,176,.08)',  due: 'Oct 1',  borderColor: COLORS.border },
      { name: 'Q3 Dev Goals',          subtitle: 'Annual development plan',  type: 'Dev Plan',       typeColor: COLORS.amber,  pct: 50, status: 'On track',    statusColor: COLORS.amber,  statusBg: 'rgba(212,129,10,.08)',  due: 'Sep 29', borderColor: COLORS.border },
    ],
  },
  {
    initials: 'HI', name: 'Harper Ivan', level: 'Advisory SE', day: 68,
    avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)',
    healthLabel: 'AHEAD', healthColor: COLORS.blue, healthBg: 'rgba(0,113,206,.1)', programCount: 3,
    programs: [
      { name: '90-Day Ramp',           subtitle: 'SE-I Onboarding Program',  type: 'Onboarding',    typeColor: COLORS.blue,  pct: 78, status: 'Ahead',      statusColor: COLORS.blue,  statusBg: 'rgba(0,113,206,.08)',  due: 'Sep 30', borderColor: COLORS.border },
      { name: 'IdentityIQ Admin Cert', subtitle: 'Core certification track', type: 'Certification', typeColor: COLORS.green, pct: 65, status: 'On track',   statusColor: COLORS.green, statusBg: 'rgba(10,110,69,.08)', due: 'Aug 15', borderColor: COLORS.border },
      { name: 'Q3 Dev Goals',          subtitle: 'Annual development plan',  type: 'Dev Plan',      typeColor: COLORS.green, pct: 70, status: 'On track',   statusColor: COLORS.green, statusBg: 'rgba(10,110,69,.08)', due: 'Sep 29', borderColor: COLORS.border },
    ],
  },
  {
    initials: 'DS', name: 'Demo SE',     level: 'Basic SE',    day: 22,
    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    healthLabel: 'CRITICAL', healthColor: COLORS.red, healthBg: 'rgba(184,49,40,.12)', programCount: 3,
    programs: [
      { name: '90-Day Ramp',           subtitle: 'SE-I Onboarding Program',  type: 'Onboarding',    typeColor: COLORS.red,   pct: 12, status: 'Critical',    statusColor: COLORS.red,   statusBg: 'rgba(184,49,40,.08)',  due: 'Sep 30', borderColor: 'rgba(184,49,40,.3)' },
      { name: 'IdentityNow Basics',    subtitle: 'Core certification track', type: 'Certification', typeColor: COLORS.amber, pct: 0,  status: 'Not started', statusColor: COLORS.amber, statusBg: 'rgba(212,129,10,.08)', due: 'Sep 1',  borderColor: COLORS.border },
      { name: 'Q3 Dev Goals',          subtitle: 'Annual development plan',  type: 'Dev Plan',      typeColor: COLORS.amber, pct: 15, status: 'At risk',     statusColor: COLORS.amber, statusBg: 'rgba(212,129,10,.08)', due: 'Sep 29', borderColor: COLORS.border },
    ],
  },
  {
    initials: 'FG', name: 'Finn Grant',  level: 'Basic SE',    day: 22,
    avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    healthLabel: 'BEHIND', healthColor: COLORS.amber, healthBg: 'rgba(212,129,10,.1)', programCount: 2,
    programs: [
      { name: '90-Day Ramp',           subtitle: 'SE-I Onboarding Program',  type: 'Onboarding',    typeColor: COLORS.amber, pct: 18, status: 'Behind',      statusColor: COLORS.amber, statusBg: 'rgba(212,129,10,.08)', due: 'Sep 30', borderColor: 'rgba(212,129,10,.25)' },
      { name: 'IdentityIQ Admin Cert', subtitle: 'Core certification track', type: 'Certification', typeColor: '#A09D98',    pct: 0,  status: 'Not started', statusColor: '#A09D98',    statusBg: '#F9F8F6',             due: 'Oct 15', borderColor: COLORS.border },
    ],
  },
];

// ── SE Drawer profiles ────────────────────────

export const SE_DRAWER_PROFILES: Record<string, DrawerSEProfile> = {
  GH: {
    name: 'Gray Hayes', initials: 'GH', level: 'Senior SE', day: 45,
    avatarBg: 'linear-gradient(135deg,#1a5c8a,#0071CE)',
    healthLabel: 'ON PACE', healthColor: '#0A6E45', healthBg: 'rgba(10,110,69,.15)',
    programCount: 4, overall: '62%', overdueCount: 0, certsCleared: 1,
    programs: [
      {
        name: '90-Day Ramp', type: 'Onboarding', typeColor: '#0071CE',
        pct: 62, status: 'On track', statusColor: '#0071CE', statusBg: 'rgba(0,113,206,.08)', due: 'Sep 30', borderColor: '#E2DFD9',
        steps: [
          makeStep('Product overview & ISC basics',       'Jul 1',  'done'),
          makeStep('Sales motion & IGA landscape',         'Jul 3',  'done'),
          makeStep('Demo env setup',                       'Jul 8',  'done'),
          makeStep('ISC lab environment',                  'Jul 14', 'active'),
          makeStep('Technical challenges practice',        'Jul 18', 'upcoming'),
          makeStep('Discovery sims',                       'Jul 25', 'upcoming'),
        ],
      },
      {
        name: 'IdentityIQ Admin Cert', type: 'Certification', typeColor: '#0A6E45',
        pct: 35, status: 'In progress', statusColor: '#0A6E45', statusBg: 'rgba(10,110,69,.08)', due: 'Aug 15', borderColor: '#E2DFD9',
        steps: [
          makeStep('IIQ fundamentals module',  'Jul 5',  'done'),
          makeStep('Admin lab',                'Jul 10', 'done'),
          makeStep('Policy configuration',     'Jul 14', 'active'),
          makeStep('Certification exam',       'Aug 1',  'upcoming'),
          makeStep('Manager sign-off',         'Aug 15', 'upcoming'),
        ],
      },
    ],
    activity: [
      { label: 'Completed ISC lab environment setup', program: '90-Day Ramp', date: 'Jul 8',  dotColor: '#0A6E45' },
      { label: 'Attended SLED team meet-and-greet',   program: '90-Day Ramp', date: 'Jul 7',  dotColor: '#0A6E45' },
      { label: 'Started IIQ admin lab',               program: 'IIQ Cert',    date: 'Jul 10', dotColor: '#0071CE' },
    ],
  },
  HI: {
    name: 'Harper Ivan', initials: 'HI', level: 'Advisory SE', day: 68,
    avatarBg: 'linear-gradient(135deg,#0A6E45,#14a065)',
    healthLabel: 'AHEAD', healthColor: '#0071CE', healthBg: 'rgba(0,113,206,.15)',
    programCount: 3, overall: '78%', overdueCount: 0, certsCleared: 2,
    programs: [
      {
        name: '90-Day Ramp', type: 'Onboarding', typeColor: '#0071CE',
        pct: 78, status: 'Ahead of pace', statusColor: '#0071CE', statusBg: 'rgba(0,113,206,.08)', due: 'Sep 30', borderColor: '#E2DFD9',
        steps: [
          makeStep('Phase 1 Foundations',      'Jun 28', 'done'),
          makeStep('Phase 2 Technical Depth',  'Jul 5',  'done'),
          makeStep('Phase 3 Field Application','Jul 14', 'active'),
          makeStep('Phase 4 Cert Gates',       'Sep 1',  'upcoming'),
        ],
      },
      {
        name: 'IdentityIQ Admin Cert', type: 'Certification', typeColor: '#0A6E45',
        pct: 65, status: 'On track', statusColor: '#0A6E45', statusBg: 'rgba(10,110,69,.08)', due: 'Aug 15', borderColor: '#E2DFD9',
        steps: [
          makeStep('IIQ fundamentals', 'Jun 30', 'done'),
          makeStep('Admin lab',        'Jul 6',  'done'),
          makeStep('Policy config',    'Jul 11', 'done'),
          makeStep('Cert exam',        'Aug 1',  'upcoming'),
          makeStep('Manager sign-off', 'Aug 15', 'upcoming'),
        ],
      },
    ],
    activity: [
      { label: 'Completed Phase 2 sign-off',    program: '90-Day Ramp', date: 'Jul 5',  dotColor: '#0A6E45' },
      { label: 'Passed IIQ policy config',      program: 'IIQ Cert',    date: 'Jul 11', dotColor: '#0A6E45' },
      { label: 'Started Field Application phase', program: '90-Day Ramp', date: 'Jul 14', dotColor: '#0071CE' },
    ],
  },
  DS: {
    name: 'Demo SE', initials: 'DS', level: 'Basic SE', day: 22,
    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    healthLabel: 'CRITICAL', healthColor: '#B83128', healthBg: 'rgba(184,49,40,.15)',
    programCount: 3, overall: '12%', overdueCount: 4, certsCleared: 0,
    programs: [
      {
        name: '90-Day Ramp', type: 'Onboarding', typeColor: '#B83128',
        pct: 12, status: 'Critical', statusColor: '#B83128', statusBg: 'rgba(184,49,40,.08)', due: 'Sep 30', borderColor: 'rgba(184,49,40,.3)',
        steps: [
          makeStep('SLED & FED team meet-and-greet', 'Jul 9',  'blocked'),
          makeStep('SailPoint tools overview',        'Jul 9',  'blocked'),
          makeStep('Start shadowing SE meetings',     'Jul 13', 'blocked'),
          makeStep('Demo env setup',                  'Jul 18', 'upcoming'),
          makeStep('ISC lab environment',             'Jul 22', 'upcoming'),
        ],
      },
      {
        name: 'IdentityNow Basics', type: 'Certification', typeColor: '#D4810A',
        pct: 0, status: 'Not started', statusColor: '#D4810A', statusBg: 'rgba(212,129,10,.08)', due: 'Sep 1', borderColor: '#E2DFD9',
        steps: [
          makeStep('IdentityNow fundamentals',  'Jul 20', 'upcoming'),
          makeStep('SaaS configuration basics', 'Jul 28', 'upcoming'),
          makeStep('Integration lab',           'Aug 5',  'upcoming'),
        ],
      },
    ],
    activity: [
      { label: 'Day 22 — no activity logged this week', program: '90-Day Ramp', date: 'Jul 13', dotColor: '#B83128' },
      { label: 'Missed SLED meet-and-greet (no-show)', program: '90-Day Ramp',  date: 'Jul 9',  dotColor: '#B83128' },
      { label: 'Enrolled in 90-Day Ramp',              program: '90-Day Ramp',  date: 'Jun 21', dotColor: '#A09D98' },
    ],
  },
  FG: {
    name: 'Finn Grant', initials: 'FG', level: 'Basic SE', day: 22,
    avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    healthLabel: 'BEHIND', healthColor: '#D4810A', healthBg: 'rgba(212,129,10,.15)',
    programCount: 2, overall: '18%', overdueCount: 4, certsCleared: 0,
    programs: [
      {
        name: '90-Day Ramp', type: 'Onboarding', typeColor: '#D4810A',
        pct: 18, status: 'Behind pace', statusColor: '#D4810A', statusBg: 'rgba(212,129,10,.08)', due: 'Sep 30', borderColor: 'rgba(212,129,10,.3)',
        steps: [
          makeStep('SailPoint tools overview',       'Jul 9',  'blocked'),
          makeStep('Slack communication setup',      'Jul 10', 'blocked'),
          makeStep('DemoHub submission & management','Jul 11', 'blocked'),
          makeStep('Booking travel guidelines',      'Jul 12', 'blocked'),
          makeStep('ISC lab environment',            'Jul 20', 'upcoming'),
        ],
      },
      {
        name: 'IdentityIQ Admin Cert', type: 'Certification', typeColor: '#A09D98',
        pct: 0, status: 'Not started', statusColor: '#A09D98', statusBg: '#F9F8F6', due: 'Oct 15', borderColor: '#E2DFD9',
        steps: [
          makeStep('IIQ fundamentals', 'Aug 1',  'upcoming'),
          makeStep('Admin lab',        'Aug 10', 'upcoming'),
          makeStep('Cert exam',        'Oct 1',  'upcoming'),
        ],
      },
    ],
    activity: [
      { label: '4 overdue milestones — no completion logged', program: '90-Day Ramp', date: 'Jul 13', dotColor: '#B83128' },
      { label: 'Enrolled in 90-Day Ramp',                    program: '90-Day Ramp', date: 'Jun 21', dotColor: '#A09D98' },
    ],
  },
};

// ── Manager queue (alert strip + sign-off sidebar) ──

export const MANAGER_QUEUE_ITEMS: ManagerQueueItem[] = [
  { seInitials: 'DS', seName: 'Demo SE',    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)', title: 'Demo SE — Gate 1 sign-off pending',        actionLabel: 'Sign off →', actionStyle: 'amber' },
  { seInitials: 'FG', seName: 'Finn Grant', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)', title: 'Finn — IIQ Cert submission needs review',  actionLabel: 'Review →',  actionStyle: 'blue'  },
];

export const SIGN_OFF_ITEMS: SignOffItem[] = [
  {
    seInitials: 'DS', seName: 'Demo SE',    avatarBg: 'linear-gradient(135deg,#5a2d82,#9b44c8)',
    title: 'Demo SE — Gate 1',
    description: 'SE-I Onboarding Phase 1 completion. Demo completed all required activities. Sign off to unlock Phase 2.',
  },
  {
    seInitials: 'FG', seName: 'Finn Grant', avatarBg: 'linear-gradient(135deg,#B83128,#7c1d1d)',
    title: 'Finn — IIQ Cert submission',
    description: 'Finn submitted IdentityIQ Admin certification. Review the submission and approve to log the cert.',
  },
];
