# Handoff: Readiness Map — Manager Coaching Intelligence

## Overview
The Readiness Map is a weekly coaching command center for managers. It replaces a static scorecard with an interactive heatmap showing each SE's performance across 6 competency dimensions, surfacing actionable coaching priorities and a sliding detail panel with specific next steps.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Your task is to **recreate these designs in your codebase** (React/Next.js/TSX) using your existing component library and patterns.

The reference TSX file (`ReadinessMap.tsx`) in this folder is a starting point with all the data, layout logic, and interaction wiring — adapt it to your stack.

## Fidelity
**High-fidelity.** Pixel-perfect mockup with final colors, typography, spacing, and interactions. Recreate the UI as closely as possible using your existing design system. Where tokens differ, use the exact hex values listed below.

---

## Screen: Readiness Map

### Purpose
Give a manager one view to answer: "Who do I coach this week, on what, and how?" — without opening each SE's profile.

### Overall Layout
```
┌─────────────────────────────────────────────────────────┐
│  Topbar (44px tall) — breadcrumb + week toggle + actions │
├─────────────────────────────────────────────────────────┤
│  Intel Strip (dark navy, ~56px) — team score + 6 dims    │
├─────────────────────────────────────────────────────────┤
│  Heatmap Area (flex:1, scroll-y)    │  Coaching Panel   │
│  ┌─────────────────────────────┐    │  (300px, slides in│
│  │  Priority callout bar       │    │   from right)     │
│  ├─────────────────────────────┤    │                   │
│  │  SE × Competency grid       │    │  • SE name/score  │
│  │  4 rows × 8 columns         │    │  • Insight text   │
│  │  (name | ramp|sims|seg|cert |    │  • 3 actions      │
│  │   lab|pitch|trend)          │    │  • Schedule 1:1   │
│  ├─────────────────────────────┤    │                   │
│  │  Team avg footer row        │    │                   │
│  └─────────────────────────────┘    │                   │
│  Legend row                         │                   │
└─────────────────────────────────────────────────────────┘
```

### App Shell
- **Sidebar**: 214px wide, `#00143A` background, 2px gradient top bar (`#0071CE` → `#CC27B0`). Nav items: font-size 11.5px, DM Sans 500. Active item: left border 2px `#0071CE`, bg `rgba(255,255,255,.06)`. Inactive: `rgba(255,255,255,.62)`.
- **Main area**: flex:1, white topbar, dark intel strip, heatmap body.

### Topbar (44px)
- Left: breadcrumb `Team › Readiness Map` (DM Mono, 10.5px)
- Right: `WEEKLY | MONTHLY` toggle pill (1px border `#D4D1CB`, active tab `#00143A` bg, white text, inactive white bg gray text `#7A7772`), date badge (`#F0F7FF` bg, `#C5DCF5` border, `#0071CE` text, DM Mono 9px), `New coaching card` outline button, avatar circle.

### Intel Strip
Background: `#00143A`. Padding: 10px 20px.

**Team Readiness Score** (left, separated by right border):
- Label: DM Mono 7.5px, `rgba(255,255,255,.35)`, tracking `.13em`, uppercase
- Number: Syne 26px, weight 800, white
- `/100` suffix: DM Mono 9px, `rgba(255,255,255,.4)`
- Delta badge: `rgba(212,129,10,.18)` bg, `rgba(212,129,10,.3)` border, `#D4810A` text (up arrow + "+4 vs last week")

**6 Dimension Pillars** (flex row with dividers):
| Dim | Value | Status badge |
|---|---|---|
| RAMP | 43% | AT RISK — amber |
| SIMS | 20 | LOW — red |
| SEGMENTS | 1.0 | LOW — red |
| CERTS | 0 | CRITICAL — red |
| LAB | 2.4h | AT RISK — amber |
| PITCH | 61 | AT RISK — amber |

Badge colors: AT RISK = `rgba(212,129,10,.8)` text, `.12` bg. LOW/CRITICAL = `rgba(184,49,40,.9)` text, `.15` bg.
Label: DM Mono 7.5px white `.3` opacity. Value: 14px, weight 600, white.

### Priority Callout Bar
White card, 1px `#E2DFD9` border, 12px 16px padding. Left accent: 3px `#B83128` strip.
- Title: "3 coaching priorities this week" — 11.5px, weight 600, `#0D0E12`
- 3 SE entries in a flex row, separated by 1px `#E2DFD9` dividers
- Each: 20px avatar circle (initials, colored bg), name (bold) + description (gray), "Coach now →" button

### Heatmap Table
White bg, 1px `#E2DFD9` border, CSS grid: `grid-template-columns: 180px repeat(6, 1fr) 90px`

**Header row**: `#F9F8F6` bg, 1px bottom border. Each column header: DM Mono 8px uppercase, `#3D3C38`, with subtitle 9px `#A09D98`.

**SE Rows** (4 rows: Finn, Demo, Gray, Harper):
- Name column (180px): avatar circle + name (12px 500) + tenure + composite score
- 6 data cells: color-coded background, metric value (DM Mono 13px), mini progress bar (3px), status text (8.5px)
- Trend column (90px): 60×24 SVG sparkline + delta label (DM Mono 8px)

**Cell color coding**:
- Critical (<40): `rgba(184,49,40,.12-.18)` bg, `#B83128` text
- At risk (40–69): `rgba(212,129,10,.08-.12)` bg, `#D4810A` text  
- On track (70+): `rgba(10,110,69,.1-.12)` bg, `#0A6E45` text

**SE Data**:
| SE | Avatar | Tenure | Score | Ramp | Sims | Seg | Cert | Lab | Pitch |
|---|---|---|---|---|---|---|---|---|---|
| Finn | F / red gradient | Day 22 | 14 | 18% | 0 | 1/4 | 0/8 | 0.5h | 52 |
| Demo | D / purple gradient | Day 45 | 22 | 12% | 78 | 1/4 | 0/8 | 3.2h | 63 |
| Gray | G / blue gradient | Day 68 | 48 | 62% | 0 | 1/4 | 0/8 | 1.8h | 71 |
| Harper | H / green gradient | Day 90 | 71 | 78% | 78 | 2/4 | 0/8 | 4.2h | 82 |

**Footer row**: `#F9F8F6` bg, 2px top border `#E2DFD9`. Team averages: 43%, 20, 1.0/4, 0/8, 2.4h, 67.

**Legend**: flex row, 10px color swatches, 10px `#7A7772` text. Right: "Click any cell to open coaching actions" gray hint.

### Coaching Panel (slides in from right)
**Dimensions**: 300px wide. Slides in with `transform: translateX(300px)` → `translateX(0)` on open. Transition: 200ms `cubic-bezier(.16,1,.3,1)`.

**Panel Header** (`#F9F8F6` bg, 14px 16px padding, bottom border):
- Left: "COACHING FOCUS" label (DM Mono 8px, `#A09D98`) + "SE · Dimension" (13px, weight 600)
- Right: 28×28 close ×  button (1px `#E2DFD9` border, white bg)

**Context section** (14px 16px padding, bottom border):
- 36px avatar circle (SE color gradient) + SE name (13px 600) + tenure/composite
- Metric score (Syne 22px, weight 800, status color) — right aligned
- Insight card: colored bg/border matching status, status label + insight text (10.5px, line-height 1.4)

**Recommended Actions** (3 items):
Each: 1px `#E2DFD9` border card, 10px 12px padding.
- Colored dot (5px, blue/pink/green) + action title (11.5px 500)
- "Go →" button (right)
- Description text (10.5px `#7A7772`)

**Schedule 1:1** button: full-width, `#00143A` bg, white text, 10px padding, calendar icon.

---

## Interactions & Behavior

### Opening the panel
- Click any heatmap cell → panel slides in showing data for that SE + dimension
- Click SE name/avatar column → panel opens to their highest-priority dimension
- Click "Coach now →" in priority bar → panel opens to that specific SE + dimension

### Closing the panel
- Click the × button in the panel header → panel slides out (translateX 300px)
- Panel state: `{ open: boolean, selectedSe: string, selectedDim: string }`

### Weekly / Monthly toggle
- Switches sparkline data between 6-point weekly and 5-point monthly curves
- Updates delta labels ("+2 wk" → "+5 mo")
- Updates date badge ("W28 · Jul 7–13" → "Jun 2026")
- Updates trend column header ("Trend / vs last week" → "4-wk Trend / rolling 4 weeks")
- Updates intel strip delta text

### Sparkline data (weekly → monthly)
| SE | Weekly pts | Monthly pts |
|---|---|---|
| Finn | `0,20 12,18 24,22 36,20 48,17 60,16` | `0,22 15,21 30,20 45,19 60,17` |
| Demo | `0,22 12,18 24,16 36,14 48,11 60,10` | `0,23 15,20 30,17 45,14 60,10` |
| Gray | `0,18 12,20 24,17 36,15 48,14 60,13` | `0,21 15,19 30,17 45,15 60,12` |
| Harper | `0,22 12,17 24,13 36,10 48,7 60,5` | `0,20 15,16 30,12 45,8 60,4` |

---

## State Management

```typescript
interface ReadinessState {
  panelOpen: boolean;
  selectedSe: 'Finn' | 'Demo' | 'Gray' | 'Harper' | '';
  selectedDim: 'Ramp' | 'Sims' | 'Segments' | 'Certs' | 'Lab' | 'Pitch' | '';
  viewMode: 'weekly' | 'monthly';
}
```

---

## Design Tokens

### Colors
```
Navy:        #00143A  (sidebar bg, primary buttons, panel close bg)
Blue:        #0071CE  (active nav, info accents, CTA buttons)
Pink:        #CC27B0  (gradient accent)
Green:       #0A6E45  (on-track cells, positive states)
Red:         #B83128  (critical cells, negative states)
Amber:       #D4810A  (at-risk cells, warning states)
Border:      #E2DFD9  (all card/cell borders)
Surface:     #F9F8F6  (header rows, panel header)
Background:  #F5F4F0  (app background)
Text:        #0D0E12  (primary)
Gray:        #7A7772  (secondary text)
Muted:       #A09D98  (labels, placeholders)
```

### Typography
```
Syne 600/700/800  — headlines, composite scores, metric numbers
DM Sans 400/500/600  — body, nav, buttons
DM Mono 300/400/500  — labels, badges, codes, tabular data
```

### Spacing
```
Panel padding:   14px 16px
Cell padding:    12px 8px
Name col:        12px 14px
Row gap:         0 (grid)
Card border:     1px #E2DFD9
Progress bar h:  3px
Sparkline:       60×24px SVG
```

### Shadows / Elevation
```
App shell box-shadow: 0 24px 70px rgba(0,0,0,.2)
Panel slide transition: transform 200ms cubic-bezier(.16,1,.3,1)
Cell hover: filter brightness(.92)
```

---

## Assets
- No external image assets. All icons are inline SVG.
- Avatars are CSS gradient circles with 1–2 letter initials.
- Sparklines are inline `<svg>` polylines.

## Files in This Bundle
- `README.md` — this document
- `ReadinessMap.tsx` — full React/TSX component with all data, layout, and interactions wired up
- `Readiness Map v2.dc.html` — the HTML prototype for visual reference (open in browser)
