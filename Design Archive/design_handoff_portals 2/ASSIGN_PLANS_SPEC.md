# Assign Plans — Feature Spec

## Overview

A dedicated manager workflow for assigning onboarding and enablement plans to team members. Lives at `/plans` (replaces the existing buried assign form at the bottom of `PlanManagementPanel`).

## Layout

3-column workspace:

```
280px Plan library  |  1fr Employee roster  |  300px Plan preview + confirm
```

---

## Col 1 — Plan Library

Scrollable list of plan template cards. Filter tabs: All / Locked / Custom.

### Plan card anatomy
- 3px top accent bar (gradient per plan type)
- Plan name + description
- Lock badge (`LOCKED`) or Custom tag
- Step type pills (content, sim, challenge, etc.)
- Meta: step count · duration · "Used by N"
- Drag handle row at bottom + "VIEW STEPS" text button

### Drag behavior
- `draggable="true"` on each card
- `dragstart`: store `dragPlanId` in state, set `effectAllowed = 'copy'`, add `.dragging` class (opacity .35, dashed border)
- `dragend`: remove `.dragging`, clear `dragPlanId`
- Clicking a card selects it (highlights with magenta ring) and loads its steps in Col 3

---

## Col 2 — Employee Roster

Grid of employee cards (2-col), sectioned: **New Hires** (pulsing green dot) | **Existing Team**.

Filter chips: All / New hires / Existing / Unassigned

### Employee card states

**Unassigned (default)**
```
border: 1px solid #E2DFD9
Drop zone: 1.5px dashed #D4D1CB, "Drop plan here"
```

**Drag-over (plan hovering)**
```
Drop zone: 1.5px dashed #0071CE, background #F0F7FF
Label: "Release to assign"
```

**Assigned**
```
border-color: #0A6E45; background: #EDFAF3
Green ASSIGNED badge top-right
Plan name strip: border-left 3px #0A6E45, bg #F0FDF7
Edit dates + Remove buttons
```

### Drop events on employee card
- `dragover`: `preventDefault()`, set `emp.isDragOver = true`
- `dragleave`: set `emp.isDragOver = false`
- `drop`: `preventDefault()`, set `isDragOver = false`, set `pendingAssignment = { plan, person, empId, planId }`

> **Important:** Never use ternary expressions in template holes (`{{ a ? b : c }}`). Compute all conditional values (`dropLabel`, `dropBorderColor`, `dropBg`, `dropIconColor`, `dropTextColor`) in `renderVals()` and expose as flat strings.

---

## Col 3 — Plan Preview + Confirm

### Steps list
- Drag-to-reorder: always enabled (locked and custom plans)
- Delete: **locked plans** — icon replaced with lock SVG, no onClick, tooltip "Admin only"
- Delete: **custom plans** — red trash icon, removes step from local state
- Add step button: custom plans only

### Lock rules
| Plan type | Reorder | Add step | Delete step |
|-----------|---------|----------|-------------|
| Locked (30/60/90/120d, AE) | ✅ Manager | ❌ Admin only | ❌ Admin only |
| Custom | ✅ Manager | ✅ Manager | ✅ Manager |

Lock notice strip: `border-left: 3px solid #b45309; background: #FFFBF0`

### Pending assignment confirm panel
Appears after drop. Fields: start date (date input) + mentor (select). Buttons: "Confirm & assign →" (POST) + "Cancel".

On confirm → `POST /api/plans/assignments` with `{ planId, userId, mentorId, startDate }` → employee card switches to assigned state.

---

## API endpoints (existing)

```
GET  /api/plans/templates          — list all templates
POST /api/plans/templates          — create custom template
PATCH /api/plans/templates/:id     — update template (reorder steps, edit)
DELETE /api/plans/templates/:id    — delete template (admin only for locked)
POST /api/plans/assignments        — assign plan to user
GET  /api/plans/assignments        — list active assignments
```

## Locked plan IDs
Locked status is a field on the plan template record. Recommend adding `is_locked: boolean` to the `plan_templates` table. Managers cannot call `DELETE /api/plans/templates/:id` or `POST/PATCH` step deletions on locked plans — enforce at API middleware level (check `is_locked` + caller tier).

---

## Step reorder (drag)
Steps use position-relative `::before` / `::after` pseudo-elements for the blue drop-line indicator:

```css
.step-row.drag-above::before { content:''; position:absolute; top:-1px; left:0; right:0; height:2px; background:#0071CE; z-index:10; }
.step-row.drag-below::after  { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:#0071CE; z-index:10; }
```

On `dragover`: add `drag-above` if target index < source index, else `drag-below`.
On `drop`: splice moved step to new index, clear classes.
On confirm save: `PATCH /api/plans/templates/:id` with updated step `sort_order` values.
