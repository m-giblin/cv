# Coaching Cadence — Developer Handoff
> Built for Cursor. Read this top to bottom before touching any code.

## What this screen does
A manager command center for coaching SE (Solutions Engineer) reps through a structured ramp program. It has two panels:
- **Left:** Priority queue of SEs sorted by urgency (COACH NOW → BEHIND → ON PACE → AHEAD)
- **Right:** Full coaching profile for the selected SE — sim trend sparkline, competency bars, AI-generated 1:1 brief, coaching history

## Tech stack
- React (functional components with hooks recommended, but class components work too)
- TypeScript
- No external UI library — all styling is inline or Tailwind utility classes if you want to swap
- Data comes from your backend API (see types.ts for shapes)
- Notes persist to localStorage today; wire to your API endpoint when ready

---

## File map
```
types.ts                    — All TypeScript interfaces
data.ts                     — Mock data matching the interfaces (use as API response shape)
CoachingCadence.tsx         — Main page component (two-panel layout)
SEProfilePanel.tsx          — Right panel: header, sparkline, competency, brief, history
CoachingQueue.tsx           — Left panel: priority-sorted SE list
CoachingNoteModal.tsx       — Log note modal
hooks/useCoachingNotes.ts   — localStorage persistence + merge logic
utils/icsExport.ts          — .ics calendar invite generator
utils/briefPdf.ts           — Print-ready PDF brief generator
utils/mailto.ts             — Mailto helper for sending notes to SE
```

---

## Buttons — what each one does and how to implement it

### 1. Schedule 1:1 → (blue button, SE header + bottom bar)
**What it does in the prototype:**
Generates a .ics file (iCalendar format) and triggers a browser download. The invite includes:
- Summary: "1:1 Coaching — [SE Name] ([Level])"
- Start: next weekday at 10am, 30 min duration
- Description: full AI brief text embedded as plain text
- Location: "Microsoft Teams"

**How to implement in production:**
Option A (simplest — keep .ics): call `generateICS(se)` from `utils/icsExport.ts` and trigger download.
Option B (Microsoft 365): use the Graph API `POST /me/events` with the brief in the body. Requires OAuth with Calendars.ReadWrite scope. Add `onlineMeeting: { provider: 'teamsForBusiness' }` to auto-generate a Teams link.
Option C (deeplink): `https://outlook.office.com/calendar/deeplink/compose?subject=...&body=...` opens Outlook new event in browser — no OAuth needed, but user has to click Save.

**Cursor tip:** Start with Option A (already built in `utils/icsExport.ts`), then swap to Graph API when you have auth set up.

---

### 2. Download PDF (ghost button, SE header)
**What it does in the prototype:**
Opens a new browser tab with a print-ready Letter-sized HTML page containing:
- Dark header with SE name + health badge
- 4-stat grid (Last 1:1, Sim avg, Ramp, Overdue)
- Competency bars (5 skills with color-coded scores)
- AI 1:1 Brief (all talking points with action labels)
- Coaching history (dates, focus, notes, sim delta)
Then auto-triggers `window.print()` after 600ms.

**How to implement in production:**
The prototype approach (open new window, write HTML, print) works fine and requires no dependencies. See `utils/briefPdf.ts` for the full implementation.
If you want a true PDF file (not browser print dialog): use `@react-pdf/renderer` or Puppeteer server-side. The HTML structure in `briefPdf.ts` maps directly to react-pdf primitives.

**Cursor tip:** The prototype version is production-ready for most use cases. Only replace it if you need PDF attachments in email without user interaction.

---

### 3. Copy brief (ghost button, SE header)
**What it does:** Calls `navigator.clipboard.writeText()` with the full brief formatted as plain text bullet points. Shows a toast on success.

**In production:** Same implementation. Optionally add rich text (HTML) to clipboard using `ClipboardItem` for paste into Word/Outlook.

---

### 4. Log coaching note (bottom action bar, all SEs)
**What it does in the prototype:**
1. Opens a modal with a textarea
2. On Save: appends the note to that SE's coaching history in state
3. Persists all notes to `localStorage` under key `cc_notes`
4. Triggers `mailto:` with the note pre-filled as an email body to the SE

**How to implement in production:**
- Replace localStorage write with `POST /api/coaching-notes` — body: `{ seId, managerId, date, note, sessionFocus }`
- The mailto hook stays — it's a zero-infrastructure way to get notes to the SE. If you want it more structured, add a "Send via Teams" option using Graph API `POST /me/chats/{chatId}/messages`.
- On mount, replace localStorage read with `GET /api/coaching-notes?seId=` and merge with the SE's existing history.
- See `hooks/useCoachingNotes.ts` for the merge logic.

**Cursor tip:** The modal reads the textarea value via `document.getElementById('cc-note-ta').value` in the prototype because controlled inputs are tricky in this runtime. In React, use `useState` with `onChange` on the textarea like normal.

---

### 5. Sign off Gate 1 (red button, DS brief + bottom bar)
**What it does:** Shows a toast confirming gate approval. In production this should `PATCH /api/gates/{gateId}` with `{ status: 'approved', approvedBy: managerId }` and remove the gate blocker from the brief.

---

### 6. Assign sim (blue button, various brief points)
**What it does:** Shows a toast with the sim name. In production: `POST /api/sim-assignments` with `{ seId, simId, assignedBy, dueDate }`. The sim catalog comes from your LMS or sim platform API.

---

### 7. Pair with Harper / Submit peer coach nomination
**What it does:** Toast only in prototype. In production: `POST /api/peer-pairings` or similar. Needs a people/org API to look up manager IDs.

---

## Data shapes
See `types.ts` for full interfaces. Key types:
- `SEProfile` — everything in the right panel
- `BriefPoint` — one AI talking point with optional action button
- `CoachingHistoryEntry` — one past session row
- `CompetencySkill` — one competency bar
- `QueueEntry` — one row in the left panel

---

## State management
The prototype uses component-local state. In production:
- `selectedSEId`: URL param (`/coaching/[seId]`) — lets managers share/bookmark a profile
- `notes`: fetched from API on mount, optimistically updated on save
- `toast`: local ephemeral state (never persisted)
- `noteModal`: local UI state

---

## Colors (SailPoint brand)
```
Navy (primary):    #00143A
Blue (action):     #0071CE
Red (critical):    #B83128
Amber (warning):   #D4810A
Green (positive):  #0A6E45
Neutral bg:        #F5F4F0
Border:            #E2DFD9
Text primary:      #0D0E12
Text secondary:    #6B6860
Text muted:        #A09D98
```

---

## Fonts
- Syne 700/800 — headings and SE names
- DM Sans 400/500/600 — body
- DM Mono 300/400/500 — labels, timestamps, mono data

Load via Google Fonts or self-host. Already in the prototype's `<head>`.

---

## Known prototype shortcuts to fix in production
1. **Textarea reads via DOM id** (`cc-note-ta`) — swap to controlled React input
2. **localStorage for notes** — replace with API calls
3. **Sparkline is SVG with hardcoded viewBox** — works fine but you can swap to Recharts/Victory if you want tooltips
4. **SE emails are not in the data** — the mailto opens with a blank To: field. Add `email` to the `SEProfile` type and populate it.
5. **AI brief is static mock data** — wire to your LLM endpoint. The brief shape (`BriefPoint[]`) is already structured for an API response.
6. **Urgency scores are hardcoded** — should be computed server-side from sim delta, days since last 1:1, overdue count, and gate status.
