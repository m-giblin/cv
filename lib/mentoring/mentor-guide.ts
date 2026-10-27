import type { PlanStep, PlanStepType } from "@/lib/types";

export type StepResourceKind = "challenge" | "simulation" | "playbook" | "asset";

export type StepResourceSection = { label: string; items: string[] };

/** The content a step points at, summarised so a mentor can learn it without opening it. */
export type StepResource = {
  kind: StepResourceKind;
  title: string;
  summary?: string;
  sections: StepResourceSection[];
};

/** A pass and a miss for this kind of step, so a mentor knows what to compare the attempt against. */
export type StepExemplar = { strong: string; weak: string };

const READ_EXEMPLAR: StepExemplar = {
  strong:
    "\"A new researcher waits weeks for lab access, and nobody owns the review. I'd ask who approves access today and how long it takes.\" They used their own words and named a customer.",
  weak:
    "They repeat the page: \"Identity security covers joiner, mover, and leaver, and the product has lifecycle management.\" Asked what they would ask a buyer, they go back to the headings.",
};

const PITCH_EXEMPLAR: StepExemplar = {
  strong:
    "Opens on the customer's problem, names who feels it, and asks for a next step. The product shows up as the way through that problem, not as the opening line.",
  weak: "A tour that starts with the logo and ends in a feature list. No customer, and no ask at the end.",
};

export type MentorGuide = {
  purpose: string;
  yourRole: string;
  ask: string[];
  lookFor: string[];
  watchFor: string[];
};

const PLAYBOOK_SOURCE = /^playbook:([0-9a-f-]{36})$/i;

/** Key into the resource map for the content this step links to. */
export function resourceKeyForStep(step: PlanStep): string | null {
  if (step.challengeId) return `challenge:${step.challengeId}`;
  if (step.simulationTemplateId) return `simulation:${step.simulationTemplateId}`;
  if (step.playbookId) return `playbook:${step.playbookId}`;
  const source = step.questionSource ? PLAYBOOK_SOURCE.exec(step.questionSource) : null;
  if (source) return `playbook:${source[1]}`;
  if (step.contentAssetId) return `asset:${step.contentAssetId}`;
  return null;
}

function isOpenableUrl(url: string | undefined): url is string {
  return Boolean(url && (url.startsWith("/") || /^https?:\/\//.test(url)));
}

/**
 * Where a mentor can try the step themselves. These links open the content in the mentor's own
 * session; they never open the mentee's assignment.
 */
export function mentorPreviewHref(step: PlanStep): string | null {
  switch (step.type) {
    case "knowledge_check":
      return step.questionSource
        ? `/learn/knowledge-checks?source=${encodeURIComponent(step.questionSource)}`
        : "/learn/knowledge-checks";
    case "challenge":
      return step.challengeId
        ? `/practice/challenges?focus=challenge&challenge=${step.challengeId}`
        : "/practice/challenges";
    case "simulation":
      return step.simulationTemplateId ? `/practice/simulations?template=${step.simulationTemplateId}` : null;
    case "playbook":
      return step.playbookSlug ? `/learn/playbooks?playbook=${encodeURIComponent(step.playbookSlug)}` : "/learn/playbooks";
    case "deal_prep":
      return "/practice/deal-prep";
    case "content_review":
      return isOpenableUrl(step.resourceUrl) ? step.resourceUrl : null;
    case "shadow_meeting_log":
    case "mentor_review":
    case "custom":
      return isOpenableUrl(step.resourceUrl) ? step.resourceUrl : null;
    default: {
      const exhaustive: never = step.type;
      return exhaustive;
    }
  }
}

export function mentorPreviewLabel(step: PlanStep): string {
  switch (step.type) {
    case "knowledge_check":
      return "Take the check yourself";
    case "challenge":
      return "Open the challenge";
    case "simulation":
      return "Run the simulation yourself";
    case "playbook":
      return "Read the playbook";
    case "deal_prep":
      return "Open deal prep";
    case "content_review":
    case "shadow_meeting_log":
    case "mentor_review":
    case "custom":
      return "Open the resource";
    default: {
      const exhaustive: never = step.type;
      return exhaustive;
    }
  }
}

/** Pass the step's link too: a content step that opens pitch practice is a pitch, not reading. */
export function stepTypeLabel(type: PlanStepType, resourceUrl?: string | null): string {
  if (type === "content_review" && resourceUrl?.startsWith("/practice/pitch")) return "Pitch practice";
  switch (type) {
    case "content_review":
      return "Read or watch";
    case "challenge":
      return "Hands-on challenge";
    case "simulation":
      return "Customer simulation";
    case "shadow_meeting_log":
      return "Shadow a call";
    case "mentor_review":
      return "Mentor check-in";
    case "deal_prep":
      return "Deal prep";
    case "knowledge_check":
      return "Knowledge check";
    case "playbook":
      return "Playbook";
    case "custom":
      return "Task";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

const GATE_GUIDE: MentorGuide = {
  purpose:
    "This is the approval point for the stage. The hiring manager signs it off, and that approval opens the next 30-day program.",
  yourRole:
    "Get your mentee ready for the conversation and tell their manager what you have seen. The manager makes the call; your notes are the evidence.",
  ask: [
    "Explain identity security to me as if I were a new customer, without naming a product.",
    "Which step this month was hardest, and what did you do about it?",
    "What would you still want help with before you sit in front of a customer?",
  ],
  lookFor: [
    "Plain-language explanations with a customer example",
    "Every earlier step in this stage is complete",
    "They can name their own gaps and a plan for each",
  ],
  watchFor: [
    "Reciting product names in place of the problem",
    "Rushing to the gate with steps still open",
    "Scores that passed but answers they cannot explain",
  ],
};

/** How a mentor coaches each kind of step. Gates use the sign-off guide whatever their type. */
export function mentorGuideFor(step: PlanStep): MentorGuide {
  if (step.isSegmentGate) return GATE_GUIDE;
  switch (step.type) {
    case "playbook":
    case "content_review":
      return {
        purpose: "Builds the vocabulary and story your mentee will use with customers.",
        yourRole: "Read or skim it yourself first, then have a short conversation once they finish.",
        ask: [
          "What is the customer problem this covers, in one sentence?",
          "Which part surprised you?",
          "How would you explain this to someone outside identity?",
        ],
        lookFor: ["Explains it in their own words", "Connects it to a real customer situation", "Can name one question they would ask a buyer"],
        watchFor: ["Repeating the text word for word", "Marking it read without being able to summarise it"],
      };
    case "knowledge_check":
      return {
        purpose: "A quick recall check. The questions rotate, so a pass reflects understanding more than memory.",
        yourRole: "Take the check yourself so you know what it asks. Review any missed topics with them.",
        ask: ["Which question did you get wrong, and what is the right answer?", "Why is that answer right?"],
        lookFor: ["Pass at or above the mark", "Can explain a missed answer afterwards"],
        watchFor: ["Retaking until it passes without reviewing the material"],
      };
    case "simulation":
      return {
        purpose: "Practice with an AI customer. This is where knowledge turns into a conversation.",
        yourRole: "Run it once yourself, then debrief their attempt. Focus on discovery before demo.",
        ask: [
          "What did the customer care about most?",
          "Which question opened the conversation up?",
          "What would you do differently next time?",
        ],
        lookFor: ["Asks before telling", "Ties the answer to the customer's situation", "Handles pushback calmly"],
        watchFor: ["Pitching in the first minute", "Talking features without a problem", "Ignoring the customer's objection"],
      };
    case "challenge":
      return {
        purpose: "Hands-on work in the product or a written exercise that shows they can apply the concept.",
        yourRole: "Know the steps and success criteria below. Offer to pair on it when they get stuck.",
        ask: ["Walk me through what you built.", "Where did you get stuck?", "How would you show this to a customer?"],
        lookFor: ["Meets each success criterion", "Can explain why each step matters"],
        watchFor: ["Following steps without understanding them"],
      };
    case "shadow_meeting_log":
      return {
        purpose: "Learning by watching a real customer call.",
        yourRole: "Invite them to one of your calls if you can, then debrief within a day.",
        ask: ["What did the customer want?", "What technique will you reuse?"],
        lookFor: ["Specific observations", "One technique they will try"],
        watchFor: ["Notes that summarise the agenda but miss the customer"],
      };
    case "mentor_review":
      return {
        purpose: "A scheduled conversation with you.",
        yourRole: "Hold the conversation, then approve the review request when it is done.",
        ask: ["What is going well?", "What is blocking you?", "What do you want to practise next?"],
        lookFor: ["Honest self-assessment", "A next action they own"],
        watchFor: ["Nothing to discuss, which usually means they are stuck"],
      };
    case "deal_prep":
      return {
        purpose: "Prepares a real or practice account the way a field SE would.",
        yourRole: "Review the brief with them as you would before a customer meeting.",
        ask: ["What do you expect the customer to push back on?", "What is the next step you want?"],
        lookFor: ["Specific discovery questions", "A clear next step"],
        watchFor: ["Generic briefs that could fit any account"],
      };
    case "custom":
      return {
        purpose: "A task added for this mentee.",
        yourRole: "Ask what done looks like and check in once it is submitted.",
        ask: ["What did you produce?", "What did you learn?"],
        lookFor: ["Work that matches the description"],
        watchFor: ["Unclear scope"],
      };
    default: {
      const exhaustive: never = step.type;
      return exhaustive;
    }
  }
}

function isPitch(step: PlanStep) {
  return Boolean(step.resourceUrl && /pitch/i.test(step.resourceUrl));
}

/** What a strong attempt and a weak one sound like for this kind of step. */
export function stepExemplar(step: PlanStep): StepExemplar {
  if (step.isSegmentGate) {
    return {
      strong:
        "They explain the stage in plain language, name one gap and what they will do about it, and the earlier steps are done. You can tell their manager they are ready.",
      weak:
        "They recite product names, two steps are still open, and they cannot explain a score they passed. Signing off now would move them on before they can do the work.",
    };
  }
  switch (step.type) {
    case "playbook":
      return READ_EXEMPLAR;
    case "content_review":
      return isPitch(step) ? PITCH_EXEMPLAR : READ_EXEMPLAR;
    case "knowledge_check":
      return {
        strong:
          "They missed the question on non-human identity, then explained it: an API key is an identity because it authenticates and holds access. The retake came after that conversation.",
        weak: "They retook the check until it passed and cannot say which question they missed, or why the right answer is right.",
      };
    case "simulation":
      return {
        strong:
          "The first minutes are questions: who feels the pain, what happens when access is late, what they have already tried. The demo starts after the customer names the problem. When the customer says they already have SSO, they ask what SSO does not cover.",
        weak:
          "They open with a product tour. \"We already have SSO\" gets a feature list. The transcript is the mentor talking and the customer waiting.",
      };
    case "challenge":
      return {
        strong:
          "They walk each success criterion and say why a customer would care. Stuck once, they can point at the step and explain what they changed.",
        weak: "The clicks are done. Asked why a setting is there, they read the step title back.",
      };
    case "shadow_meeting_log":
      return {
        strong:
          "\"The customer kept coming back to the audit finding. The SE asked who owns it before offering a workshop. I'll try that question on my next call.\"",
        weak: "\"It was a discovery call about the platform. They showed a few slides.\" The agenda is there. The customer is not.",
      };
    case "mentor_review":
      return {
        strong: "They bring one thing that went well, one place they are stuck, and a piece of work they want to practise before the next meeting.",
        weak: "\"All good, nothing to discuss.\" That usually means they are stuck and do not want to say so.",
      };
    case "deal_prep":
      return {
        strong:
          "The brief names this account's constraint, three discovery questions only this customer would be asked, and the next step they want from the meeting.",
        weak: "A brief that would fit any company in the industry. The discovery questions could be copied onto the next account unchanged.",
      };
    case "custom":
      return {
        strong: "The work matches what the task asked for, and they can say what they would do differently next time.",
        weak: "Something was submitted, and they cannot connect it to the task or to a customer.",
      };
    default: {
      const exhaustive: never = step.type;
      return exhaustive;
    }
  }
}
