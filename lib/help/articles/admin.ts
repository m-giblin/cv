import type { HelpArticle } from "@/lib/help/types";

/** Help Center articles for tenant (enablement) admins using the Admin portal. */
export const ADMIN_ARTICLES: HelpArticle[] = [
  {
    id: "admin-overview-setup-checklist",
    title: "Set up your tenant with the Overview checklist",
    summary: "The Overview page shows what is left to set up for your tenant and links straight to each task.",
    audience: ["admin"],
    category: "Getting started",
    keywords: ["setup", "onboarding", "checklist", "getting started", "almost set up", "all set up", "home", "dashboard"],
    overview: [
      "Overview is the first page of the Admin portal. Its header reads \"Almost set up.\" until every checklist row is done, then \"All set up.\"",
      "The checklist has five rows: Single sign-on, Import your SEs, Define competencies, a ramp plan row (\"Every SE has a ramp plan\" or how many SEs have none), and Connect Gong. Each row shows its status and a button to the page where you finish it.",
      "Below the checklist, tiles show Active SEs, Plan progress and Open reviews. Click a tile to open the matching page.",
    ],
    steps: [
      {
        title: "Open Overview",
        body: "In the Admin portal, choose Overview in the left navigation. Rows that are complete are marked Done; the rest show what is missing.",
      },
      {
        title: "Import your people",
        body: "On the \"Import your SEs\" row, click Import people. Add people one at a time or by CSV on the People page.",
      },
      {
        title: "Define competencies",
        body: "Click Define competencies to open Programs > Competencies and add the skills readiness is measured against.",
      },
      {
        title: "Give every SE a ramp plan",
        body: "If the row says some SEs have no ramp plan, it lists their names. Click Assign plans to enroll them in a program.",
      },
      {
        title: "Check sign-in and integrations",
        body: "The Single sign-on row links to Settings > Security, and Connect Gong links to Settings > Integrations.",
        tip: "SSO is configured by your platform operator, not from the Admin portal.",
      },
    ],
    links: [
      { label: "Open Overview", href: "/admin" },
      { label: "Open People", href: "/admin/people" },
    ],
    related: ["admin-invite-users", "admin-competencies", "admin-enroll-people", "admin-integrations"],
  },
  {
    id: "admin-invite-users",
    title: "Invite a user",
    summary: "Create an account for one person, choose their role, level and manager, and send them a way to sign in.",
    audience: ["admin"],
    category: "People",
    keywords: ["add user", "new user", "invite", "create account", "temporary password", "password reset", "onboard"],
    overview: [
      "New users get either a temporary password you share with them, or an emailed password setup link.",
      "A user who signs in with a temporary password must change it on first sign-in and enroll in MFA.",
    ],
    steps: [
      {
        title: "Open People",
        body: "Choose People in the left navigation, then click Invite user. The New user panel opens.",
      },
      {
        title: "Enter name and email",
        body: "Fill in Full name and Email. Both are required.",
      },
      {
        title: "Choose role, level and manager",
        body: "Pick a Role, an SE level (Basic, Senior or Advisory) and a Manager, or leave Manager as No manager.",
      },
      {
        title: "Decide how they get a password",
        body: "Leave Password (optional) blank to auto-generate one, or type one of at least 8 characters. To email a setup link instead, tick \"Email a password setup link instead of showing a temporary password\".",
      },
      {
        title: "Create the user",
        body: "Click Create user. If you did not choose the email link, a Temporary password notice appears at the top of the page; copy it and share it securely.",
        tip: "The temporary password is shown only on this screen.",
      },
    ],
    links: [{ label: "Open People", href: "/admin/people" }],
    related: ["admin-roles-and-levels", "admin-bulk-import-users", "admin-edit-remove-users"],
  },
  {
    id: "admin-roles-and-levels",
    title: "Roles, SE levels and managers",
    summary: "What each role and level means on the People page, and how manager assignment works.",
    audience: ["admin"],
    category: "People",
    keywords: ["role", "permissions", "level", "basic se", "senior se", "advisory", "mentor", "director", "manager", "admin"],
    overview: [
      "The Role list offers: Basic se, Senior se, Advisory solutions consultant, Mentor, Manager, Director and Admin. The three SE roles are counted as Active SEs and are the people you enroll in programs.",
      "SE level is Basic, Senior or Advisory. The People table filters show these as Basic SE, Senior SE and Advisory SC.",
      "The Manager list contains everyone whose role is Manager, Mentor, Director or Admin. A person's manager is who they report to in the platform.",
    ],
    steps: [
      {
        title: "Filter by role",
        body: "On People, use the chips at the top (All, SE, Manager, Admin, Mentor, Director) to narrow the table. Each chip shows a count.",
      },
      {
        title: "Filter by level or manager",
        body: "Use the All levels and All managers lists next to the search box, or type in \"Search by name or email\".",
      },
      {
        title: "Change a role, level or manager",
        body: "Click Edit on the person's row, change Role, SE level or Manager, then click Save changes.",
      },
    ],
    links: [{ label: "Open People", href: "/admin/people" }],
    related: ["admin-invite-users", "admin-edit-remove-users"],
  },
  {
    id: "admin-bulk-import-users",
    title: "Bulk import users from a CSV",
    summary: "Add many people at once by uploading a CSV file on the People page.",
    audience: ["admin"],
    category: "People",
    keywords: ["csv", "bulk", "import", "upload", "spreadsheet", "template", "managerEmail"],
    overview: [
      "The CSV needs the columns fullName, email, role, level, managerEmail. Use role values such as basic_se and level values such as Basic, as in the template.",
      "After the import, each row is listed with its result (Created or Failed).",
    ],
    steps: [
      {
        title: "Find the import card",
        body: "Open People and scroll below the users table to the \"Bulk import users\" card.",
      },
      {
        title: "Download the template",
        body: "Click Download template to get a CSV with the correct header row and one example row.",
      },
      {
        title: "Fill in your people",
        body: "Add one row per person. Put the manager's email in managerEmail so the platform links them to their manager.",
      },
      {
        title: "Upload the file",
        body: "Click Choose CSV file and pick your file. The button reads Importing… while it runs, then a message shows how many users were imported.",
      },
      {
        title: "Fix failed rows",
        body: "Check the results list for rows marked Failed, correct them in your file, and import those rows again.",
      },
    ],
    links: [{ label: "Open People", href: "/admin/people" }],
    related: ["admin-invite-users", "admin-roles-and-levels"],
  },
  {
    id: "admin-edit-remove-users",
    title: "Edit or remove a user",
    summary: "Update someone's details or delete their account from the People page.",
    audience: ["admin"],
    category: "People",
    keywords: ["edit user", "delete user", "remove user", "offboard", "deactivate", "change manager"],
    overview: [
      "Remove deletes the person's login permanently. There is no undo.",
    ],
    steps: [
      {
        title: "Find the person",
        body: "Open People and search by name or email, or use the role, level and manager filters.",
      },
      {
        title: "Edit details",
        body: "Click Edit on their row. The Edit user panel opens with Full name, Email, Role, SE level and Manager. Make changes and click Save changes.",
      },
      {
        title: "Remove the user",
        body: "Click Remove on their row and confirm the prompt \"This removes their login permanently.\" A \"User deleted.\" message confirms it.",
        tip: "Before removing an SE, check whether reviews or program enrollments still depend on them.",
      },
    ],
    links: [{ label: "Open People", href: "/admin/people" }],
    related: ["admin-invite-users", "admin-roles-and-levels"],
  },
  {
    id: "admin-programs-overview",
    title: "Create a program and use the program workbench",
    summary: "Programs are ramp plans that SEs are enrolled in. Create one with New program and manage it from its workbench.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["program", "ramp plan", "onboarding plan", "template", "new program", "workbench", "progress", "schedule"],
    overview: [
      "Every program runs 13 weeks in four phases: Foundations, Field skills, Advisory readiness and Certification.",
      "The Programs page lists each program with its steps by phase, people enrolled and status, plus SEs at risk and average completion.",
      "Opening a program shows four tabs: Progress (each enrolled person's progress by phase), Outline (the steps), People (enroll, see who is enrolled, and remove someone) and Schedule (steps due each week).",
    ],
    steps: [
      {
        title: "Open Programs",
        body: "Choose Programs > Programs in the left navigation.",
      },
      {
        title: "Start a new program",
        body: "Click New program. The builder opens on the Outline tab so you can name the program and add steps.",
      },
      {
        title: "Open an existing program",
        body: "Click a row in the programs table to open its workbench.",
      },
      {
        title: "Track progress",
        body: "On Progress, each row is a person with their status per phase. Open a row to see that person's journey.",
      },
      {
        title: "Check the schedule",
        body: "On Schedule, see the steps due each week. The schedule fills in once people are enrolled.",
      },
    ],
    links: [{ label: "Open Programs", href: "/admin/programs" }],
    related: ["admin-program-builder", "admin-publish-program", "admin-enroll-people"],
  },
  {
    id: "admin-program-builder",
    title: "Edit a program outline in the builder",
    summary: "Add and configure steps: type, done-when criteria, evidence, reviewer, due week, segment and gates.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["builder", "outline", "step", "step type", "criteria", "done when", "evidence", "reviewer", "gate", "segment", "phase", "due week", "weeks view"],
    overview: [
      "Step types are Content, Challenge, Simulation, Shadow, Review, Deal prep, Playbook, Knowledge check and Task. A playbook step opens that chapter. Add a knowledge check step after it for a quiz on the same material.",
      "Evidence options: Recording, Document, Link, Screenshot, Score (automatic) and Reviewer observation. Reviewer options: SE's manager, Assigned mentor, Enablement admin and Automatic (score).",
      "Due is a week and day within the 13 weeks, for example \"Week 3, day 2\". Segment places a step in Foundations, Field skills, Advisory readiness or Certification. Ticking \"This step is a gate\" means clearing it unlocks the next segment.",
      "The builder has two views: Outline (step list and editor) and Weeks (a 13-week grid where you can drag content from the library onto a week).",
    ],
    steps: [
      {
        title: "Open the outline",
        body: "Open the program, choose the Outline tab and click Edit outline.",
      },
      {
        title: "Add a step",
        body: "Click + Add step under a segment. The new step opens in the Step editor.",
      },
      {
        title: "Describe the step",
        body: "Choose a Step type. For a playbook, simulation, knowledge check, challenge, or content step, pick the item from the list and the title fills in from it. Shadow, review, deal prep, and task steps are written in the form.",
      },
      {
        title: "Set done-when criteria",
        body: "Under Done when, write an observable result, for example a walkthrough recorded under 6 minutes. Click + Add criterion for more.",
      },
      {
        title: "Set evidence, reviewer and due date",
        body: "Pick Evidence, Reviewer and Due. Optionally link a Competency.",
      },
      {
        title: "Place it in a segment and mark gates",
        body: "Choose a Segment and tick \"This step is a gate\" on the step that should close that segment. Drag steps in the outline to reorder them.",
      },
      {
        title: "Preview",
        body: "Use Preview as SE, or the Live preview panel, to see the step as the SE will.",
      },
    ],
    links: [{ label: "Open Programs", href: "/admin/programs" }],
    related: ["admin-publish-program", "admin-programs-overview", "admin-competencies"],
  },
  {
    id: "admin-publish-program",
    title: "Publish or delete a program",
    summary: "The rules a program must meet before Publish is enabled, and how to delete one.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["publish", "ready to publish", "unpublished changes", "delete plan", "discard", "validation"],
    overview: [
      "Publish stays disabled until the program name is at least 3 characters, there is at least one step, and every step has a type, title, done-when criteria, evidence and a reviewer.",
      "The \"Ready to publish?\" panel lists each check and the steps that fail it. \"Every segment ends in a gate\" is advice only and does not block publishing.",
      "Unsaved edits show as Unpublished changes. Leaving the program asks \"Discard unpublished changes to this plan?\"",
    ],
    steps: [
      {
        title: "Review the checklist",
        body: "In the builder, read the \"Ready to publish?\" panel and fix every step it names.",
      },
      {
        title: "Publish",
        body: "Click Publish. A \"Program published.\" message confirms it and the status changes to Published.",
      },
      {
        title: "Delete a program",
        body: "Click Delete plan in the builder and confirm. This cannot be undone.",
      },
    ],
    links: [{ label: "Open Programs", href: "/admin/programs" }],
    related: ["admin-program-builder", "admin-enroll-people"],
  },
  {
    id: "admin-enroll-people",
    title: "Enroll people in a program",
    summary: "Assign SEs to a program with a start date and an optional mentor.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["enroll", "assign plan", "assign program", "mentor", "start date", "ramp plan"],
    overview: [
      "Only SEs who are not already on the program appear in the enroll list. The target completion date is calculated from the start date and the program length.",
    ],
    steps: [
      {
        title: "Open the program's People tab",
        body: "Open the program from Programs and choose People. If nobody is enrolled yet, Progress also offers an Enroll people button that takes you here.",
      },
      {
        title: "Pick people",
        body: "Under Enroll people, tick each SE you want to add. Your own name is at the top, marked You, so you can enroll yourself.",
      },
      {
        title: "Set start date and mentor",
        body: "Choose a Start date and, if needed, a Mentor (optional).",
      },
      {
        title: "Enroll",
        body: "Click Enroll. A message confirms how many people were enrolled, and they appear in the Enrolled list. Any failures are listed by name.",
      },
      {
        title: "Remove someone",
        body: "In the Enrolled list, click Remove on their row and confirm. People with no progress come off the program. If removal is blocked, the message says why.",
      },
    ],
    links: [
      { label: "Open Programs", href: "/admin/programs" },
      { label: "Assign plans", href: "/admin/programs/assign" },
    ],
    related: ["admin-programs-overview", "admin-overview-setup-checklist"],
  },
  {
    id: "admin-release-courses",
    title: "Create and assign release courses",
    summary: "Package a plan template as a just-in-time release course and assign it to selected SEs.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["release", "release course", "release training", "launch", "just in time", "new feature training"],
    overview: [
      "Release courses are at the bottom of the Programs page under Release courses. Release launch analytics shows Enrolled, Started and Completed counts per course.",
      "Assignment uses the course's linked plan template, so link one when you create the course.",
    ],
    steps: [
      {
        title: "Fill in the course",
        body: "On Programs, scroll to Release training. Enter Course name, Project tag, Description and choose a Plan template.",
      },
      {
        title: "Add optional details",
        body: "Set Lab mode (for example battlecard or pre_call_brief), Pitch topic (optional) and Slack announce channel (optional).",
      },
      {
        title: "Create it",
        body: "Click Create release course. It appears in the Release courses list.",
      },
      {
        title: "Assign SEs",
        body: "Click Assign on the course, tick SEs, and click Assign selected. People with an active assignment of the plan show as Already enrolled.",
      },
    ],
    links: [{ label: "Open Programs", href: "/admin/programs" }],
    related: ["admin-programs-overview", "admin-enroll-people"],
  },
  {
    id: "admin-competencies",
    title: "Define competencies",
    summary: "Competencies are what readiness is measured against. Plans, practice and certification gates all point to them.",
    audience: ["admin"],
    category: "Programs",
    keywords: ["competency", "skills", "framework", "rubric", "readiness"],
    steps: [
      {
        title: "Open Competencies",
        body: "Choose Programs > Competencies in the left navigation.",
      },
      {
        title: "Add a competency",
        body: "In Add competency, enter a Name and Category (both required) and an optional Description, then click Add competency.",
      },
      {
        title: "Review the framework",
        body: "The Framework list shows every competency with its rubric levels.",
      },
      {
        title: "Delete a competency",
        body: "Click Delete on its row. It is removed straight away without a confirmation prompt.",
      },
    ],
    links: [{ label: "Open Competencies", href: "/admin/programs/competencies" }],
    related: ["admin-program-builder", "admin-practice-wizard"],
  },
  {
    id: "admin-content-library",
    title: "Add content to the library",
    summary: "Add modules, battle cards, guides and recordings that SEs find in Learn and that plan steps link to.",
    audience: ["admin"],
    category: "Content",
    keywords: ["library", "content", "asset", "upload", "link", "video", "document", "tags", "battle card"],
    overview: [
      "Assets appear in plan steps and on the SE Resources page.",
      "Type is Link, Video, Document, Podcast or File. Category includes Solution brief, Pitch deck, Demo recording and Reference.",
    ],
    steps: [
      {
        title: "Open the library",
        body: "Choose Content > Library and click Add content.",
      },
      {
        title: "Enter the source",
        body: "Enter a Title and a URL, or use Upload file. If you choose a file, it is uploaded and used instead of the URL.",
      },
      {
        title: "Classify it",
        body: "Choose Type and Category, then add Project tags and Module tags, comma-separated.",
      },
      {
        title: "Optionally suggest tags",
        body: "Click Suggest tags with AI, then review the suggested tags before saving.",
      },
      {
        title: "Save",
        body: "Click Save. Use Edit, Copy link or Delete on a row later.",
      },
    ],
    links: [{ label: "Open Library", href: "/admin/content" }],
    related: ["admin-corpus", "admin-program-builder"],
  },
  {
    id: "admin-practice-library",
    title: "Manage the practice library",
    summary: "Simulations and pitch scenarios SEs rehearse: filter, edit, duplicate, assign, and control what is live.",
    audience: ["admin"],
    category: "Content",
    keywords: ["practice", "simulation", "roleplay", "pitch", "pitch scenario", "live", "draft", "assign", "duplicate", "queue"],
    overview: [
      "Managers assign practice from Coaching, and programs pull it in as steps.",
      "Live pitch scenarios rotate into every SE's pitch queue, four at a time. Pitch scenarios are recorded by the SE and graded by their manager.",
      "Drafts show in the library with a Draft status until published.",
    ],
    steps: [
      {
        title: "Filter the list",
        body: "Open Content > Practice. Use Show (All, Live, Drafts), Type, Vertical, Competency and Sort (Most used, Name, Recently edited).",
      },
      {
        title: "Open an item",
        body: "Click a row to see it as the SE sees it, with actions for that item.",
      },
      {
        title: "Edit it",
        body: "Click Edit, change fields such as Name, Difficulty, Pass mark or Prompt, and click Save changes.",
      },
      {
        title: "Duplicate or assign",
        body: "Click Duplicate to start the wizard from a copy. For a simulation, click Assign to SEs, select people and confirm.",
      },
      {
        title: "Control what is live",
        body: "For a pitch scenario, click Take out of queues or Make it live. For a simulation, Delete removes it so managers can no longer assign it.",
      },
    ],
    links: [{ label: "Open Practice", href: "/admin/content/practice" }],
    related: ["admin-practice-wizard", "admin-ai-settings"],
  },
  {
    id: "admin-practice-wizard",
    title: "Create practice with the New practice wizard",
    summary: "Build a simulation or pitch scenario in four steps: Start, Buyer, Scenario and Scoring.",
    audience: ["admin"],
    category: "Content",
    keywords: ["new practice", "wizard", "simulation", "pitch scenario", "persona", "goals", "rubric", "pass mark", "placeholders", "{{solution}}", "{{vertical}}", "{{difficulty}}"],
    overview: [
      "Each step must be valid before you can move on. Scenario needs a name of at least 3 characters, a situation of at least 10 characters and 2 to 4 goals; goals become the scoring rubric and are weighted equally. Scoring needs a pass mark and a competency.",
      "Under \"Let managers change when they assign it\" you can tick Solution, Vertical and Difficulty. Ticked items become placeholders such as {{solution}}, {{vertical}} and {{difficulty}} in the prompt, filled in when a manager assigns it. Difficulty can only be ticked when Solution or Vertical is.",
    ],
    steps: [
      {
        title: "Start",
        body: "On Content > Practice, click New practice. Choose a Kind (Simulation or Pitch scenario) and Start from: Blank, a preset, Duplicate existing, or Upload a prompt file (.txt or .md).",
      },
      {
        title: "Buyer",
        body: "For a simulation, pick Dynamic buyer or Named persona; a named persona needs a name and a role and organisation. Pitch scenarios pick a Track instead.",
      },
      {
        title: "Scenario",
        body: "Enter the name, situation and 2 to 4 goals. Click Edit raw prompt to see or change the generated prompt text.",
      },
      {
        title: "Scoring",
        body: "Pick a Pass mark, Recommended practice rounds and what it Counts toward (a competency).",
      },
      {
        title: "Publish or save a draft",
        body: "Check \"Ready to publish?\" and click Publish, or Save as draft to keep it as a draft in the library.",
      },
      {
        title: "Choose what's next",
        body: "After publishing, pick Add to a ramp plan, Assign to SEs now (simulations only) or Back to the library.",
      },
    ],
    links: [{ label: "Open Practice", href: "/admin/content/practice" }],
    related: ["admin-practice-library", "admin-program-builder", "admin-competencies"],
  },
  {
    id: "admin-corpus",
    title: "Maintain the corpus and Q&A routing",
    summary: "Check the health of source material behind answers, handle SE feedback, and route unanswered questions to SMEs.",
    audience: ["admin"],
    category: "Content",
    keywords: ["corpus", "health check", "broken link", "stale", "routing", "sme", "escalation", "feedback", "slack"],
    overview: [
      "Master corpus shows Total assets, Stale 90+ days, Broken links and Feedback waiting. Each asset's Health is Healthy, Stale or Broken link.",
      "Q&A routing rules send questions with a matching tag to a Slack channel or email, optionally labelled with an SME.",
    ],
    steps: [
      {
        title: "Run a health check",
        body: "Open Content > Corpus and click Run health check. A message reports how many links were checked and how many are broken.",
      },
      {
        title: "Fix or add assets",
        body: "Click Edit on an asset to update it, or Add asset to go to the Library.",
      },
      {
        title: "Resolve SE feedback",
        body: "In SE feedback queue, add an SME answer to publish (optional) or an Admin note (optional) and resolve the item.",
      },
      {
        title: "Add a routing rule",
        body: "Under Q&A routing, enter a Tag match, choose Destination type (Slack channel or Email), add an SME label (optional) and click Save rule.",
      },
    ],
    links: [{ label: "Open Corpus", href: "/admin/content/corpus" }],
    related: ["admin-content-library", "admin-integrations"],
  },
  {
    id: "admin-content-reviews",
    title: "See what is waiting for review",
    summary: "The Reviews page counts work waiting on a reviewer across the tenant.",
    audience: ["admin"],
    category: "Content",
    keywords: ["reviews", "review queue", "sign-off", "inbox", "pending", "certification"],
    overview: [
      "Four queues are shown: Challenge submissions, Simulation coaching cards, Plan step reviews and Certification sign-offs. The Open reviews tile on Overview shows the total.",
    ],
    steps: [
      {
        title: "Open Reviews",
        body: "Choose Content > Reviews to see the count in each queue.",
      },
      {
        title: "Work a queue",
        body: "Click Open inbox on a queue to go to the reviewer inbox where the items are handled.",
      },
    ],
    links: [{ label: "Open Reviews", href: "/admin/content/reviews" }],
    related: ["admin-overview-setup-checklist", "admin-insights-audit"],
  },
  {
    id: "admin-insights-audit",
    title: "Use Insights and the audit log",
    summary: "See how SEs are ramping, export analytics, and check who changed what.",
    audience: ["admin"],
    category: "Insights",
    keywords: ["analytics", "insights", "report", "export", "csv", "audit", "audit log", "history", "readiness"],
    overview: [
      "Analytics shows Total users, Active plans, Pending reviews, Avg time to ready, average plan progress by manager, gate clearance, simulation score trend and Readiness vs. deal outcomes.",
      "The audit log lists When, Actor, Event, Target and Type for changes in the tenant.",
    ],
    steps: [
      {
        title: "Open Analytics",
        body: "Choose Insights > Analytics in the left navigation.",
      },
      {
        title: "Export",
        body: "Click Export as CSV to download the analytics data.",
      },
      {
        title: "Open the audit log",
        body: "Choose Insights > Audit log. Use Filter by event type to narrow the list.",
      },
      {
        title: "Export the audit log",
        body: "Click Export CSV to download the entries.",
        tip: "How long entries are kept is set in Settings > Data retention.",
      },
    ],
    links: [
      { label: "Open Analytics", href: "/admin/insights" },
      { label: "Open Audit log", href: "/admin/insights/audit" },
    ],
    related: ["admin-retention", "admin-content-reviews"],
  },
  {
    id: "admin-general-security",
    title: "General and Security settings",
    summary: "Set the session idle timeout and review sign-in posture, dormant accounts and recent admin actions.",
    audience: ["admin"],
    category: "Settings",
    keywords: ["session", "timeout", "idle", "security", "sso", "single sign-on", "mfa", "dormant accounts", "general"],
    overview: [
      "Session idle timeout signs users out after inactivity. The default is 15 minutes and the allowed range is 5 to 1440 minutes.",
      "Security shows whether Single sign-on is enabled. Your platform operator manages SSO configuration. Without SSO, users sign in with email and password.",
      "New users signing in with a temporary password must enroll in MFA on first sign-in. MFA is not configured from Settings.",
    ],
    steps: [
      {
        title: "Change the session timeout",
        body: "Open Settings > General, enter a value in Session idle timeout (minutes) and click Save general settings.",
      },
      {
        title: "Check SSO",
        body: "Open Settings > Security to see the Single sign-on status. Ask your platform operator through Overview > Support if it needs to change.",
      },
      {
        title: "Review dormant accounts",
        body: "Under Dormant accounts, see accounts with no recorded activity in the shown number of days. Remove any that should not have access from People.",
      },
      {
        title: "Review admin actions",
        body: "Recent admin actions lists the latest changes made by admins.",
      },
    ],
    links: [
      { label: "Open General", href: "/admin/settings/general" },
      { label: "Open Security", href: "/admin/settings/security" },
    ],
    related: ["admin-support-requests", "admin-edit-remove-users"],
  },
  {
    id: "admin-features",
    title: "View which features are on",
    summary: "The Features page lists every feature for your tenant. It is read-only for tenant admins.",
    audience: ["admin"],
    category: "Settings",
    keywords: ["features", "feature flags", "toggle", "enable feature", "locked", "plan"],
    overview: [
      "Your platform operator manages which features are on for this tenant, so every switch on this page is locked.",
      "Each row shows the Feature, Who sees it, what it Depends on, and whether it is On.",
    ],
    steps: [
      {
        title: "Open Features",
        body: "Choose Settings > Features. This is the first Settings page.",
      },
      {
        title: "Find a feature",
        body: "Use the Area filter or Search features.",
      },
      {
        title: "Request a change",
        body: "If something should be turned on or off, send a request from Overview > Support.",
      },
    ],
    links: [{ label: "Open Features", href: "/admin/settings/features" }],
    related: ["admin-support-requests", "admin-ai-settings"],
  },
  {
    id: "admin-ai-settings",
    title: "AI provider, model, key and usage",
    summary: "Choose the AI vendor and model, store an API key, and watch usage and estimated cost.",
    audience: ["admin"],
    category: "Settings",
    keywords: ["ai", "provider", "model", "api key", "xai", "grok", "openai", "usage", "cost", "tokens", "rate limit", "demo mode"],
    overview: [
      "Vendor is xAI (Grok) or OpenAI. Model suggestions are grok-4.3, grok-4.20-0309-non-reasoning, grok-4.5 and grok-4.7 for xAI, and gpt-4.1-mini, gpt-4o-mini and gpt-4o for OpenAI.",
      "The API key is encrypted at rest (AES-256-GCM). With no key, AI features run in demo mode.",
      "The usage dashboard shows Requests, Tokens and Est. cost over 30 days, the Busiest feature, and a per-feature table. Costs are estimates at list price; your provider's invoice is the source of truth.",
      "Each user is limited to 80 AI requests and 120,000 tokens per day (UTC). This limit is not configurable in Settings.",
    ],
    steps: [
      {
        title: "Open AI settings",
        body: "Choose Settings > AI. The AI provider card shows Connected or No key.",
      },
      {
        title: "Choose vendor and model",
        body: "Pick a Vendor and type or pick a Model.",
      },
      {
        title: "Add or replace the key",
        body: "Paste a key into API key. Leave it blank to keep the saved key.",
      },
      {
        title: "Save",
        body: "Click Save AI settings. New requests use the new provider.",
      },
      {
        title: "Review usage",
        body: "Check the 30-day totals and the \"AI usage by feature, last 30 days\" table to see where requests and cost come from.",
      },
    ],
    links: [{ label: "Open AI settings", href: "/admin/settings/ai" }],
    related: ["admin-practice-library", "admin-retention"],
  },
  {
    id: "admin-integrations",
    title: "Integrations",
    summary: "See connection status for Gong, Slack, Supabase and Vercel, and connect Gong.",
    audience: ["admin"],
    category: "Settings",
    keywords: ["integrations", "gong", "slack", "connect", "deal prep", "connections"],
    overview: [
      "Gong adds pre-call intel and call briefs to Deal Prep. Slack shows Connected or Needs a token. Supabase and Vercel are platform services and show Active.",
    ],
    steps: [
      {
        title: "Open Integrations",
        body: "Choose Settings > Integrations to see the Connections list.",
      },
      {
        title: "Connect Gong",
        body: "Click Connect Gong. If a workspace key or OAuth app is not set up, a message explains what is needed.",
      },
    ],
    links: [{ label: "Open Integrations", href: "/admin/settings/integrations" }],
    related: ["admin-overview-setup-checklist", "admin-corpus"],
  },
  {
    id: "admin-retention",
    title: "Data retention",
    summary: "Set how long audit logs, the activity feed and AI usage telemetry are kept.",
    audience: ["admin"],
    category: "Settings",
    keywords: ["retention", "purge", "delete logs", "audit log retention", "data", "privacy"],
    overview: [
      "Defaults are 365 days for audit logs, 180 days for the activity feed and 90 days for AI usage logs. Each value must be between 7 and 3650 days. Purge jobs use these values.",
    ],
    steps: [
      {
        title: "Open Data retention",
        body: "Choose Settings > Data retention.",
      },
      {
        title: "Set the windows",
        body: "Enter Audit log retention (days), Activity feed retention (days) and AI usage log retention (days).",
      },
      {
        title: "Save",
        body: "Click Save retention settings.",
      },
    ],
    links: [{ label: "Open Data retention", href: "/admin/settings/retention" }],
    related: ["admin-insights-audit", "admin-ai-settings"],
  },
  {
    id: "admin-support-requests",
    title: "Ask the platform team for help",
    summary: "Send a support request to the platform team and see their replies on the Support page.",
    audience: ["admin"],
    category: "Getting started",
    keywords: ["support", "help", "ticket", "request", "contact", "platform team", "operator"],
    steps: [
      {
        title: "Open Support",
        body: "Choose Overview > Support in the left navigation.",
      },
      {
        title: "Write the request",
        body: "Under New request, enter a Subject, choose a Priority (Low, Medium, High or Critical) and describe what you need in Message.",
      },
      {
        title: "Submit",
        body: "Click Submit request. A message confirms the platform team will follow up.",
      },
      {
        title: "Check replies",
        body: "Your requests lists everything you have sent, with any Reply from the platform team.",
      },
    ],
    links: [{ label: "Open Support", href: "/admin/help" }],
    related: ["admin-features", "admin-general-security"],
  },
];
