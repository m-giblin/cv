# Development Plans + Content Admin Portal — Developer Handoff
> Built for Cursor. Read every section before writing code.

---

## Overview: What these two pages do together

**Development Plans** (manager-facing) is an AI-driven annual growth planning tool. Instead of a blank form, the manager sees AI-generated development goals for each SE, pre-populated from real platform data: sim scores, cert gaps, coaching notes, ramp progress, and gate status.

**Content Admin Portal** (admin/content-team-facing) is the task queue that receives AI-generated content requests from Development Plans. When a manager approves a new scenario that doesn't exist in the library, an AI-created task lands in this portal automatically — pre-filled with context, success criteria, competencies, timeline, and priority.

Together they close the loop:
1. AI detects a skill gap with no content → surfaces it in Development Plans
2. Manager submits the content request → task auto-creates in Content Admin Portal
3. Content team builds it → publishes and notifies manager
4. Manager assigns it to the SE → goal card updates, milestone appears on Plan Calendar

---

## File map

```
types/
  devPlans.ts               All TypeScript interfaces for Development Plans
  contentAdmin.ts           All TypeScript interfaces for Content Admin Portal

data/
  mockSEProfiles.ts         SE profiles with all computed signals
  mockContentTasks.ts       AI-generated + manual content tasks

hooks/
  useApprovedPlans.ts       localStorage persistence for approved plan state
  useContentTasks.ts        Task state management (status, assignee, activity, timeline)

utils/
  signals.ts                Compute AI data signals from SE profile data
  goalBuilder.ts            Build goal cards from approved plan data
  calendarSync.ts           ICS export for plan milestones

components/
  DevelopmentPlans.tsx      Main page — SE card list + team summary bar
  SECard.tsx                One SE row: header, goal cards, quarter strip
  GoalCard.tsx              One goal: progress bar, milestones, AI challenge flag
  AIReviewDrawer.tsx        Slide-in: AI reasoning + suggested goals — approve/reject
  FullPlanDrawer.tsx        Slide-in: data signals + active goals + calendar milestones
  ContentSubmitModal.tsx    Modal: AI brief review + submit to content team

  ContentAdminPortal.tsx    Main page — task table + detail panel
  TaskTable.tsx             Filterable task list with AI dot indicators
  TaskDetailPanel.tsx       3-tab panel: Brief / Timeline / Activity
  AssignWriterModal.tsx     Writer picker with load + availability
  NewTaskModal.tsx          Manual task creation form

references/
  DevelopmentPlans.reference.html    Working prototype (open in browser)
  ContentAdminPortal.reference.html  Working prototype (open in browser)
```

---

## How the AI plan approval flow works

### Step 1 — AI generates suggested goals
On mount, call `GET /api/dev-plans/suggestions?seId={id}` which returns an array of `SuggestedGoal[]`. In the prototype, this is mocked in `mockSEProfiles.ts`.

### Step 2 — Manager opens AI Review Drawer
`AIReviewDrawer` receives the suggested goals and the AI reasoning string (pre-computed server-side from the SE's data signals). The reasoning string is the one-line summary showing the actual numbers: "Day 22 · Sim avg 55 (↓23 pts) · Gate 1 blocked 13 days..."

### Step 3 — Manager approves
On approve: `POST /api/dev-plans/approve { seId, goals: SuggestedGoal[] }`. In the prototype, this sets `approved[seId] = true` in local state, which causes `SECard` to switch from the empty state to the goal cards view.

### Step 4 — Calendar sync
On approval, also call `POST /api/calendar/sync { seId, milestones: Milestone[] }` to push dates to Plan Calendar. The `calendarSync.ts` util also handles ICS download as a fallback.

---

## How the content request flow works

### Step 1 — Manager clicks "Approve & add to content library"
`ContentSubmitModal` opens showing the AI-drafted scenario brief. The brief data (`context`, `successCriteria`, `competencies`, `difficulty`) is generated server-side by your LLM when the gap is first detected.

### Step 2 — Manager submits
`POST /api/content-requests { seId, managerId, brief: ContentBrief }`. The backend creates a task in your content management system.

### Step 3 — Task appears in Content Admin Portal
The portal polls `GET /api/content-tasks` (or uses a websocket). AI-generated tasks have `isAI: true` and arrive pre-filled — the content team sees the full brief immediately.

### Step 4 — Content team assigns + publishes
- `PATCH /api/content-tasks/{id} { assigneeId, status: 'assigned' }`
- `PATCH /api/content-tasks/{id} { status: 'complete', publishedAt }`

### Step 5 — Manager notification
On publish: `POST /api/notifications { managerId, message: "Scenario ready — assign to {SE}?" }`. In the prototype this is a toast.

---

## Buttons — what each one does

### Development Plans

| Button | What it does | Production implementation |
|--------|-------------|--------------------------|
| Review AI plan → | Opens AIReviewDrawer for that SE | Local state — no API needed |
| Approve plan → | Sets SE status to ACTIVE, shows goal cards, syncs calendar | POST /api/dev-plans/approve |
| Add milestones to calendar | Downloads .ics + calls calendar sync API | utils/calendarSync.ts |
| Approve all AI suggestions | Approves all pending SEs at once | Batch POST |
| Sync to Calendar | Pushes all milestones to Plan Calendar | POST /api/calendar/sync-all |
| View full plan | Opens FullPlanDrawer with data signals + goals | Local state |
| Approve & add to content library | Opens ContentSubmitModal | Local state |
| Submit to content team → | Creates content task in admin portal | POST /api/content-requests |

### Content Admin Portal

| Button | What it does | Production implementation |
|--------|-------------|--------------------------|
| Assign writer | Opens writer picker modal | PATCH /api/content-tasks/{id} { assigneeId } |
| Start building → | Moves task to IN PROGRESS | PATCH /api/content-tasks/{id} { status: 'in_progress' } |
| Publish ✓ | Marks complete, notifies manager | PATCH /api/content-tasks/{id} { status: 'complete' } + POST /api/notifications |
| Edit brief | Makes scenario context editable | Local state — PATCH on save |
| Toggle timeline step | Marks individual build steps done | PATCH /api/content-tasks/{id}/timeline/{stepId} |
| Post note | Adds to activity log | POST /api/content-tasks/{id}/activity { note } |
| Export queue | Download task list as CSV | Client-side CSV generation |
| New content task | Manual task creation form | POST /api/content-tasks |
| Filter tabs | Filter by status | Local state only |

---

## State management

### Development Plans state
```typescript
interface DevPlansState {
  approved: Record<string, boolean>;       // seId -> approved
  drawerOpen: boolean;                     // AI review drawer
  drawerKey: string;                       // which SE's AI drawer is open
  planDrawerOpen: boolean;                 // full plan drawer
  planDrawerKey: string;                   // which SE's plan drawer
  contentModal: { title: string } | null;  // content submit modal
  contentSubmitted: Record<string, boolean>; // which goals submitted
  toast: { msg: string; color: string } | null;
}
```

In production: `approved` comes from the API, not local state. Everything else is UI state.

### Content Admin Portal state
```typescript
interface ContentAdminState {
  selectedId: string;
  filter: 'all' | 'ai' | 'new' | 'progress' | 'complete';
  detailTab: 'brief' | 'timeline' | 'activity';
  isEditing: boolean;
  assignModal: boolean;
  newTaskModal: boolean;
  taskStatus: Record<string, string>;    // id -> status (optimistic updates)
  taskAssignee: Record<string, string>;  // id -> writer name
  taskActivity: Record<string, ActivityEntry[]>; // id -> activity log
  taskTimeline: Record<string, TimelineStep[]>;  // id -> timeline steps
}
```

All `task*` keys are optimistic UI state — POST to API then update. On mount, fetch the full task list and hydrate.

---

## Colors (SailPoint brand)
```
Navy:           #00143A   (header backgrounds)
Blue:           #0071CE   (primary actions, links)
Purple AI:      #CC27B0   (AI-generated indicators)
Red critical:   #B83128   (urgent, failing)
Amber warning:  #D4810A   (at risk, overdue)
Green positive: #0A6E45   (on track, approved, published)
Neutral bg:     #F5F4F0
Border:         #E2DFD9
Card bg:        #FAFAF8
Text primary:   #0D0E12
Text secondary: #6B6860
Text muted:     #A09D98
```

---

## Fonts
- **Syne 700/800** — drawer headings, SE names in headers
- **DM Sans 400/500/600** — all body text, buttons
- **DM Mono 300/400/500** — labels, timestamps, badges, metadata

Load from Google Fonts or self-host. Already in both prototype HTML files.

---

## Cursor tips

1. **Start with the prototype HTML files** — open them in a browser and click everything. This is the working reference.
2. **Data signals are the hardest part** — `utils/signals.ts` shows how to compute the 6 AI signals from an SE profile object. Do this server-side in production.
3. **The AI reasoning string** — generate it server-side with a template that interpolates real values. Don't call an LLM at render time for this.
4. **The content brief** — DO call an LLM for this. When a gap is detected with no existing content, send the gap data to your LLM and ask it to generate a scenario brief. The `ContentBrief` type defines the expected shape.
5. **Drawer animations** — both drawers use `animation: slideIn .25s ease` from the right. The CSS keyframe is in the `<style>` block of each prototype.
6. **The purple AI pulsing dot** — it's a `@keyframes pulse` animation applied to a 6px circle div. See the prototype for the exact CSS.
7. **Textarea reads** — the prototype uses `document.getElementById()` to read textareas. In React, use `useRef` with `ref.current.value` or controlled inputs with `useState`.
