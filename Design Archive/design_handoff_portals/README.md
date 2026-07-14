# SE Enablement Platform — Portal Design Handoff

## Overview

This package contains high-fidelity HTML design references for the SE Enablement Platform — a multi-role internal tool for sales engineer onboarding, coaching, practice, and certification. There are four distinct portal experiences plus authentication pages:

| Portal | File | Primary User |
|--------|------|--------------|
| Manager Experience v4 | `Manager Experience v4.dc.html` | Sales managers |
| SE / User Experience v1 | `SE Experience v1.dc.html` | SEs, AEs, DSRs, Advisory SCs |
| Admin Experience v1 | `Admin Experience v1.dc.html` | Tenant admins |
| Login Page v3 | `Login Page v3.dc.html` | All users |
| MFA Verify Page v3 | `MFA Verify Page v3.dc.html` | All users |

---

## About the Design Files

The `.dc.html` files are **high-fidelity design prototypes** built in a browser-native DC runtime. They are **not production code** — do not ship them directly. Your task is to **recreate these designs in the existing Next.js + TypeScript codebase** (`se-enablement-platform/`) using its established patterns, Tailwind CSS classes, and component library.

Open each file in a browser (Chrome/Edge recommended) to see the full interactive prototype. All nav items are clickable, panels open and close, and state transitions work. Study the interactions before implementing.

---

## Fidelity

**High-fidelity.** These are pixel-accurate, production-ready designs. Recreate:
- Exact colors (hex values listed in Design Tokens below)
- Exact typography (Syne + DM Mono + DM Sans — already imported in the codebase via `globals.css`)
- Exact spacing, borders, and layout geometry
- All hover states, transitions, and interactive behaviors shown

---

## Design System

### Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Page titles | Syne | 800 | `font-family: 'Syne'; font-weight: 800` |
| Body | DM Sans | 400/500/600 | General UI text, buttons, labels |
| Data / Monospace | DM Mono | 300/400/500 | Numbers, codes, tags, meta labels, nav section headers |

### Color Palette
```
--sp-navy-deep:    #00143A   Primary background, sidebar, CTA buttons
--sp-navy-body:    #0A1628   Body dark surfaces
--sp-blue-deep:    #0033A1   Structural accent, active states
--sp-blue:         #0071CE   Interactive blue, links, progress bars
--sp-magenta:      #CC27B0   Magenta accent (cert, role-tinted elements)
--sp-green:        #0A6E45   Success, on-track, approved
--sp-amber:        #D4810A   Warning, pending, due soon
--sp-red:          #B83128   At-risk, error, blocked
--sp-violet:       #7c3aed   SE role accent, challenge type
--sp-border:       #E2DFD9   Card borders, dividers
--sp-surface:      #F5F4F0   Page background
--sp-surface-alt:  #F9F8F6   Card secondary background
--sp-text-primary: #0D0E12   Primary text
--sp-text-muted:   #6B6860   Body muted text
--sp-text-subtle:  #A09D98   Meta, timestamps
--sp-text-ghost:   #B0ADA8   Placeholders, disabled
```

### Spacing & Geometry
- **Border radius:** 0 (sharp) — no rounded corners anywhere except avatars (50%) and status dots
- **Border width:** 1px standard, 1.5px on active inputs, 2px on left accent borders, 3px on left accent stripes (page headers, alert strips)
- **Grid gaps:** 1px (creates grid-line effect via `gap:1px; background: border-color` on the grid container)
- **Card padding:** 14–16px standard, 18–20px on larger surfaces
- **Page padding:** 22px all sides, 34px bottom

### Sidebar
- Width: 214px (Manager/SE), 220px (Admin)
- Background: `#00143A`
- Top accent line: 2px gradient `linear-gradient(90deg, #0071CE, accent-color)`
- Nav item height: ~30px, 11.5px DM Sans 500
- Active state: `background: rgba(255,255,255,.06); border-left: 2px solid #0071CE; color: white`
- Inactive: `color: rgba(255,255,255,.62)`
- Section labels: 7.5px DM Mono, `rgba(255,255,255,.38)`, letter-spacing .16em, uppercase

### Topbar
- Height: 44px
- Background: white
- Border-bottom: 1px `#E2DFD9`
- Breadcrumb: DM Mono 10.5px — `Section › Page Title`

---

## Portal Specifications

---

### 1. Manager Experience v4

**File:** `Manager Experience v4.dc.html`
**Canvas size:** 1360px wide

#### Pages (all accessible via left nav clicks):

**Command Center** (home)
- 3-zone asymmetric bento grid: `55fr 27fr 18fr`
  - Zone 1: Coaching queue — SE rows with avatar, health dot, last 1:1, sim score, ramp progress bar
  - Zone 2: Inbox mini — 4 items with type tag, title, person, time
  - Zone 3: Metrics column — 4 oversized DM Mono numbers (Reviews, Team ramp, At risk, Cert sign-offs)
- Alert strip: `border-left: 3px solid #D4810A`, amber background `#FFFBF0`
- Team readiness heatmap table: 7-col grid
- Bottom: Leaderboard (58%) + Activity feed (42%)

**Action Inbox**
- Filter tab bar (All, Challenges, Sim cards, Plan steps, Cert sign-offs) — sharp borders, no pills
- Item cards: `border-left: 3px solid accent`, icon, type tag, urgency label, title, actions
- Preview quote section below each item

**Team Roster**
- 4-stat strip (Avg ramp, Avg sim, At risk, Inbox)
- 7-col table: SE, Status, Onboarding progress+bar, Sim score, Dev goals, Inbox count

**Readiness Map**
- 2×2 grid of competency bar charts
- Each SE gets their own bar with color coding (green ≥80, blue ≥70, red <70)
- Coaching focus cards at bottom

**Coaching Cadence**
- Full-width list of SE cards
- Each card: header (avatar, name, health, sim avg, ramp) + AI talking points section

**Development Plans**
- Alert banner for overdue attestations
- SE cards with quarterly grid (Q1–Q4 status)

**Program Tracker**
- 5-stat cohort strip
- Blocked alert callout
- Phase matrix: 6 SEs × 4 phases — color-coded cells
- Phase definitions + milestone timeline at bottom

**My Readiness** (under MY SKILLS)
- 4 headline stats (Overall score, Sim runs, Challenges, Certs)
- 2-col: competency bars with team avg tick mark overlaid (60%) + AI focus + recent runs (40%)
- Cert gates strip at bottom

**My Practice Hub**
- Dark hero recommendation banner (`background: #00143A`)
- 3-col top row: Simulations, Pitch Studio, Challenges (larger cards)
- 4-col bottom row: Flight Check, Market Pulse, Deal Prep, ISC Lab (smaller cards)
- Pending review strip at bottom

**Simulation Workspace**
- 3-col layout: Scenario brief (280px) | Chat interface (1fr) | Live coaching (260px)
- Mic button triggers Web Speech API (`SpeechRecognition`)
- "End & get feedback" transitions to feedback panel (replaces coaching col)
- Step indicators in topbar: 1-Roleplay, 2-AI Feedback, 3-Submit

**Pitch Studio**
- 2-col: Dark camera area (left) | AI scores + peer pitches (right)
- Camera area background: `#0A0A0E` with grid lines at 6.25% opacity
- Record button: circular, 64px, `#B83128`

**Challenges**
- 2-col: Library (380px, with filter chips + dropdowns) | Detail + submission form (1fr)
- Evidence upload: dashed border `1.5px dashed #D4D1CB`
- Submission: file upload OR paste link + reflection textarea

**Flight Check**
- 3-col: Scores so far (240px) | Active question (1fr, centered) | Session context (240px)
- Progress bar: 3px, full width below topbar
- MCQ options: 1.5px border, selected = blue

**Market Pulse**
- 2-col: Quiz (1fr) | Competitor reference + history (300px)
- Question numbers: DM Mono 16px
- Answer reveal: green correct state

**Deal Prep**
- 2-col: Form input (320px) | AI brief output (1fr document-style)
- Brief sections: `border-left: 3px solid accent`, colored background

**ISC Lab**
- 2-col: Mode switcher + starters + sources (240px) | Chat (1fr)
- Messages: user = right-aligned blue bg, assistant = left with avatar
- Cited sources shown as small chips below assistant messages

#### SE Profile Panel (slide-over)
- Width: 510px, slides from right
- Overlay: `rgba(0,14,32,.48)` backdrop blur 1px
- Header: gradient background, name, health dot, ramp bar
- 4-stat strip
- Coaching snapshot, assign sim, cert gates, competency focus sections

---

### 2. SE / User Experience v1

**File:** `SE Experience v1.dc.html`

#### Role switcher
Topbar has SE / AE / DSR / ADVISORY toggle pills — changes ramp %, sim avg, streak, week number, and role label in sidebar. This is a design demo feature; in production roles come from auth.

#### Sidebar accent color
- SE: violet `#7c3aed` (progress ring, MY SKILLS accent)
- All portals: same SailPoint blue `#0071CE` for nav active state

#### Pages:

**My Workspace** (dashboard)
- Dark hero northstar card (`background: #00143A`, full width)
  - Left: greeting, context, 3 CTA buttons
  - Right: SVG progress ring (220 dasharray), 2 mini stats (sim avg, streak)
  - Bottom strip: "Next action" with CTA
- 3-zone bento: `58fr 24fr 18fr`
  - Zone 1: Competency bars with 80-benchmark tick mark
  - Zone 2: Ramp plan quick view (4 steps)
  - Zone 3: 3 stat numbers (Open tasks, Challenges, Sim avg)
- Bottom: Practice tools grid (4-col) + Activity feed

**My Ramp Plan**
- 4-stat strip
- Phase segments expandable: each shows steps with status icons, due dates, CTAs
- Step status icons: check (done), arrow (open), circle (upcoming)

**My Growth**
- Career ladder: 4-col grid (Basic SE → Senior → Advisory → Principal)
- 6 promotion gates with status
- Dev goals with progress bars

**Learn**
- Search bar
- 6 content category cards in 3-col grid
- Recommended + Recently viewed lists

**Certifications**
- 3-stat strip
- 3 cert gate cards — criteria checklist per gate

**ISC Lab** — same as Manager version

**Practice pages** (Simulations, Pitch Studio, Challenges, Flight Check, Market Pulse, Deal Prep) — identical to Manager versions, submission target changes from "peer/admin" to "manager"

---

### 3. Admin Experience v1

**File:** `Admin Experience v1.dc.html`

#### Nav structure (3 groups)
```
MANAGE:   Overview, Users, Plans, Content, Reviews
PLATFORM: AI & Sims, Corpus, Analytics, Audit log
SETTINGS: Feature flags, Integrations, AI config, Basic & retention
MY ROLE:  Manager view, My practice, Test as SE
```

#### Tenant badge in sidebar
Below wordmark: tenant name + subdomain + online indicator dot

#### Pages:

**Overview**
- 5-stat health strip
- 3-zone: Activity bars + events feed (55%) | Pending reviews (26%) | AI usage (19%)
- Feature flag health summary: 6-col grid showing enabled/total per category

**Users**
- 4 stats + search + role filter chips
- 7-col table: User, Role, Level, Manager, Plan, Joined, arrow

**Feature Flags**
- Save bar with pending change indicator
- Grouped by category: each flag has label, id (DM Mono), description, routes, live toggle switch
- Toggle: custom 32×18px sharp toggle (no border-radius)
- **All 22 real feature flags from `lib/platform/settings-shared.ts` are represented**

**AI Config**
- Left: provider selector (xAI/OpenAI toggle), model field with datalist, encrypted API key field, 5 global AI toggles
- Right: usage stats, sim template list with "Test →" buttons
- "Test as SE →" button routes to Test mode

**Integrations**
- 2×2 card grid: Gong, Slack, Supabase, Vercel
- Each card: icon, name, status tag, description, detail prose, CTA button

**Analytics**
- 4 KPIs, engagement by tool (7-col grid with mini bars), top SEs table

**Basic & Retention**
- 2-col: Tenant identity fields | Retention sliders (audit, activity, AI, session idle)

**Test as SE**
- Orange banner: `background: #FFFBF0; border: 1px solid #D4810A`
- SE northstar hero (read-only)
- 3 test action cards (Test sim, Test challenge, Test ramp plan)

---

### 4. Login Page v3

**File:** `Login Page v3.dc.html`
**Canvas:** 1280×800

#### Layout: 52% / 48% split

**Left panel** (`background: #00143A`)
- Top accent: 2px gradient line
- SVG identity graph: diamond nodes connected by dashed lines, center node highlighted
- Grid texture overlay: 40px grid, 3% opacity
- Wordmark: "Enablement / PLATFORM" — not "SailPoint SE Enablement"
- Headline: Syne 800, 48px, "Built for the people who close."
- Feature list: 4 items with colored 14px dash markers
- Tenant footer: domain + online dot

**Right panel** (`background: #F5F4F0`)
- Step indicator: square numbered steps, line connector
- SSO button: white, sharp border
- OR divider: DM Mono, letter-spaced
- Email + password inputs: sharp 1.5px borders, left icon
- Submit: `background: #00143A`, full width

---

### 5. MFA Verify Page v3

**File:** `MFA Verify Page v3.dc.html`

**Left panel** — concentric diamond rings + shield SVG motif
- Copy: "One more step to get in."
- Step instructions with numbered squares

**Right panel**
- Step indicator: step 1 shows strikethrough (done), step 2 active
- 6 OTP input boxes: 44×52px, DM Mono 22px, filled = `border-color: #0071CE; background: #F8FBFF`
- Timer indicator strip: `background: #fff; border: 1px solid #E2DFD9`
- Submit button: 50% opacity until all 6 digits entered

---

## Interactions & Behavior

### Navigation
All nav items use `onClick` handlers that set a `page` state variable. Implement as Next.js router navigation (`router.push` or `Link`). The DC runtime's state machine maps to URL params.

### SE Profile Panel (Manager portal)
- Clicking any SE row opens a 510px slide-over from right
- Overlay click closes panel
- CSS: `position: absolute; right: 0; top: 0; height: 100%; width: 510px`
- Transition: `transform: translateX(0)` ↔ `translateX(510px)`, 200ms ease

### Simulation workspace — mic
```typescript
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SR();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
recognition.onresult = (e) => { /* append final transcripts to draft */ };
```
Mic state: border turns `#B83128`, pulsing dot appears.

### Progress bars
All bars animate from `width: 0` on mount:
```css
@keyframes pf { from { width: 0 } }
.pbar-fill { animation: pf 1.1s cubic-bezier(.16,1,.3,1) forwards; }
```

### Feature flags (Admin)
Each toggle is a local state toggle — `setState(s => ({ flags: { ...s.flags, [id]: !s.flags[id] } }))`. Save button POSTs to `/api/admin/platform-settings`.

### Pulsing indicator
```css
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
.lp { animation: pulse 2.4s ease-in-out infinite; }
```
Used on: notification badge, online dots, "at risk" indicators.

### Sim feedback transition
After "End & get feedback" click: `simFeedback` state flips, coaching hints panel swaps to feedback report panel. Same 3-col layout, right column content swaps.

---

## Component Inventory

### Reusable components to create

| Component | Description | Used in |
|-----------|-------------|---------|
| `<NavSidebar>` | Dark nav with groups, active state, section labels | All portals |
| `<Topbar>` | 44px header with breadcrumb, search, notification, avatar | All portals |
| `<BentoGrid>` | `gap:1px; background: border-color` grid technique | All portals |
| `<StatColumn>` | Oversized DM Mono number + label + sub | Manager, Admin |
| `<AlertStrip>` | `border-left: 3px solid color` alert with action | Manager, SE |
| `<SEProfilePanel>` | 510px slide-over with stats, coaching, certs | Manager |
| `<ProgressBar>` | 3px animated fill bar | All portals |
| `<StatusTag>` | DM Mono tag: `8px; letter-spacing: .09em; uppercase` | All portals |
| `<AvatarInitials>` | Gradient circle avatar with 2-letter initials | All portals |
| `<SimWorkspace>` | 3-col sim chat with mic, rubric, coaching | Manager, SE |
| `<ChallengePortal>` | Library + detail + submission form | Manager, SE |
| `<OTPInput>` | 6-digit OTP boxes, 44×52px, DM Mono | MFA page |
| `<FeatureFlagToggle>` | Custom 32×18px sharp toggle | Admin |
| `<IdentityGraph>` | SVG node graph for login left panel | Login |

---

## Existing Codebase Patterns to Follow

The codebase (`se-enablement-platform/`) uses:
- **Next.js App Router** with server + client components
- **Tailwind CSS** with custom design tokens in `globals.css`
- **Existing token names:** `sp-navy-deep`, `sp-navy-body`, `sp-blue`, `sp-blue-deep`, `sp-magenta`, etc.
- **Component pattern:** `"use client"` for interactive, server components for data fetching
- **Auth:** RBAC via `lib/auth/rbac.ts` — `AccessTier` union (`se | manager | admin | super_admin`)
- **Nav:** `NavSidebar` in `components/nav-sidebar.tsx` — extend this, don't replace it
- **App shell:** `components/app-shell.tsx` — keep this wrapper

### Key files already in codebase
```
components/nav-sidebar.tsx         — Nav (extend with new items)
components/app-shell.tsx           — Shell wrapper
lib/auth/rbac.ts                   — RBAC, nav groups, feature flags
lib/platform/settings-shared.ts   — All 22 feature flag definitions
components/admin/admin-console.tsx — Admin tabs (refactor to sidebar nav)
components/se/se-workspace-northstar.tsx — SE dashboard (redesign)
app/simulations/page.tsx           — Sim page (redesign workspace)
app/challenges/page.tsx            — Challenges (portal already built)
```

---

## Migration Notes

### Manager portal
The existing `/manager` page uses `?section=` query params for navigation. The new design uses a persistent sidebar instead of query-param sections. Keep URL param compatibility for deep links but add sidebar nav.

### Admin portal
Replace tab bar (`AdminTabs`) with sidebar nav. All existing tab panels (`overview`, `users`, `plans`, etc.) map 1:1 to sidebar nav items — content stays the same, chrome changes.

### Login/MFA
Replace Inter/Plus Jakarta Sans with Syne + DM Mono + DM Sans. Remove all `border-radius` from form elements and cards. Replace gradient text with flat color. Wordmark changes from "SailPoint / SE Enablement" to "Enablement / PLATFORM" (tenant-configurable via `TenantBrandMark`/`TenantBrandText` components).

---

## Files in This Package

```
design_handoff_portals/
├── README.md                        ← This file
├── DESIGN_TOKENS.md                 ← Color + type + spacing reference
├── COMPONENT_SPECS.md               ← Per-component implementation notes
├── Manager Experience v4.dc.html    ← Manager portal (open in browser)
├── SE Experience v1.dc.html         ← SE/user portal (open in browser)
├── Admin Experience v1.dc.html      ← Admin portal (open in browser)
├── Login Page v3.dc.html            ← Login page (open in browser)
└── MFA Verify Page v3.dc.html       ← MFA verify page (open in browser)
```

Open each `.dc.html` file in Chrome or Edge. All nav is interactive. Click through every page to understand layout and transitions before implementing.

---

## Questions?

Every design decision is documented in the prototype itself — inspect element freely. The HTML source is readable and all styles are inline, so you can diff any element directly.
