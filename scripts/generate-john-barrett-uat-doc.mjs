#!/usr/bin/env node
/**
 * Generates John Barrett Manager UAT Guide v2 (.docx)
 * Structure aligned with industry UAT plan best practices:
 * scope, entry/exit criteria, RACI, defect triage, business-process test cases.
 *
 * Usage: node scripts/generate-john-barrett-uat-doc.mjs
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  AlignmentType,
  ShadingType,
  PageBreak,
  BorderStyle,
  VerticalAlign,
} from "docx";

const PORTAL = "https://se-enablement-platform.vercel.app";
const VERSION = "2.0";
const DOC_DATE = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function run(text, opts = {}) {
  return new TextRun({ text, ...opts });
}

function para(children, opts = {}) {
  const items = typeof children === "string" ? [run(children, opts)] : children;
  return new Paragraph({
    spacing: opts.spacing ?? { after: 100 },
    heading: opts.heading,
    alignment: opts.alignment,
    children: items,
  });
}

function h1(t) {
  return para(t, { heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 } });
}

function h2(t) {
  return para(t, { heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 } });
}

function h3(t) {
  return para(t, { heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } });
}

function body(t) {
  return para(t, { spacing: { after: 120 } });
}

function bullet(t, level = 0) {
  return para(`• ${t}`, { spacing: { after: 60 }, indent: { left: 360 * (level + 1) } });
}

function numbered(n, t) {
  return para(`${n}. ${t}`, { spacing: { after: 60 }, indent: { left: 360 } });
}

function spacer(after = 200) {
  return para("", { spacing: { after } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Styled callout box — mimics Word information/dialog boxes */
function callout(type, title, lines) {
  const styles = {
    info: { fill: "E8F4FD", label: "INFO", labelColor: "0071CE" },
    why: { fill: "ECFDF5", label: "WHY THIS MATTERS", labelColor: "047857" },
    tip: { fill: "FFFBEB", label: "TIP", labelColor: "B45309" },
    note: { fill: "F1F5F9", label: "NOTE", labelColor: "475569" },
    feature: { fill: "EFF6FF", label: "RELATED FEATURE", labelColor: "1D4ED8" },
    caution: { fill: "FEF2F2", label: "CAUTION", labelColor: "B91C1C" },
  };
  const s = styles[type] ?? styles.info;

  const cellChildren = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        run(`${s.label}  `, { bold: true, color: s.labelColor, size: 18 }),
        run(title, { bold: true, size: 20 }),
      ],
    }),
    ...lines.map((line) =>
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 120 },
        children: [run(line, { size: 19 })],
      }),
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: s.fill, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: s.labelColor },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
              left: { style: BorderStyle.SINGLE, size: 12, color: s.labelColor },
              right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: cellChildren,
          }),
        ],
      }),
    ],
  });
}

function simpleTable(headers, rows, headerFill = "00143A") {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h) =>
          new TableCell({
            shading: { fill: headerFill, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [run(h, { bold: true, color: "FFFFFF", size: 18 })],
              }),
            ],
          }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                children: [new Paragraph({ children: [run(String(cell), { size: 18 })] })],
              }),
            ),
          }),
      ),
    ],
  });
}

/** Full UAT test case block */
function testCase(tc) {
  const blocks = [
    spacer(160),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "00143A", type: ShadingType.CLEAR },
              columnSpan: 2,
              children: [
                new Paragraph({
                  children: [
                    run(`${tc.id}  `, { bold: true, color: "FFFFFF", size: 22 }),
                    run(tc.title, { bold: true, color: "FFFFFF", size: 22 }),
                    run(`   [${tc.priority}]`, { color: "93C5FD", size: 18 }),
                  ],
                }),
              ],
            }),
          ],
        }),
        metaRow("Business requirement", tc.requirement),
        metaRow("Pre-conditions", tc.preconditions),
        metaRow("Test persona(s)", tc.personas),
        metaRow("Related portal path", tc.path),
      ],
    }),
    spacer(80),
    h3("Test steps"),
    ...tc.steps.map((step, i) => numbered(i + 1, step)),
    spacer(80),
    callout("why", "Acceptance criteria", tc.acceptance),
    spacer(80),
    simpleTable(
      ["Step #", "Expected result", "Actual result", "Pass / Fail"],
      tc.steps.map((_, i) => [`${i + 1}`, tc.expected[i] ?? "—", "", ""]),
    ),
    spacer(80),
    simpleTable(
      ["Tester", "Date", "Overall status", "Defect ID (if fail)", "Comments"],
      [["", "", "☐ Pass  ☐ Fail  ☐ Blocked", "", ""]],
    ),
  ];

  if (tc.callouts) {
    for (const c of tc.callouts) {
      blocks.push(spacer(100), callout(c.type, c.title, c.lines));
    }
  }

  return blocks;
}

function metaRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [run(label, { bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 78, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [run(value, { size: 18 })] })],
      }),
    ],
  });
}

// ─── Test case library ─────────────────────────────────────────────────────

const TEST_CASES = {
  foundation: [
    {
      id: "UAT-MGR-001",
      priority: "P0 — Critical",
      title: "Manager first login and MFA enrollment",
      requirement: "Managers must authenticate with MFA before accessing team data.",
      preconditions: "Auth account provisioned for john.barrett@sailpoint.com. Authenticator app available.",
      personas: "John Barrett (manager)",
      path: "/login → /auth/mfa/enroll → /manager?section=command",
      steps: [
        `Navigate to ${PORTAL}/login.`,
        "Enter email john.barrett@sailpoint.com and password DemoMgr2026!.",
        "Click Sign in.",
        "On MFA enrollment, scan QR code with authenticator app.",
        "Enter 6-digit verification code and confirm.",
        "Verify redirect to Manager Command Center.",
      ],
      acceptance: [
        "John reaches AAL2 (MFA verified) and lands on Command Center without errors.",
        "Sidebar shows Team and Practice navigation; Admin Console is NOT visible.",
      ],
      expected: [
        "Login page loads.",
        "Credentials accepted; no domain error.",
        "Session created.",
        "QR code displays; secret backup visible if offered.",
        "MFA factor verified.",
        "Command Center hero and metric cards visible.",
      ],
      callouts: [
        {
          type: "tip",
          title: "Subsequent logins",
          lines: [
            "After first enrollment, John will use /auth/mfa/verify (6-digit code only).",
            "Sessions expire after 15 minutes of inactivity — this is by design for security.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-002",
      priority: "P0 — Critical",
      title: "Manager cannot access Admin Console",
      requirement: "Role-based access must restrict managers from admin-only functions.",
      preconditions: "Logged in as John Barrett with MFA complete.",
      personas: "John Barrett",
      path: "/admin (direct URL)",
      steps: [
        "Confirm Admin Console is absent from left sidebar.",
        "Manually navigate to /admin in the browser address bar.",
        "Observe redirect or access-denied behavior.",
      ],
      acceptance: [
        "John cannot perform admin actions (user CRUD, audit log, global AI settings).",
      ],
      expected: [
        "No Admin nav item under any group.",
        "Browser navigates away from /admin or shows access restriction.",
        "John remains on an authorized manager route.",
      ],
      callouts: [
        {
          type: "feature",
          title: "What admins do that managers do not",
          lines: [
            "Create/delete users, bulk CSV import, competency library management.",
            "Simulation template CRUD, master corpus, platform analytics, audit log export.",
            "Managers still assign plans/sims and review work — only within their org tree.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-003",
      priority: "P1 — High",
      title: "Command Center provides actionable team snapshot",
      requirement: "Managers need a single view of review queue depth and team risk.",
      preconditions: "At least one SE has pending submission in John's org.",
      personas: "John Barrett; any SE with pending work (e.g., Avery Brooks)",
      path: "/manager?section=command",
      steps: [
        "Open Team → Command Center.",
        "Read hero banner review count.",
        "Click Review → on priority card if shown.",
        "Review four metric cards: Reviews pending, Team avg progress, At risk, Cert sign-offs.",
        "Scroll to Team readiness heatmap; click one SE row.",
        "Click Full view → on heatmap.",
      ],
      acceptance: [
        "Counts align with Action Inbox. Click-through opens correct destination.",
        "Heatmap row opens SE detail side panel.",
      ],
      expected: [
        "Command Center loads with team-specific data.",
        "Count matches items in Action Inbox (±0).",
        "Navigates to /manager?section=inbox.",
        "All four cards show numeric values or meaningful empty states.",
        "SE detail panel opens with coaching snapshot.",
        "Navigates to /manager?section=readiness.",
      ],
      callouts: [
        {
          type: "why",
          title: "Your weekly rhythm starts here",
          lines: [
            "Most managers spend 2–3 minutes on Command Center each morning.",
            "It answers: Who needs me today? Is anyone falling behind? Are certs stalling?",
            "Use it before 1:1s and before assigning new work.",
          ],
        },
      ],
    },
  ],
  newHire: [
    {
      id: "UAT-MGR-010",
      priority: "P0 — Critical",
      title: "Assign onboarding ramp plan to new hire",
      requirement: "Managers assign structured ramp templates so new SEs know exactly what to complete and when.",
      preconditions: "Plan templates exist. Morgan Lee or Quinn Martin on John's roster.",
      personas: "John Barrett (assign); Morgan Lee (verify as SE)",
      path: "/manager?section=roster → Onboarding plans panel",
      steps: [
        "Go to Team → Team Roster.",
        "Scroll to Onboarding plans card.",
        "Click a template (e.g., Week 1–2 — Boots on the ground).",
        "Review template preview and step list.",
        "Assign to: select Morgan Lee.",
        "Mentor: select John Barrett or No mentor.",
        "Set Start date and confirm Target completion.",
        'Click "Assign plan".',
        "Log in as Morgan Lee → My Ramp Plan (/my-plan).",
        "Verify assigned steps appear with due dates.",
      ],
      acceptance: [
        'Toast confirms assignment. SE receives notification. Steps visible on My Ramp Plan.',
        "If plan already assigned, system warns rather than silently duplicating.",
      ],
      expected: [
        "Roster page loads with assign panel.",
        "Template cards show name, duration, step count.",
        "Preview lists all plan steps.",
        "Morgan Lee available in dropdown.",
        "Mentor optional field works.",
        "Dates editable.",
        'Success toast: "{Plan name} assigned — SE notified."',
        "SE login succeeds.",
        "Plan steps listed with statuses and due dates.",
      ],
      callouts: [
        {
          type: "why",
          title: "Onboarding plans are the spine of new-hire ramp",
          lines: [
            "Without a plan, SEs lack structure — managers lack visibility into ramp %.",
            "Each step type (content review, challenge, simulation, mentor review) routes work to the right workflow.",
            "Validated steps feed Command Center progress and Readiness Map.",
          ],
        },
        {
          type: "feature",
          title: "Customize before you assign",
          lines: [
            "Team → Ramp Plans (/plans) opens the Plan template editor.",
            "Edit step titles, due offsets, and types — then assign from Team Roster.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-011",
      priority: "P0 — Critical",
      title: "Assign simulation to new hire",
      requirement: "Managers assign roleplay scenarios matched to SE level and vertical.",
      preconditions: "Simulation templates in library. Morgan Lee profile open.",
      personas: "John Barrett; Morgan Lee",
      path: "SE detail panel → Assign simulation",
      steps: [
        "From Team Roster, click Morgan Lee to open SE detail panel.",
        "Locate Assign simulation section.",
        'Click quick-pick "SLED vertical" (or search templates).',
        "In SimulationAssignForm: confirm Assign to = Morgan Lee.",
        "Set Difficulty if desired → click Assign to SE.",
        "As Morgan: Practice → Simulations (/simulations).",
        "Complete flow: 1. Roleplay → 2. Get feedback → 3. Submit for manager review.",
        "As John: Action Inbox → Sim cards filter → verify item appears.",
      ],
      acceptance: [
        "SE sees assignment notification. Submitted sim creates inbox item for manager.",
      ],
      expected: [
        "SE detail panel opens.",
        "Quick-pick pills visible: CISO discovery, SLED vertical, Executive demo, Bakeoff.",
        "Template selected; form populated.",
        "Assign to pre-filled correctly.",
        "Toast: Simulation assigned.",
        "Assignment visible on SE simulations page.",
        "Coaching card submitted.",
        "Sim card in inbox with score and transcript.",
      ],
      callouts: [
        {
          type: "tip",
          title: "Match simulation to ramp week",
          lines: [
            "Week 1–2 new hires: SLED vertical or CISO discovery (lower complexity).",
            "Senior SEs: Executive demo or Bakeoff scenario.",
            "Advisory (Caleb): Executive demo + competitive depth.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-012",
      priority: "P1 — High",
      title: "Review and approve new hire challenge submission",
      requirement: "Manager feedback closes the loop on hands-on challenge work.",
      preconditions: "Morgan or Quinn submitted a challenge with evidence and reflection.",
      personas: "Quinn Martin (submit); John Barrett (review)",
      path: "/challenges (SE) → /manager?section=inbox (manager)",
      steps: [
        "As Quinn: Challenges → open library challenge → upload evidence → add Reflection → Submit for manager review.",
        "As John: Action Inbox → filter Challenges.",
        "Expand challenge card → optional Draft feedback (co-pilot).",
        "Enter Grade (1–5) and coaching feedback.",
        'Click "Approve".',
        "As Quinn: verify challenge shows Approved status.",
      ],
      acceptance: [
        "Approved items leave inbox. SE notified. Linked plan steps may auto-validate.",
      ],
      expected: [
        "Submission succeeds; pending review state.",
        "Challenge card visible with Needs review badge.",
        "AI draft populates editable feedback field.",
        "Grade and feedback saved.",
        "Toast: Approved — removed from inbox.",
        "SE sees approved status.",
      ],
      callouts: [
        {
          type: "feature",
          title: "Send back for revision",
          lines: [
            'Use "Send back for revision" when evidence is incomplete — SE gets redo notification.',
            "This is preferable to approving weak work; it protects ramp quality.",
          ],
        },
        {
          type: "feature",
          title: "AI challenge generation (manager)",
          lines: [
            "Managers can browse /challenges → AI generate tab to create custom challenges.",
            "Useful when library gaps exist for a specific account or competency.",
          ],
        },
      ],
    },
  ],
  coaching: [
    {
      id: "UAT-MGR-020",
      priority: "P0 — Critical",
      title: "Action Inbox — full review cycle with co-pilot",
      requirement: "Single inbox consolidates all SE work requiring manager judgment.",
      preconditions: "Multiple item types pending (challenge, sim, plan step, or cert).",
      personas: "John Barrett; Avery Brooks (likely has pending items)",
      path: "/manager?section=inbox",
      steps: [
        "Open Action Inbox.",
        "Test each filter pill: All, Challenges, Sim cards, Plan steps, Cert sign-offs.",
        "Expand one item → click Draft feedback (co-pilot).",
        "Edit AI draft → add Grade → Approve.",
        "Expand another item → Send back for revision.",
        "Confirm inbox counts decrease.",
      ],
      acceptance: [
        "All filters work. Co-pilot drafts usable. Approve/remove and send-back flows notify SEs.",
      ],
      expected: [
        "Inbox loads with typed cards.",
        "Each filter shows correct subset.",
        "Coaching draft appears in textarea.",
        "Item removed; toast confirms.",
        "Item removed; SE notified to redo.",
        "Hero/command center counts update.",
      ],
      callouts: [
        {
          type: "why",
          title: "The Action Inbox is your quality gate",
          lines: [
            "Every ramp artifact that needs human judgment lands here — not scattered across email.",
            "Co-pilot accelerates feedback but you should always edit before sending.",
            "Aim to clear P0 items within 24 hours so SE momentum does not stall.",
          ],
        },
        {
          type: "note",
          title: "Filter grouping",
          lines: [
            "Challenges filter includes pitch submissions and mentor reviews.",
            "Sim cards filter includes shared deal prep briefs.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-021",
      priority: "P1 — High",
      title: "Pitch Studio — video pitch review",
      requirement: "Managers review recorded pitches with graded coaching feedback.",
      preconditions: "Quinn Martin submitted a practice pitch for manager review.",
      personas: "Quinn Martin (submit); John Barrett (review)",
      path: "/pitch → Action Inbox",
      steps: [
        "As Quinn: Pitch Studio → record pitch → set Practice (manager review) → Submit for review.",
        "As John: Action Inbox → Challenges filter → find pitch item.",
        'Click "Watch video pitch →" (opens playback).',
        "Enter feedback + Grade → Approve.",
      ],
      acceptance: ["Video plays. Feedback saved. Pitch marked reviewed."],
      expected: [
        "Pitch submitted successfully.",
        "Pitch card in inbox.",
        "Video playback loads in new tab or panel.",
        "Approval completes; item removed.",
      ],
      callouts: [
        {
          type: "feature",
          title: "Peer pitch library",
          lines: [
            "SEs can browse peer pitches with All / Mentor picks filters.",
            "Manager review is separate from peer learning — both support ramp quality.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-022",
      priority: "P1 — High",
      title: "Deal Prep — shared brief review",
      requirement: "Managers coach SEs on account-specific prep before customer calls.",
      preconditions: "Dana Evans or Ellis Foster on team.",
      personas: "Dana Evans (share); John Barrett (review)",
      path: "/prep → Action Inbox (Sim cards)",
      steps: [
        "As Dana: Deal Prep → generate brief → check Let my manager review this brief → share.",
        "As John: Action Inbox → Sim cards → open deal prep item.",
        "Use co-pilot if desired → enter manager comment → approve.",
      ],
      acceptance: ["Manager comment persisted on session. SE notified on share."],
      expected: [
        "Toast: Brief shared with manager.",
        "Deal prep card in inbox with account context.",
        "Comment saved; item cleared from inbox.",
      ],
      callouts: [
        {
          type: "note",
          title: "Deal Prep as manager",
          lines: [
            "/prep when logged in as John runs prep for John's own accounts — not a team dashboard.",
            "Team deal prep visibility is through inbox + shared session links.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-023",
      priority: "P1 — High",
      title: "Coaching Cadence and private notes",
      requirement: "Managers prepare structured 1:1s and retain confidential coaching notes.",
      preconditions: "Logged in as John. SEs with ramp/sim history.",
      personas: "John Barrett; Avery Brooks",
      path: "/manager?section=cadence",
      steps: [
        "Open Coaching Cadence.",
        "Review SE card: health badge, Last 1:1, Sim avg, Ramp %.",
        'Click "Copy 1:1 brief" → verify clipboard toast.',
        'Click "Schedule 1:1 →" → verify mailto opens.',
        "Click SE name → open detail panel.",
        "Add Private coaching notes → Save.",
        "Reload page → confirm notes persist.",
      ],
      acceptance: [
        "1:1 brief contains story line and talking points. Notes are private to manager.",
      ],
      expected: [
        "Cadence cards load per SE.",
        "Metrics match roster/heatmap within reason.",
        "Clipboard contains brief text.",
        "Email client opens to SE address.",
        "Detail panel opens.",
        "Save toast or indicator.",
        "Notes still present.",
      ],
      callouts: [
        {
          type: "why",
          title: "Cadence turns data into conversation",
          lines: [
            "Ramp % and sim avg alone do not make a 1:1 — AI talking points connect metrics to coaching actions.",
            "Private notes capture commitments between 1:1s without exposing them to the SE.",
          ],
        },
      ],
    },
  ],
  growth: [
    {
      id: "UAT-MGR-030",
      priority: "P1 — High",
      title: "Development plan and quarterly attestation",
      requirement: "Senior SE growth tracked via FY goals and quarterly manager attestations.",
      preconditions: "Avery Brooks or Blake Chen on team.",
      personas: "John Barrett; Avery Brooks",
      path: "/manager?section=dev → /development?profile={id}",
      steps: [
        "Team → Development → locate Avery's card.",
        'Click "View plan" or "Attest now →".',
        "If no plan: Create development plan with 2–3 goals linked to competencies.",
        'Click "Create plan & schedule reviews".',
        "Open a quarterly cell → read SE evidence.",
        "Enter Manager coaching comments; set status On track / At risk / Achieved.",
        'Click "Save checkpoint".',
      ],
      acceptance: [
        "Goals visible to SE. Manager attestation updates quarterly status badges on Development section.",
      ],
      expected: [
        "Development rollup shows Avery.",
        "Full plan page opens.",
        "Plan created with scheduled quarters.",
        "Plan saved successfully.",
        "Quarter detail loads.",
        "Checkpoint saved; badge updates.",
      ],
      callouts: [
        {
          type: "why",
          title: "Beyond onboarding — career growth",
          lines: [
            "Onboarding plans end; development plans carry SEs through the fiscal year.",
            "Quarterly attestations create a paper trail for promotion conversations.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-031",
      priority: "P1 — High",
      title: "Certification gate sign-off",
      requirement: "Managers validate SE readiness before cert gates clear.",
      preconditions: "Caleb Diaz or senior SE with submitted cert gate.",
      personas: "John Barrett; Caleb Diaz",
      path: "/certifications → Action Inbox",
      steps: [
        "Readiness → Certifications → Pending sign-offs.",
        "Click Caleb's row → View gates.",
        "Review submitted evidence → Approve or Send back.",
        "Alternate path: Action Inbox → Cert sign-offs → Sign off.",
      ],
      acceptance: ["Gate status updates. SE progression unblocked on approval."],
      expected: [
        "Pending list shows Caleb if gate submitted.",
        "Gates page loads with evidence.",
        "Approval updates gate status.",
        "Inbox path equivalent works.",
      ],
      callouts: [
        {
          type: "feature",
          title: "Cert readiness on Readiness Map",
          lines: [
            "Team → Readiness Map shows cert readiness column alongside onboarding and sim performance.",
            "Use it to spot who needs a nudge before quarter end.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-032",
      priority: "P2 — Medium",
      title: "Readiness Map — competency coaching focus",
      requirement: "Managers prioritize coaching based on team competency gaps.",
      preconditions: "Team has varied sim/challenge/cert activity.",
      personas: "John Barrett",
      path: "/manager?section=readiness",
      steps: [
        "Open Readiness Map.",
        "Review competency grids and per-SE bars.",
        "Read Recommended coaching focus this week.",
        "Click weakest competency SE bar → open detail panel.",
      ],
      acceptance: [
        "Recommendation names a specific competency and suggests focus SEs.",
      ],
      expected: [
        "Grids load with team averages.",
        "Per-SE bars render.",
        "Actionable focus text displayed.",
        "Detail panel opens.",
      ],
      callouts: [
        {
          type: "tip",
          title: "Pair with simulations",
          lines: [
            "After identifying a gap (e.g., competitive positioning), assign a targeted simulation or Market Pulse practice.",
          ],
        },
      ],
    },
  ],
  continuing: [
    {
      id: "UAT-MGR-040",
      priority: "P2 — Medium",
      title: "Continuing reps — stable roster and growth assignments",
      requirement: "Managers support tenured basic SEs without treating them like day-one hires.",
      preconditions: "Dana Evans and Ellis Foster on roster with basic level.",
      personas: "Dana Evans; Ellis Foster; John Barrett",
      path: "/manager?section=roster",
      steps: [
        "Team Roster → filter On track → confirm Dana and Ellis appear.",
        "Open Dana → verify ramp progress and open items.",
        "Assign advanced challenge or simulation (not Week 1–2 plan).",
        "As Dana: complete Market Pulse quiz (/market-pulse).",
        "As John: review any new inbox items.",
      ],
      acceptance: [
        "Continuing SEs show stable health. Manager can assign growth work without re-onboarding.",
      ],
      expected: [
        "Both SEs visible with On track or equivalent badge.",
        "Detail panel shows appropriate progress.",
        "Assignment succeeds.",
        "Quiz completes; competency updates.",
        "Reviews process normally.",
      ],
      callouts: [
        {
          type: "why",
          title: "Not every SE is a new hire",
          lines: [
            "Dana and Ellis represent reps mid-career — test that the platform supports ongoing coaching, not only ramp.",
            "Deal prep, pitch, and Market Pulse are natural growth levers here.",
          ],
        },
      ],
    },
  ],
  e2e: [
    {
      id: "UAT-MGR-050",
      priority: "P0 — Critical",
      title: "End-to-end: New hire first two weeks (Morgan Lee)",
      requirement: "Complete manager loop from assign → SE execute → manager approve.",
      preconditions: "Morgan Lee on roster. John logged in.",
      personas: "Morgan Lee; John Barrett",
      path: "Roster → Sim assign → Inbox → SE detail",
      steps: [
        "Assign onboarding plan + SLED simulation to Morgan.",
        "As Morgan: complete one plan step and submit one challenge.",
        "As John: clear both items from Action Inbox.",
        "Open Morgan SE detail → verify accomplishments and coaching snapshot updated.",
        "Coaching Cadence → Copy 1:1 brief for Morgan.",
      ],
      acceptance: [
        "Full loop completes without admin intervention. Morgan's ramp % increases.",
      ],
      expected: [
        "Both assignments succeed.",
        "SE submissions appear in inbox.",
        "Both approved.",
        "Snapshot reflects progress.",
        "Brief mentions recent activity.",
      ],
      callouts: [
        {
          type: "info",
          title: "Suggested UAT session",
          lines: [
            "Block 45 minutes. Use two browsers: one as John, one incognito as Morgan.",
            "This scenario alone validates 60% of manager-critical paths.",
          ],
        },
      ],
    },
    {
      id: "UAT-MGR-051",
      priority: "P0 — Critical",
      title: "End-to-end: Senior SE coaching loop (Avery Brooks)",
      requirement: "Senior growth path: sim review + dev attestation + cert.",
      preconditions: "Avery has pending sim or cert; dev plan exists or creatable.",
      personas: "Avery Brooks; John Barrett",
      path: "Command Center → Inbox → Development → Certifications",
      steps: [
        "Command Center → click Avery in heatmap.",
        "Review sim card with co-pilot → approve with grade.",
        "Development → quarterly attestation for Avery.",
        "Certifications → approve pending gate if present.",
        "Readiness Map → confirm Avery's bars updated.",
      ],
      acceptance: ["Senior workflow complete. No blocked gates or stale inbox items."],
      expected: [
        "Detail panel opens.",
        "Sim approved.",
        "Checkpoint saved.",
        "Cert signed off or N/A documented.",
        "Readiness reflects activity.",
      ],
    },
    {
      id: "UAT-MGR-052",
      priority: "P1 — High",
      title: "End-to-end: Advisory track (Caleb Diaz)",
      requirement: "Advisory SC receives advanced assignments and cert validation.",
      preconditions: "Caleb on roster as advisory_solutions_consultant.",
      personas: "Caleb Diaz; John Barrett",
      path: "SE detail → Sim assign → Certifications",
      steps: [
        "Assign Executive demo simulation to Caleb.",
        "As Caleb: complete and submit sim.",
        "As John: review in inbox.",
        "Certifications → Caleb gates → sign off.",
        "Verify assign dropdown only shows John's 7 reports (not entire company).",
      ],
      acceptance: ["Advisory path works. Org scoping enforced on assignments."],
      expected: [
        "Assignment succeeds.",
        "Submission in inbox.",
        "Review complete.",
        "Gate approved or N/A noted.",
        "Only 7 SEs in dropdown.",
      ],
    },
  ],
};

// ─── Document body assembly ────────────────────────────────────────────────

const children = [
  // Cover
  para([run("SailPoint", { bold: true, size: 36, color: "00143A" })], { spacing: { after: 80 } }),
  para([run("SE Enablement Platform", { size: 28, color: "0071CE" })], { spacing: { after: 200 } }),
  para([run("Manager User Acceptance Testing (UAT) Plan", { bold: true, size: 32 })], {
    spacing: { after: 120 },
  }),
  para([run("Prepared for: John Barrett — Manager", { size: 24 })], { spacing: { after: 60 } }),
  para([run(`Version ${VERSION}  |  ${DOC_DATE}`, { italics: true, color: "64748B" })], {
    spacing: { after: 60 },
  }),
  para([run(`Portal: ${PORTAL}`, { size: 20 })], { spacing: { after: 400 } }),

  simpleTable(
    ["Field", "Value"],
    [
      ["Document ID", "UAT-SEEP-MGR-2026-001"],
      ["Version", VERSION],
      ["Status", "Ready for execution"],
      ["Primary tester", "John Barrett"],
      ["Test environment", "Production (Vercel)"],
      ["Author", "SE Enablement Platform Team"],
      ["Approver", "___________________________"],
    ],
  ),
  pageBreak(),

  // How to read
  h1("How to read this document"),
  body(
    "This is a formal UAT plan — not a casual checklist. It follows industry practice: business-process grouping, traceable test case IDs, entry/exit criteria, and defect triage. Each test case includes pre-conditions, numbered steps, acceptance criteria, and a results table you fill in during testing.",
  ),
  callout("info", "Document conventions", [
    "P0 = Must pass before go-live. P1 = Should pass; workaround acceptable short-term. P2 = Nice to validate.",
    "Callout boxes (INFO, WHY THIS MATTERS, TIP, etc.) explain context — read them before executing steps.",
    "Use two browsers for SE + manager tests: regular window as John, incognito as the SE persona.",
    "Record defects with ID format DEF-MGR-### in the Comments column.",
  ]),
  spacer(),

  h1("Table of contents"),
  ...[
    "1. Executive summary",
    "2. Scope and objectives",
    "3. Entry criteria (readiness checklist)",
    "4. Roles, environment, and test data",
    "5. Defect management",
    "6. Exit criteria and sign-off",
    "7. Glossary",
    "PART A — Foundation (login, access, Command Center)",
    "PART B — New hire enablement (Morgan Lee, Quinn Martin)",
    "PART C — Coaching and review workflows",
    "PART D — Growth and readiness (senior / advisory)",
    "PART E — Continuing representatives",
    "PART F — End-to-end business scenarios",
    "Appendix A — Credential matrix",
    "Appendix B — UAT execution log",
  ].map((item) => bullet(item)),
  pageBreak(),

  // 1 Executive summary
  h1("1. Executive summary"),
  body(
    "John Barrett will validate that the SE Enablement Platform supports his real job: onboarding two new SEs (Morgan Lee, Quinn Martin), coaching three promoted SEs (Avery Brooks, Blake Chen, Caleb Diaz), and continuing development for Dana Evans and Ellis Foster — all without admin access or external tools.",
  ),
  callout("why", "Why we run UAT before broader rollout", [
    "UAT proves the system works for the business user — not just that developers shipped features.",
    "John's sign-off means managers can trust inbox reviews, plan assignments, and readiness data.",
    "Failures found here are cheaper to fix than after full org adoption.",
  ]),
  simpleTable(
    ["Objective", "Success indicator"],
    [
      ["New hires receive plans, sims, and timely feedback", "UAT-MGR-010, 011, 012, 050 pass"],
      ["Senior/advisory SEs progress on growth plans and certs", "UAT-MGR-030, 031, 051, 052 pass"],
      ["Manager inbox is single source of truth for reviews", "UAT-MGR-020 pass"],
      ["Role security — no admin leakage", "UAT-MGR-002 pass"],
    ],
  ),
  spacer(),

  // 2 Scope
  h1("2. Scope and objectives"),
  h2("2.1 In scope"),
  bullet("Manager authentication (login + MFA)"),
  bullet("Team navigation: Command Center, Action Inbox, Roster, Readiness, Cadence, Development, Ramp Plans"),
  bullet("Assign onboarding plans and simulations to direct reports"),
  bullet("Review challenges, simulations, pitches, deal prep, plan steps, certifications"),
  bullet("Development plans and quarterly attestations"),
  bullet("Coaching cadence, co-pilot drafts, private notes"),
  bullet("Practice tools smoke test (Flight Check, Market Pulse)"),
  h2("2.2 Out of scope"),
  bullet("Admin Console functions (user CRUD, audit log, global AI config)"),
  bullet("SSO/SailPoint IdP integration (unless NEXT_PUBLIC_SSO_DOMAIN enabled)"),
  bullet("Gong OAuth integration end-to-end"),
  bullet("Performance/load testing"),
  bullet("Mobile native apps"),
  pageBreak(),

  // 3 Entry criteria
  h1("3. Entry criteria"),
  body("UAT may begin only when ALL items below are satisfied. Check each box before starting Part A."),
  simpleTable(
    ["#", "Criterion", "Owner", "Status"],
    [
      ["1", "Production portal reachable at se-enablement-platform.vercel.app", "Platform team", "☐"],
      ["2", "John Barrett auth account provisioned (npm run seed:john-manager)", "Platform team", "☐"],
      ["3", "7 demo SE accounts on John's roster with seeded plans", "Platform team", "☐"],
      ["4", "Supabase redirect URLs include production auth callbacks", "Platform team", "☐"],
      ["5", "John has authenticator app ready for MFA enrollment", "John Barrett", "☐"],
      ["6", "This UAT plan reviewed and accepted", "John Barrett", "☐"],
      ["7", "Second browser/incognito available for SE persona testing", "John Barrett", "☐"],
    ],
  ),
  spacer(),

  // 4 Roles & data
  h1("4. Roles, environment, and test data"),
  h2("4.1 RACI"),
  simpleTable(
    ["Activity", "John (Manager)", "SE testers", "Platform team"],
    [
      ["Execute test cases", "R/A", "C", "I"],
      ["Log defects", "R", "I", "A"],
      ["Fix defects", "I", "I", "R/A"],
      ["UAT sign-off", "A", "I", "C"],
      ["Provision test data", "I", "I", "R/A"],
    ],
  ),
  spacer(),
  h2("4.2 Environment"),
  simpleTable(
    ["Item", "Detail"],
    [
      ["URL", PORTAL],
      ["Manager login", "john.barrett@sailpoint.com / DemoMgr2026!"],
      ["SE password (all @example.com)", "DemoSE2026!"],
      ["Browser", "Chrome or Edge (latest); MFA requires authenticator app"],
    ],
  ),
  spacer(),
  h2("4.3 Test personas"),
  simpleTable(
    ["Persona", "Email", "Level", "UAT focus"],
    [
      ["Morgan Lee", "morgan.lee@example.com", "Basic (new)", "Onboarding, first sim, first challenge"],
      ["Quinn Martin", "quinn.martin@example.com", "Basic (new)", "Pitch submit, plan progress"],
      ["Avery Brooks", "avery.brooks@example.com", "Senior SE", "Full panel, dev attestation, sim review"],
      ["Blake Chen", "blake.chen@example.com", "Senior SE", "Readiness, senior challenges"],
      ["Caleb Diaz", "caleb.diaz@example.com", "Advisory SC", "Cert gates, executive sims"],
      ["Dana Evans", "dana.evans@example.com", "Basic (continuing)", "Deal prep share"],
      ["Ellis Foster", "ellis.foster@example.com", "Basic (continuing)", "Market Pulse, stable state"],
    ],
  ),
  pageBreak(),

  // 5 Defects
  h1("5. Defect management"),
  body("When actual results do not match expected results, log a defect before continuing. Use the test case ID as reference."),
  simpleTable(
    ["Severity", "Definition", "Example", "Target fix"],
    [
      ["P0 — Critical", "Blocks core manager workflow", "Cannot approve inbox items", "24 hours"],
      ["P1 — High", "Major function impaired; workaround exists", "Co-pilot fails; manual feedback works", "3 business days"],
      ["P2 — Medium", "Minor UX or cosmetic issue", "Label typo, slow load", "Next release"],
      ["P3 — Low", "Enhancement / nice-to-have", "Extra sort option on roster", "Backlog"],
    ],
  ),
  spacer(),
  callout("tip", "How to report a defect", [
    "1. Note Test Case ID (e.g., UAT-MGR-020).",
    "2. Capture screenshot or screen recording.",
    "3. Record exact steps to reproduce in Comments column.",
    "4. Assign Defect ID: DEF-MGR-001, DEF-MGR-002, …",
    "5. Email platform team with ID, severity, and screenshot.",
  ]),
  spacer(),

  // 6 Exit criteria
  h1("6. Exit criteria and sign-off"),
  body("UAT is complete when ALL exit criteria are met and John Barrett signs below."),
  simpleTable(
    ["#", "Exit criterion", "Target", "Status"],
    [
      ["1", "All P0 test cases executed", "100%", "☐"],
      ["2", "P0 pass rate", "100% (no open P0 defects)", "☐"],
      ["3", "P1 test cases executed", "≥ 90%", "☐"],
      ["4", "P1 pass rate", "≥ 95% or accepted exceptions documented", "☐"],
      ["5", "End-to-end scenarios (050–052) passed", "All 3", "☐"],
      ["6", "Known issues documented with workarounds", "Complete", "☐"],
      ["7", "Business owner sign-off obtained", "Signed below", "☐"],
    ],
  ),
  spacer(),
  simpleTable(
    ["Role", "Name", "Signature", "Date"],
    [
      ["Manager / UAT lead", "John Barrett", "", ""],
      ["Platform owner", "", "", ""],
      ["Enablement sponsor", "", "", ""],
    ],
  ),
  pageBreak(),

  // 7 Glossary
  h1("7. Glossary"),
  simpleTable(
    ["Term", "Definition"],
    [
      ["Action Inbox", "Queue of SE submissions requiring manager approve or send-back"],
      ["Co-pilot", "AI-assisted draft feedback — manager edits before sending"],
      ["Ramp plan", "Onboarding template with sequenced steps and due dates"],
      ["Coaching card", "AI-generated feedback from a simulation session"],
      ["Cert gate", "Milestone requiring manager sign-off before SE progresses"],
      ["Readiness Map", "Competency heatmap across the team"],
      ["AAL2", "Authenticator Assurance Level 2 — MFA verified session"],
    ],
  ),
  pageBreak(),

  // PART A
  h1("PART A — Foundation"),
  body("Validate access, security boundaries, and the Command Center starting point."),
  callout("why", "Foundation tests gate everything else", [
    "If login, MFA, or role boundaries fail, downstream tests are invalid.",
    "Complete Part A before Parts B–F.",
  ]),
  ...TEST_CASES.foundation.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // PART B
  h1("PART B — New hire enablement"),
  body(
    "Business process: Manager onboards Morgan Lee and Quinn Martin with structured ramp plans, simulations, and challenge review. This mirrors the first 30–60 days of a real new hire.",
  ),
  callout("info", "Recommended test order", [
    "Execute UAT-MGR-010 → 011 → 012 in sequence, then UAT-MGR-050 as capstone.",
  ]),
  ...TEST_CASES.newHire.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // PART C
  h1("PART C — Coaching and review workflows"),
  body(
    "Business process: Manager clears the Action Inbox daily, reviews pitches and deal prep, and prepares 1:1s via Coaching Cadence.",
  ),
  ...TEST_CASES.coaching.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // PART D
  h1("PART D — Growth and readiness (senior / advisory)"),
  body(
    "Business process: Manager supports Avery, Blake, and Caleb on career growth — development attestations, certification gates, and readiness-driven coaching.",
  ),
  ...TEST_CASES.growth.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // PART E
  h1("PART E — Continuing representatives"),
  body(
    "Business process: Manager continues coaching Dana and Ellis — not re-onboarding, but ongoing deal prep, practice, and growth assignments.",
  ),
  ...TEST_CASES.continuing.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // PART F
  h1("PART F — End-to-end business scenarios"),
  body(
    "Capstone scenarios that chain multiple features into realistic manager workflows. Run these last.",
  ),
  callout("caution", "Time allocation", [
    "Allow 45 min for UAT-MGR-050, 30 min for 051, 30 min for 052.",
    "Do not skip these — they catch integration gaps single-feature tests miss.",
  ]),
  ...TEST_CASES.e2e.flatMap((tc) => testCase(tc)),
  pageBreak(),

  // Appendix A
  h1("Appendix A — Credential matrix"),
  simpleTable(
    ["Name", "Email", "Password", "Role", "Level"],
    [
      ["John Barrett", "john.barrett@sailpoint.com", "DemoMgr2026!", "Manager", "Senior"],
      ["Morgan Lee", "morgan.lee@example.com", "DemoSE2026!", "Basic SE", "Basic"],
      ["Quinn Martin", "quinn.martin@example.com", "DemoSE2026!", "Basic SE", "Basic"],
      ["Avery Brooks", "avery.brooks@example.com", "DemoSE2026!", "Senior SE", "Senior"],
      ["Blake Chen", "blake.chen@example.com", "DemoSE2026!", "Senior SE", "Senior"],
      ["Caleb Diaz", "caleb.diaz@example.com", "DemoSE2026!", "Advisory SC", "Advisory"],
      ["Dana Evans", "dana.evans@example.com", "DemoSE2026!", "Basic SE", "Basic"],
      ["Ellis Foster", "ellis.foster@example.com", "DemoSE2026!", "Basic SE", "Basic"],
    ],
  ),
  spacer(),

  // Appendix B
  h1("Appendix B — UAT execution log"),
  body("Summary table — update as you complete each part."),
  simpleTable(
    ["Part", "Test cases", "Total", "Pass", "Fail", "Blocked", "Tester", "Date"],
    [
      ["A — Foundation", "001–003", "3", "", "", "", "", ""],
      ["B — New hire", "010–012", "3", "", "", "", "", ""],
      ["C — Coaching", "020–023", "4", "", "", "", "", ""],
      ["D — Growth", "030–032", "3", "", "", "", "", ""],
      ["E — Continuing", "040", "1", "", "", "", "", ""],
      ["F — End-to-end", "050–052", "3", "", "", "", "", ""],
      ["TOTAL", "", "17", "", "", "", "", ""],
    ],
  ),
  spacer(400),
  body("— End of document —"),
];

const doc = new Document({
  title: "John Barrett Manager UAT Plan v2",
  creator: "SE Enablement Platform",
  description: "Formal manager UAT plan with test cases, callouts, entry/exit criteria",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [{ properties: {}, children }],
});

const projectPath = resolve(process.cwd(), "docs/John-Barrett-Manager-UAT-Guide.docx");
const documentsPath = resolve(process.env.HOME ?? "", "Documents/John-Barrett-Manager-UAT-Guide.docx");

const buffer = await Packer.toBuffer(doc);
writeFileSync(projectPath, buffer);
writeFileSync(documentsPath, buffer);
console.log(`Wrote v${VERSION} → ${projectPath}`);
console.log(`Wrote v${VERSION} → ${documentsPath}`);
