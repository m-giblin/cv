# Plan Calendar — Feature Spec

## Overview

A visual ramp plan calendar for managers, SEs, and mentors. Surfaces at `/manager?section=calendar` or as a dedicated route `/plan-calendar`. Three views: Timeline (Gantt), Month, Week.

## Role permissions

| Role | Drag bars | Shift dates | Block days | View |
|------|-----------|-------------|------------|------|
| Manager | ✅ | ✅ | ✅ | Full team |
| SE | ❌ | ❌ | ❌ | Own plan only |
| Mentor | ❌ | ❌ | ❌ | Review/gate steps only |

Role is read from `AccessTier` in `lib/auth/rbac.ts`. Pass as prop or read from auth context.

---

## Layout

```
214px Sidebar  |  [topbar 44px]
               |  [role banner 32px]
               |  [3 views: Timeline / Month / Week]
               |  [step detail panel — slides up on click, manager only]
```

---

## Timeline View (Gantt)

### Two levels (implement toggle)

**Level 1 — Team view (default)**
- One row per employee
- One bar spanning full plan duration (start → end date)
- Manager drags bar to shift start date for that employee
- Click bar to drill to Level 2

**Level 2 — Step view (drill-down)**
- One row per task in the selected employee's plan
- Left label col: task icon + title + type
- Manager drags individual bars to shift due dates

### Canvas layout
```
160px fixed label col  |  scrollable bars area (ganttTotalWidth px wide)
```
`ganttTotalWidth = totalCalendarDays * dayWidth` (22px/day, 130 days covers 90 biz days)

### Scroll sync
Three elements must scroll together:
- `#ganttScroll` — master (drives others via scroll event)
- `#hdrScroll` — syncs `.scrollLeft` from ganttScroll
- `#labelScroll` — syncs `.scrollTop` from ganttScroll

```js
ganttScroll.addEventListener('scroll', () => {
  hdrScroll.scrollLeft = ganttScroll.scrollLeft;
  labelScroll.scrollTop = ganttScroll.scrollTop;
});
```

### Day headers
Show all calendar days (Mon–Sun). Weekend columns shaded `rgba(0,0,0,.025)`. Month name shown on `date.getDate() === 1`. Today line: `2px rgba(0,113,206,.25)` vertical.

### Step bars
- Height: 22px, top: 5px within 32px row
- Left position: `bizDayOffset * dayWidth` (via `offsetToX`)
- Width: `max(dayWidth * 2, 30)px`
- Color: type-specific (see Design Tokens)
- Border-left: 3px, type accent color
- Gate steps: 14×14px diamond (`transform: rotate(45deg)`), color `#CC27B0`

### Business day math
Due offsets are in **business days** (Mon–Fri, no weekends). Convert to calendar date:

```js
function bizToDate(startDate, bizOffset) {
  let count = 0;
  let date = new Date(startDate);
  while (count < bizOffset) {
    date = new Date(date.getTime() + 86400000);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return date;
}

function offsetToX(startDate, bizOffset, dayWidth) {
  const date = bizToDate(startDate, bizOffset);
  const calDays = Math.round((date - startDate) / 86400000);
  return calDays * dayWidth;
}
```

### Manager drag (step bars)
```js
bar.addEventListener('mousedown', (e) => {
  if (role !== 'manager') return;
  e.preventDefault();
  const startX = e.clientX;
  const origOffset = step.dueOffset;
  const onMove = (me) => {
    const calDayDelta = Math.round((me.clientX - startX) / dayWidth);
    const bizDelta = Math.round(calDayDelta * 5 / 7);
    if (bizDelta !== 0) {
      step.dueOffset = Math.max(1, origOffset + bizDelta);
      // re-render bar position
    }
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', onMove);
    // PATCH /api/plans/assignments/:id with updated step dueOffsets
  }, { once: true });
});
```

Cursor: `ew-resize` in manager mode, `pointer` in SE/mentor.

---

## Step detail panel (manager only)

Slides up from bottom when a bar is clicked. Height ~60px.

Contents:
- Step icon + title + type tag + due date (formatted from `bizToDate`)
- Shift buttons: `← 7d` `← 1d` `[+Nd]` `1d →` `7d →` `Next Mon →`
- "Block day" button — marks date as non-working across all assigned SEs

"Next Monday" logic:
```js
const dow = stepDate.getDay(); // Mon=1..Fri=5
const calDaysToMon = dow === 1 ? 7 : (8 - dow);
const bizDaysToMon = calDaysToMon - (calDaysToMon > 5 ? 2 : 0);
step.dueOffset += Math.max(1, bizDaysToMon);
```

---

## Month View

7-column CSS grid. Each cell shows step events due in that day's ±2 day window. Color-coded dot bars per step type. Standard month navigation (prev/next).

## Week View

7-column grid for the current week. Each column shows all steps due that day. Cards with `border-left: 3px solid accentColor`. Prev/next week navigation.

---

## Segment bands

Three background bands across the gantt canvas:

| Segment | Biz days | Background | Border |
|---------|----------|------------|--------|
| Seg 1 | 1–30 | `rgba(0,113,206,.04)` | `rgba(0,113,206,.12)` |
| Seg 2 | 31–60 | `rgba(204,39,176,.04)` | `rgba(204,39,176,.12)` |
| Seg 3 | 61–90 | `rgba(10,110,69,.04)` | `rgba(10,110,69,.12)` |

Labeled in a 22px footer row below the step rows.

---

## API

```
GET  /api/plans/assignments/:userId     — load steps + dates for an SE
PATCH /api/plans/assignments/:id        — save shifted due offsets
POST /api/plans/holidays               — block a date (non-working day)
GET  /api/plans/holidays?tenantId=     — load blocked dates for rendering
```

Blocked dates should be stored in a `plan_holidays` table: `{ id, tenant_id, date, label, created_by }`.

---

## Step type colors (for bars)

| Type | Bar color | Border | Tag bg | Tag color |
|------|-----------|--------|--------|-----------|
| content_review | `rgba(0,87,168,.85)` | `#0057a8` | `#EEF4FF` | `#1D4ED8` |
| challenge | `rgba(91,33,182,.8)` | `#5b21b6` | `#EDE9FE` | `#5b21b6` |
| simulation | `rgba(165,30,142,.8)` | `#A51E8E` | `#FDF0FA` | `#A51E8E` |
| deal_prep | `rgba(180,83,9,.8)` | `#b45309` | `#FEF3C7` | `#b45309` |
| mentor_review | `rgba(10,110,69,.85)` | `#0A6E45` | `#EDFAF3` | `#0A6E45` |
| shadow | `rgba(61,60,56,.7)` | `#6B6860` | `#F5F4F0` | `#6B6860` |
| gate | n/a | n/a | `#FDF0FA` | `#A51E8E` |

Gate diamond color: `#CC27B0`

---

## Outstanding design note

The calendar currently shows **Level 2 (step view)** only. Before shipping, implement the **Level 1 team view** toggle:
- Default: one row per SE, one bar per plan (full duration)
- Click any SE bar → drill to step view for that employee
- This makes the calendar useful at a glance for managers with 5–10 direct reports
