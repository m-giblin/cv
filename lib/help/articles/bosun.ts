import { ASSISTANT_LIMITS, BOSUN_DEFINITION } from "@/lib/help/assistant";
import type { HelpArticle } from "@/lib/help/types";

/** Bosun, the in-app assistant. Shared by every portal. */
export const BOSUN_ARTICLES: HelpArticle[] = [
  {
    id: "bosun-meet",
    title: "Meet Bosun, your enablement guide",
    summary:
      "Bosun is the assistant behind the \"Ask the Bosun\" button. It answers questions about this platform, SailPoint products and SE skills, and cites where the answer came from.",
    audience: ["se", "manager", "admin"],
    category: "Bosun",
    keywords: ["bosun", "boatswain", "assistant", "ai", "chat", "ask", "bot", "help", "sailpoint docs", "developer docs"],
    overview: [
      `Why the name? ${BOSUN_DEFINITION}`,
      "Bosun answers three kinds of questions: how to do something in SE Enablement, SailPoint products and APIs, and SE craft such as discovery, demos and objection handling. It politely declines anything else (sports, weather, general trivia) without spending AI credits.",
      "Platform answers come from the Help Center articles you can read in your portal, so an SE never sees admin-only steps. Product questions about Identity Security Cloud, IdentityIQ, connectors, transforms, workflows or the APIs are checked live against documentation.sailpoint.com and developer.sailpoint.com, and only those two sites.",
      `To keep AI costs in check, each person gets ${ASSISTANT_LIMITS.dailyQuestions} questions a day, questions are capped at ${ASSISTANT_LIMITS.maxQuestionChars} characters, and Bosun keeps answers short. The counter under the question box shows what's left today. The Help Center itself is always free and unlimited.`,
    ],
    steps: [
      {
        title: "Open Bosun",
        body: "Select \"Ask the Bosun\" at the bottom right of any page. The panel opens with a few starter questions for your portal.",
        tip: "Press Escape to close it. Your conversation stays until you reload the page.",
      },
      {
        title: "Ask one clear question",
        body: "Type your question and press Enter (Shift+Enter adds a new line). Name the page or feature if you can, for example \"How do I submit evidence for a program step?\" or \"How does the ISC transforms API handle dates?\".",
      },
      {
        title: "Follow up",
        body: "Ask a follow-up in the same panel. Bosun remembers the last few messages, so \"and how do I undo that?\" works.",
      },
      {
        title: "Check the sources",
        body: "Under each answer, \"From the Help Center\" links open the step-by-step article, and \"From SailPoint docs\" links open the official page in a new tab. Treat the linked source as the final word.",
        tip: "Bosun can be wrong. For anything customer-facing, confirm the detail in the linked SailPoint doc.",
      },
      {
        title: "If Bosun is missing or says it's off",
        body: "Your organization's admin or platform operator controls Bosun. If the button isn't there, or Bosun says it's turned off, ask them, or use the Help Center from the Help menu.",
      },
    ],
    links: [{ label: "Open the Help Center", href: "/help" }],
  },
];
