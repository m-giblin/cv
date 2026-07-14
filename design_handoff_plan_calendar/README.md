# Handoff: Plan Calendar v2 — Ramp Intelligence Gantt

## Overview
The Plan Calendar is a multi-SE Gantt timeline for managers, SEs, and mentors. It surfaces AI-detected scheduling conflicts, supports drag-and-drop bar rescheduling (manager only), and includes three views: Timeline (Gantt), Month calendar, and Team summary cards.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Your task is to **recreate these in your React/Next.js codebase** using your existing component library. The `PlanCalendar.tsx` is a near-complete starting point — adapt it to your stack.

## Fidelity
**High-fidelity.** Pixel-perfect mockup. Recreate as closely as possible. All exact colors, spacing values, and interaction behaviors are documented below.

---

## Views

### 1. Timeline View (Gantt)
The default and primary view. Full-width horizontally-scrollable Gantt chart.

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar (44px): breadcrumb + MANAGER|SE|MENTOR toggle + actions│
├──────────────────────────────────────────────────────────────┤
│ AI Intel Strip (navy, ~80px): 3 conflict alert cards          │
├──────────────────────────────────────────────────────────────┤
│ View tabs (38px): TIMELINE | MONTH | TEAM + legend            │
├──────────────────────────────────────────────────────────────┤
│ Gantt (flex:1, overflow-x: auto)                              │
│  ┌ 200px sticky-left SE list ┐  ┌ scrollable bars area ──── ┐ │
│  │ Name + health + ramp bar  │  │ Month labels (22px)        │ │
│  │                           │  │ Day numbers (26px)         │ │
│  │ Finn Grant     18% BEHIND │  │ ████░░░◆░░░██░░░░░         │ │
│  │ Gray Hayes     62% ON PACE│  │ ████████████░░███◆░░       │ │
│  │ Harper Ivan    78% AHEAD  │  │ ██████████████████░◆       │ │
│  │ Demo SE        12% CRIT.  │  │ ████░░░░░░░░░░░░◆          │ │
│  └───────────────────────────┘  └────────────────────────── ┘ │
│ Segment bands footer (28px)                                   │
└──────────────────────────────────────────────────────────────┘
```

**Gantt dimensions:**
- Day width: `26px`
- Calendar: June 1 – Sep 28 2026 = 120 days → total inner width: `200 + 120×26 = 3320px`
- SE row height: `80px min-height`
- Header: 22px (month labels) + 26px (day numbers) = 48px total

**Bar tracks within each 80px row:**
- Track A (content): `top:8px, height:22px`
- Track B (challenge/sim/mentor): `top:34px, height:16px`
- Gate diamonds: `top:30px, 14×14px, rotate(45deg)`

**Bar color coding:**
| Type | Color | Opacity when in-progress |
|---|---|---|
| Content | `#0071CE` | 28% bg, 88% fill |
| Challenge | `#D4810A` | 28% bg, 88% fill |
| Simulation | `#CC27B0` | 28% bg, 88% fill |
| Mentor | `#0A6E45` | 28% bg, 88% fill |
| Gate | `#00143A` | diamond shape |

Progress within a bar: left portion is `color at 88% opacity` (done), right portion is `color at 28% opacity` (remaining).

**Today marker:** 2px blue `#0071CE` vertical line at `day42 × 26 = 1092px`. Labeled "TODAY" above in DM Mono 7px.

**Weekend stripes:** CSS repeating-gradient: `repeating-linear-gradient(90deg, transparent 0, transparent 130px, rgba(0,0,0,.025) 130px, rgba(0,0,0,.025) 182px)` (5 weekdays × 26 = 130px, then 2 weekend days × 26 = 52px).

**Conflict dot:** 8px red circle `#B83128`, white 1.5px border, positioned top:-3px right:-3px on conflicted bars.

### 2. Month View
Traditional calendar grid. Shows plan events as colored chips on each day.

- Grid: 7 columns × 5-6 rows
- Day cell min-height: `90px`
- Today circle: 20×20px `#0071CE` filled circle behind day number
- Weekend background: `#F9F8F6`
- Event chips: colored bg, white text, 9px DM Mono, border-radius 2px

### 3. Team Summary View
2-column card grid showing each SE's health snapshot.

Each card (white bg, `1px #E2DFD9` border, 16px padding):
- Header: 36px avatar + name + level + health badge
- Ramp progress bar (4px, rounded)
- 3-stat row: SIM AVG, CERTS, GATES (grid with 1px `#E2DFD9` gaps)
- Next milestone row: colored diamond + label + "in Xd" countdown
- Footer: Mentor name + "Open plan →" button

---

## AI Intel Strip

Dark navy (`#00143A`) background. Shows up to 3 active conflict cards side by side.

**Conflict types detected:**
1. **Gate on weekend** — `severity: warning` — gate bar's startDay % 7 === 5 or 6
2. **Overloaded week** — `severity: warning` — ≥2 non-content/non-gate items in same 7-day window
3. **No mentor assigned** — `severity: info` — `se.mentor === null`
4. **Critical pace** — `severity: critical` — `se.health === 'critical'`

Each card has: severity icon (colored square), title, subtitle (`CRITICAL/WARNING/INFO · SE Name`), message text, CTA button, dismiss ×.

**Severity colors:**
| Severity | iconBg | text | ctaColor |
|---|---|---|---|
| critical | `rgba(184,49,40,.25)` | `#FF6B6B` | `#FF8080` |
| warning | `rgba(212,129,10,.25)` | `#FFB347` | `#FFB347` |
| info | `rgba(0,113,206,.2)` | `#5BB3FF` | `#5BB3FF` |

---

## Drag-and-Drop (Manager only)

**Behavior:**
1. `mousedown` on a bar → start drag, store `origLeft` and `startX`
2. `mousemove` → directly update `bar.style.left` (no setState — smooth)
3. `mouseup` → snap to nearest day: `Math.round(currentLeft / DAY_PX) * DAY_PX`, then commit to state via `updateBarDay(seId, barId, snappedDay)`

**Snap:** bars always snap to full day boundaries (26px increments). Minimum startDay: 0.

**SE/Mentor roles:** drag is blocked (`role !== 'manager'`). Bars show `cursor: default` instead of `cursor: grab`.

---

## Role Views

| Role | What's visible | Edit? |
|---|---|---|
| Manager | All 4 SEs | Full drag + conflict actions |
| SE View | Only their own plan (Demo SE) | Read-only |
| Mentor View | All mentees (SEs where `mentor === 'Demo Manager'`) | Read-only |

---

## State

```typescript
interface PlanCalendarState {
  role: 'manager' | 'se' | 'mentor';
  view: 'timeline' | 'month' | 'team';
  dismissedAlerts: string[];
  pendingChanges: number;
  planData: SEProfile[] | null; // null = use SE_DATA constant
  selectedSE: string | null;
  monthOffset: number; // 0 = June, 1 = July (default), etc.
}
```

---

## SE Data Model

```typescript
interface BarItem {
  id: string;
  type: 'content' | 'challenge' | 'sim' | 'mentor' | 'gate';
  label: string;
  startDay: number;  // days from June 1 2026
  days?: number;     // duration (omit for gates)
  pct?: number;      // completion %, 0–100
}

interface SEProfile {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;  // CSS gradient string
  health: 'critical' | 'behind' | 'on-pace' | 'ahead';
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  rampPct: number;
  dayInRamp: number;
  mentor: string | null;
  planName: string;
  bars: BarItem[];
}
```

**Initial data (4 SEs):**

| SE | Initials | Health | Ramp% | Day | Mentor |
|---|---|---|---|---|---|
| Finn Grant | FG | behind | 18 | 22 | Demo Manager |
| Gray Hayes | GH | on-pace | 62 | 45 | Demo Manager |
| Harper Ivan | HI | ahead | 78 | 68 | Demo Manager |
| Demo SE | DS | critical | 12 | 22 | null ← CONFLICT |

---

## Design Tokens

```
Navy:        #00143A  (sidebar, intel strip, gate diamonds)
Blue:        #0071CE  (content bars, today line, active tabs)
Pink:        #CC27B0  (sim bars, gradient accent)
Green:       #0A6E45  (mentor bars, on-track)
Amber:       #D4810A  (challenge bars, at-risk)
Red:         #B83128  (critical, conflict dots)
Border:      #E2DFD9
Surface:     #F9F8F6
Background:  #F5F4F0
Text:        #0D0E12
Gray:        #7A7772
Muted:       #A09D98
```

**Fonts:** DM Sans 400/500/600, DM Mono 300/400/500, Syne 700/800

**Role toggle:** active = `#00143A` bg + white text. inactive = white bg + `#7A7772` text.

---

## Files in This Bundle
- `README.md` — this document
- `PlanCalendar.tsx` — full React/TSX component to drop into your app
- `PlanCalendar_prototype.html` — the live prototype, open in browser to see the intended result
