import type { HelpArticle } from "@/lib/help/types";

/** Capability playbooks: reading them (everyone) and importing them (admins). */
export const PLAYBOOK_ARTICLES: HelpArticle[] = [
  {
    id: "playbooks-use",
    title: "Use the capability playbooks",
    summary:
      "One playbook per SailPoint capability: the elevator pitch, discovery questions, buying triggers, stories and objection handling, with a 60-second Fast Track card on top.",
    audience: ["se", "manager"],
    category: "Learn",
    keywords: ["playbook", "field guide", "elevator pitch", "objection", "objection handling", "discovery questions", "fast track", "battlecard", "sled", "pitch", "drill", "practice", "voice", "typed"],
    overview: [
      "Playbooks come from your organization's sales field guide. Each one covers a single capability, such as Identity Graph or Entro, in the same order: the problem, the solution, the selling motion, the pitch, discovery questions, buying triggers, stories, objections, common mistakes and a self-test.",
      "The guide's rule applies here too: lead with the problem, not the product, and pick two capabilities for a deal, not ten.",
    ],
    steps: [
      {
        title: "Open Playbooks",
        body: "Go to Learn > Playbooks. Managers can also open it from Coaching > Playbooks.",
      },
      {
        title: "Pick the right playbook for the deal",
        body: "Use \"Which playbook for this deal?\" to match what the prospect just told you to a capability, then select its name. Or search pitches and objections with the search box above the list.",
      },
      {
        title: "Reload before a call",
        body: "The navy Fast Track card at the top of each playbook holds the pitch, three discovery questions and the most likely objection. Read it in the minute before you dial.",
      },
      {
        title: "Prepare properly",
        body: "Scroll down for the full chapter: what the problem costs a State & Local or Higher Education customer, the selling motion, stories you can retell, and every objection with a model response.",
      },
      {
        title: "If a playbook is assigned to you",
        body: "Assigned playbooks appear under \"Assigned to you\" at the top of Playbooks and under \"Playbooks due\" on Today, with the due date and a tick for each part: read it, pass the pitch drill, complete the objection drill. Select one to open it.",
        tip: "Select Mark as read at the bottom of a playbook once you've worked through it. Practice you'd already done counts.",
      },
      {
        title: "Practise the pitch",
        body: "Under \"Practise this\" at the top of a playbook, select a pitch drill. Pitch Studio opens in Free practice with that drill. Choose Video, Voice or Typed, deliver the pitch within the time limit, then select Score my pitch.",
        tip: "The AI compares what you said with the guide's pitch: does it lead with the problem, hit the key points, and stay concise? Select \"Show the guide's pitch\" afterwards to compare.",
      },
      {
        title: "Practise the objections",
        body: "Select \"Practise these objections\". An AI buyer raises the chapter's objections one at a time. Answer each in your own words; after each answer you get a score out of 10 against the guide's response and one line to try instead, and a total at the end.",
        tip: "Type HINT: at any point for a coaching tip on the current objection.",
      },
      {
        title: "Test yourself",
        body: "Answer the \"Test yourself\" questions at the end without looking back. If you can't, re-read that section.",
        tip: "Select \"How to use this guide\" for the guide's own advice, front matter and conclusion.",
      },
    ],
    links: [{ label: "Open Playbooks", href: "/learn/playbooks" }],
    related: ["playbooks-import", "playbooks-assign"],
  },
  {
    id: "playbooks-import",
    title: "Import and publish a field guide",
    summary:
      "Turn a Word field guide into structured playbooks: import the .docx, review each chapter as a draft, then publish to Learn.",
    audience: ["admin"],
    category: "Content",
    keywords: ["playbook", "field guide", "import", "docx", "word", "publish", "draft", "edition"],
    overview: [
      "The importer reads guides that follow the field guide chapter template (\"CHAPTER 1\", \"Elevator Pitch\", \"Discovery Questions\", \"Objection Handling\" and so on). Every chapter becomes a draft playbook; nothing is visible outside admins until you publish it.",
      "Each tenant has its own playbooks. To load a guide into another tenant, shadow that tenant and import it there.",
    ],
    steps: [
      {
        title: "Open Content > Playbooks",
        body: "Go to Content > Playbooks in the admin portal.",
      },
      {
        title: "Import the guide",
        body: "Under \"Import a field guide\", choose the .docx file and select Import guide. The result lists how many playbooks were created and anything the importer couldn't find.",
        tip: "Importing again creates a second copy, so you can compare a new edition before deleting the old one.",
      },
      {
        title: "Review each chapter",
        body: "Select a chapter to open its workbench. Preview shows exactly what readers will see; Edit lets you correct any section, add or remove objections, stories and pitches, and adjust the Fast Track card.",
      },
      {
        title: "Publish",
        body: "Select Publish in a chapter's workbench, or Publish all on the guide to release every draft at once. Published playbooks appear in Learn > Playbooks straight away.",
      },
      {
        title: "Create practice drills",
        body: "In a published playbook's workbench, under Practice drills, select Create pitch drills and Create objection drill. Pitch drills appear in Pitch Studio's Free practice and on the playbook in Learn; the objection drill can be assigned from Content > Practice like any simulation.",
        tip: "Pitch drills never fill people's assigned pitch queue on their own. Assign them when you want them reviewed by a manager.",
      },
      {
        title: "Update or retire",
        body: "Edits to a published playbook go live when you select Save changes, and its version number goes up. Drills built from an older version show \"Out of date\"; select Update to rebuild them. Unpublish hides a chapter again; Delete guide removes the guide and all its playbooks.",
      },
    ],
    links: [{ label: "Open Content > Playbooks", href: "/admin/content/playbooks" }],
    related: ["playbooks-use"],
  },
  {
    id: "playbooks-assign",
    title: "Assign playbooks with a due date",
    summary:
      "Ask people on your team to work through playbooks by a date, choose what counts as done, and track their progress.",
    audience: ["manager", "admin"],
    category: "Learn",
    keywords: ["assign", "playbook", "due date", "deadline", "training", "overdue", "reminder", "progress", "team"],
    overview: [
      "An assignment is done when the person has completed the parts you chose: read the playbook, passed its pitch drill (an average score of 70 or your own pass mark), and completed its objection drill. Practice they did before you assigned it counts.",
      "Managers can assign to anyone in their reporting line; admins can assign to anyone in the organization. Only published playbooks can be assigned.",
    ],
    steps: [
      {
        title: "Open Playbooks",
        body: "Go to Coaching > Playbooks (managers) or Learn > Playbooks.",
      },
      {
        title: "Start an assignment",
        body: "Select Assign at the bottom of any playbook, or switch to Team assignments and select Assign playbooks.",
      },
      {
        title: "Pick playbooks, people and a date",
        body: "Tick the playbooks and people, pick a due date (or In 7, 14 or 30 days), choose what counts as done, and add a note if it helps, such as the call it's for. Then select Assign.",
        tip: "Assigning the same playbook to someone again updates their due date and requirements instead of creating a duplicate.",
      },
      {
        title: "Track progress",
        body: "Team assignments lists everyone's assignments with a tick per part and a state: Not started, In progress, Done or Overdue. Use the filters to see who is overdue.",
      },
      {
        title: "Adjust or cancel",
        body: "Select Move due date or Cancel on any open assignment. Cancelling keeps the person's practice history.",
        tip: "People get a notification when assigned, a reminder two days before the due date, and one if it goes overdue. You're told when someone you assigned goes overdue.",
      },
    ],
    links: [{ label: "Open Playbooks", href: "/learn/playbooks" }],
    related: ["playbooks-use"],
  },
];
