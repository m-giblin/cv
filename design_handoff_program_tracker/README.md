# Handoff: Program Tracker

## Overview
A full-page manager view for tracking SE (Sales Engineer) onboarding programs, certifications, and development plans. Managers see their whole cohort at a glance, drill into per-SE program progress, triage overdue milestones, and sign off on gate completions — all from one surface.

## About the Design Files
The files in this bundle are **design references created in HTML** — high-fidelity prototypes showing the intended look and behavior. Do NOT ship the HTML directly. Your task is to **recreate these designs in your existing React codebase** using its established patterns and component library.

Open `ProgramTracker.reference.html` in a browser to see the fully interactive prototype. Use it as the authoritative visual spec.

## Fidelity
**High-fidelity.** Pixel-perfect colors, typography, spacing, and interactions are all specified. Recreate the UI exactly using your codebase's patterns. The `.tsx` files in this folder are a complete, ready-to-use React implementation — copy them in and wire up your API layer.

---

## File Guide

| File | Purpose |
|---|---|
| `ProgramTracker.reference.html` | Open in browser — interactive prototype, the authoritative visual reference |
| `types.ts` | All TypeScript interfaces |
| `data.ts` | Mock data + helper functions (`phaseCell`, `makeStep`) |
| `ProgramTracker.tsx` | Main page component (sidebar, topbar, all 3 tabs) |
| `SEProfileDrawer.tsx` | Slide-in drawer for SE profile detail |

### How to integrate

1. **Copy all 4 `.ts`/`.tsx` files** into your project (e.g. `src/features/program-tracker/`).
2. **Install fonts** — add to your `<head>` or global CSS:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">
   ```
3. **Add global keyframes** to your CSS (needed for animations):
   ```css
   @keyframes slideIn {
     from { transform: translateX(40px); opacity: 0; }
     to   { transform: none; opacity: 1; }
   }
   @keyframes alertPulse {
     0%, 100% { opacity: 1; }
     50%       { opacity: 0.6; }
   }
   @keyframes fadeUp {
     from { opacity: 0; transform: translateY(3px); }
     to   { opacity: 1; transform: none; }
   }
   ```
4. **Replace mock data** in `data.ts` with real API calls. All data shapes are typed in `types.ts`.
5. **Mount the drawer outside the scaled container** (see note in `SEProfileDrawer.tsx` — `position:fixed` breaks inside a CSS `transform`).
6. **Viewport scaling**: The design is 1360px wide. For narrow viewports, use a `ResizeObserver` to set `transform: scale(containerWidth / 1360)` on the shell — the reference HTML does exactly this.

---

## Screens / Views

### 1. Full-page Shell (always visible)

**Layout:** `display:flex; height:920px` — sidebar (214px fixed) + main (flex:1).

**Background:** `#DEDAD4` (warm taupe page bg), `#F5F4F0` (inner content bg).

**Shadow:** `box-shadow: 0 24px 70px rgba(0,0,0,.2)` on the shell container.

#### Sidebar (214px, `background:#00143A`)
- Gradient accent line top: `linear-gradient(90deg, #0071CE, #CC27B0)`, 2px tall
- Logo: Syne 14px 800 weight, monospace sub-label 7.5px `rgba(255,255,255,.2)`
- Nav items: 11.5px DM Sans, 500 weight, `padding:5px 14px 5px 16px`
  - Active: `background:rgba(255,255,255,.06)`, `border-left:2px solid #0071CE`, color `#fff`
  - Inactive: `color:rgba(255,255,255,.62)`, hover `rgba(255,255,255,.9)`
- Section labels: DM Mono 7.5px, `rgba(255,255,255,.38)`, `letter-spacing:.16em`
- Dividers: `background:rgba(255,255,255,.05)`, margin 8px
- User footer: avatar (28px circle) + name 11.5px + role 8px DM Mono

#### Topbar (44px, `background:#fff`, `border-bottom:1px solid #E2DFD9`)
- Breadcrumb: DM Mono 10.5px — dim color `#A09D98`, current page `#3D3C38` 500 weight
- Right: "Add program" outline button + 30px avatar circle

### 2. Manager Queue Strip (`background:#00143A`)
- Pulsing amber dot (6px, `animation:alertPulse 2.8s ease-in-out infinite`)
- Label: DM Mono 8px `rgba(255,255,255,.5)` uppercase
- Queue cards: `background:rgba(255,255,255,.05)`, `border:1px solid rgba(255,255,255,.1)`, `padding:5px 12px`
  - Text 11px `rgba(255,255,255,.75)` + action button
  - Amber action: `background:#D4810A`
  - Blue action: `background:rgba(0,113,206,.6)`

### 3. Page Header + Stats Strip
- Eyebrow: DM Mono 8.5px `#A09D98` uppercase, letter-spacing `.14em`
- Title: Syne 24px 800 weight, `letter-spacing:-.025em`, color `#0D0E12`
- Subtitle: DM Sans 11.5px `#7A7772`
- Quarter switcher: inline flex, `border:1px solid #D4D1CB`, DM Mono 8.5px
  - Active: `background:#00143A`, `color:#fff`

**Stats strip** — 6-column grid, `border-top:1px solid #E2DFD9`, `padding:12px 16px` each:
- Label: DM Mono 8px `#A09D98` uppercase, `letter-spacing:.1em`
- Value: Syne 22px 700 weight
- Color coding: on-track `#0A6E45`, at-risk `#D4810A`, overdue `#B83128`, completion `#0071CE`
- Progress bar (avg completion): 3px tall, `background:#ECEAE6`, fill `#0071CE`

**Tab bar** — DM Mono 8.5px `letter-spacing:.08em`, `padding:10px 20px`
- Active: `border-bottom:2px solid #0071CE`, `color:#0071CE`
- Inactive: `color:#A09D98`
- Milestones badge: `background:#B83128`, white, 7.5px, `border-radius:99px`, `padding:1px 5px`

---

## Tab Views

### Tab 1: COHORT

**Phase grid** — `background:#fff`, `border:1px solid #E2DFD9`

Grid layout: `180px repeat(4,1fr) 80px` (SE name | 4 phase cells | overall %)

**Column headers:**
- Background `#F9F8F6`, `border-bottom:1px solid #E2DFD9`
- Phase labels: DM Mono 7.5px `#3D3C38` 500 weight
- Phase subtitles: 9px `#A09D98`

**SE data rows** (click opens drawer):
- `cursor:pointer`, `transition:background 80ms`, hover `background:#F9F8F6`
- SE cell (180px): 28px avatar + name 12px 500 + level/day 8px DM Mono `#A09D98`
- Phase cells (4×): colored by status
  - Complete: `background:#EDFAF3`, `color:#0A6E45`, icon `✓`, label "Complete", sub "Signed off"
  - Active:   `background:#F0F7FF`, `color:#0071CE`, icon `→`, label "In progress", sub "On track"
  - Blocked:  `background:#FEF0EE`, `color:#B83128`, icon `!`, label "Blocked", sub "Needs help"
  - Upcoming: `background:#F9F8F6`, `color:#A09D98`, icon `○`, label "Upcoming", no sub
  - Icon: 11px. Label: 11px 500 weight. Sub: 9px `#A09D98`
- Overall cell (80px): DM Mono 14px 500, color matches health, 3px progress bar (56px wide)

**Bottom split** — `grid-template-columns:1fr 1fr; gap:14px`

Phase definitions card: emoji icon (28px square tile) + title 12px 600 + desc 10.5px `#7A7772`, `line-height:1.5`

Overdue milestones card: date `#B83128` 8px DM Mono + label 11px 500 + program 9.5px `#A09D98` + "OVERDUE" tag + Nudge button

### Tab 2: PROGRAMS

Per-SE stacked sections:
- **SE header row** (click opens drawer): 32px avatar + name 13px 600 + level DM Mono 9px `#A09D98` + health badge (DM Mono 8px, colored) + program count right-aligned
- **Program cards grid**: `repeat(4,1fr)`, gap 10px

**Program card** (`background:#fff`, border varies by status):
- Type dot (8px circle) + type label DM Mono 7.5px uppercase + status badge (DM Mono 7.5px, `background:statusBg`)
- Name: 12px 600 `#0D0E12`
- Subtitle: 10px `#7A7772`
- Progress: label 9.5px `#6B6860` + percent DM Mono 9.5px (statusColor) + 3px progress bar
- Footer: "Due DATE" 9px `#A09D98` + "Open →" outline button

### Tab 3: MILESTONES

Two-column: `1fr 320px`

**Milestone list** — three sections (Overdue, Due this week, Upcoming):

Each section header: 8px dot + DM Mono 8px uppercase label, colored per urgency.

**Milestone row** (`padding:10px 16px`, `gap:14px`):
- Date col (36px): DM Mono 9px date + 7.5px day-of-week, colored per urgency
- 1px divider (colored per urgency)
- Avatar (24px) + SE name 11px 500
- Label 11.5px `#0D0E12` + program DM Mono 8.5px `#A09D98`
- Action buttons (vary by section):
  - Overdue: Nudge SE (blue tint) + Reschedule (outline) + Mark done (green tint)
  - This week: Remind SE (amber tint) + View step (outline)
  - Upcoming: days-away label `#A09D98`

**Sign-off sidebar** (`position:sticky; top:0`, 320px, `background:#fff`):
- Header: DM Mono 8px `#D4810A` uppercase + "N items waiting" 11.5px 600
- Each item: 22px avatar + title 11px 500 + description 10.5px `#6B6860` `line-height:1.5` + Approve/Review buttons
- Completed section: green dot list, 10.5px `#3D3C38`

---

## SE Profile Drawer

Triggered by clicking any SE row (Cohort tab) or SE header (Programs tab).

**Dimensions:** 560px wide, full viewport height, slides in from right.

**Backdrop:** `rgba(0,0,0,.32)`, clicking it closes the drawer.

**Slide animation:**
```css
@keyframes slideIn {
  from { transform: translateX(40px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
/* Applied to panel: animation: slideIn .2s ease-out */
```

### Header (`background:#00143A`)
- Gradient top bar: `linear-gradient(90deg,#0071CE,#CC27B0)`, 2px
- Avatar (44px, `border:2px solid rgba(255,255,255,.15)`) + name Syne 18px 800 + level/day DM Mono 8.5px
- Health badge: DM Mono 8px, colored text/bg per health status
- × close button: 28px square, `background:rgba(255,255,255,.08)`, `border:1px solid rgba(255,255,255,.15)`

**Quick stats grid** — `repeat(4,1fr)`, 1px gap on `rgba(255,255,255,.08)` bg:
- Programs count (white), Avg progress (health color), Overdue (`#B83128`), Gates cleared (`#0A6E45`)
- Each cell: DM Mono 14px value + 7.5px `rgba(255,255,255,.4)` label

**Quick actions** — 3 equal-width buttons (flex:1):
- Schedule 1:1 — `background:#0071CE`
- Nudge SE — `background:#D4810A`
- View plan → — outline style, `border:1px solid rgba(255,255,255,.2)`, `color:rgba(255,255,255,.7)`
- All: `font-size:10px`, `padding:7px 10px`

### Body (scrollable, `background:#F5F4F0`)

**Active programs** section:
Each program card (`background:#fff`, `border:1px solid borderColor`, `margin-bottom:10px`):
- Header: 7px dot + name 12px 600 + type label DM Mono 7.5px + status badge
- Progress row: "Progress" 9.5px `#6B6860` + pct DM Mono 9.5px + 4px progress bar + due date
- Step checklist (bordered rows):
  - Step dot: 16px circle, colored: done `#0A6E45`, blocked `#B83128`, active `#0071CE`, upcoming `#F9F8F6`/`#D4D1CB`
  - Check char: done `✓`, blocked `!`, active `→`, upcoming empty
  - Label: 11px, done = `color:#6B6860; text-decoration:line-through`; blocked = `#B83128`; else `#0D0E12`
  - Date: DM Mono 8.5px, blocked = `#B83128`, else `#A09D98`

**Recent activity** section:
Each row: 6px dot + label 11px `#0D0E12` + program name 10px `#A09D98` + date DM Mono 8.5px `#A09D98`

---

## Interactions & Behavior

| Trigger | Behavior |
|---|---|
| Click SE row (Cohort tab) | Open SE Profile Drawer for that SE |
| Click SE header (Programs tab) | Open SE Profile Drawer for that SE |
| Click drawer backdrop | Close drawer |
| Press Escape | Close drawer |
| Click × button | Close drawer |
| Click tab (Cohort/Programs/Milestones) | Switch tab — no page load, just show/hide |
| Click "Sign off →" in queue strip | Should trigger sign-off flow (not yet wired) |
| Click "Nudge" on overdue milestone | Should send nudge (not yet wired) |
| Click "Mark done" | Should mark milestone complete (not yet wired) |
| Click "Approve ✓" in sign-off queue | Should approve gate (not yet wired) |

---

## State Management

```typescript
// ProgramTracker component
const [tab, setTab] = useState<ActiveTab>('cohort');           // active tab
const [drawerSEKey, setDrawerSEKey] = useState<string | null>(null); // null = closed

// SEProfileDrawer component
// Stateless — all data comes from SE_DRAWER_PROFILES[seKey]
```

Future state to add:
- Quarter filter (Q3 FY2026 / Q2 FY2026 / All)
- Sign-off approval state (pending → approved)
- Nudge sent confirmation

---

## Design Tokens

### Colors
```
Navy:       #00143A   (sidebar, drawer header, dark strip bg)
Blue:       #0071CE   (primary action, on-track, active state)
Amber:      #D4810A   (at-risk, behind, warning)
Red:        #B83128   (blocked, overdue, critical)
Green:      #0A6E45   (complete, on track, certified)
Purple:     #CC27B0   (specialization track type)

Bg page:    #DEDAD4
Bg inner:   #F5F4F0
Bg card:    #F9F8F6
Border:     #E2DFD9
Border mid: #D4D1CB

Text:       #0D0E12
Text mid:   #3D3C38
Text dim:   #7A7772
Text faint: #A09D98
Text muted: #6B6860
```

### Typography
```
Display:     Syne, 800 weight — page title (24px), drawer name (18px), stat values (22px)
Body:        DM Sans, 400/500/600 — all body text, buttons
Mono:        DM Mono, 300/400/500 — labels, badges, dates, percentages
```

### Spacing (common values)
```
Card padding:    14px 16px
Row padding:     10px 16px
Section gap:     16px
Column gap:      10px (program cards), 14px (milestone row)
Avatar sizes:    22px (small), 24px, 28px, 30px, 32px, 44px (drawer)
```

### Borders & Surfaces
```
Card border:          1px solid #E2DFD9
Card hover:           background #F9F8F6
Progress bar height:  3px (stats, cohort), 4px (drawer)
Progress bar bg:      #ECEAE6
Shell shadow:         0 24px 70px rgba(0,0,0,.2)
Drawer shadow:        -12px 0 48px rgba(0,0,0,.22)
```

### Buttons
```
Primary (blue):  background #0071CE, white, no border
Amber action:    background #D4810A, white, no border
Outline:         background transparent, border 1px solid #D4D1CB, color #3D3C38
                 hover: border-color #0071CE, color #0071CE
Tint blue:       background #F0F7FF, border rgba(0,113,206,.2), color #0071CE
Tint green:      background #EDFAF3, border rgba(10,110,69,.2), color #0A6E45
Tint amber:      background #FFFBF0, border rgba(212,129,10,.2), color #D4810A

Font: DM Sans, font-size varies (9px small, 10px medium, 11px normal, 14px large)
Padding: 3px 8px (xs), 5px 10px (sm), 7px 12px (md), 8px 14px (lg)
```

---

## Assets
- Fonts: DM Mono, DM Sans, Syne — all from Google Fonts (see link above)
- Icons: Inline SVG in the reference HTML (simple 16×16 stroked icons, no icon library required)
- Images: None — all avatars are 2-letter initials on CSS gradient backgrounds

---

## Cursor-specific Tips

1. **Start with `ProgramTracker.tsx`** — it has every sub-component in one file with inline styles. Cursor can split them out if needed.
2. **Don't convert inline styles to Tailwind classes** without also reading the exact values from `types.ts` + `data.ts` — many colors and gradients are dynamic (per-SE, per-status).
3. **The drawer MUST be rendered outside any `transform:scale(...)` ancestor.** In the reference HTML, the page content is scaled to fit the viewport via `transform` on `#cr`. The drawer is rendered AFTER that container closes, at a sibling level. In React, use a portal (`ReactDOM.createPortal`) or lift the drawer to the root `<App>` level.
4. **The `phaseCell()` and `makeStep()` helpers in `data.ts`** generate the style objects needed by the template. When you replace mock data with API data, you'll still need to call these helpers (or equivalent logic) to compute the derived style fields.
5. **Fonts take ~200ms to load** — you may see a flash of system font on first render. This is expected and matches the reference.
