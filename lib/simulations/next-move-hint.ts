import { splitCoachMessage } from "@/lib/simulations/coach-message";
import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import type { SimulationAssignment } from "@/lib/types";

type TranscriptEntry = SimulationAssignment["transcript"][number];

export type NextMoveHint = {
  text: string;
  /** coach: the AI's answer to a HINT: request. move/goal: picked from what the learner has not done yet. */
  source: "coach" | "move" | "objection" | "goal" | "done";
};

/**
 * Discovery moves for the open roleplay rubric, in the order a good first call covers them.
 * Each one is done once any of the learner's own messages matches it. No model call: the hint
 * advances as soon as the learner does what it asked.
 */
const ROLEPLAY_MOVES: Array<{ id: string; done: RegExp; hint: string }> = [
  {
    id: "approval",
    done: /\b(approv\w*|sign(s|ed)?[- ]?off|decision[- ]?makers?|decides?|who else|stakeholders?|budget owner|procurement|buying process|involved|champion)\b/i,
    hint: "Probe the approval chain: who signs off on identity governance spend, and who else has a say?",
  },
  {
    id: "urgency",
    done: /\b(audits?|deadlines?|timeline|why now|by when|fiscal|mandates?|driving|urgen\w*|due date|go[- ]live|this (year|quarter))\b/i,
    hint: "Find the urgency: what audit, deadline or mandate makes this a priority now, and what happens if it slips?",
  },
  {
    id: "current-state",
    done: /\b(today|currently|right now|current (process|tools?|setup|system|approach)|how do you (handle|manage|track|do)|manual\w*|spreadsheets?|tickets?)\b/i,
    hint: "Ask how they handle it today: who grants and removes access, and how they prove it to auditors.",
  },
  {
    id: "impact",
    done: /\b(cost\w*|impact|risks?|exposure|how many|hours|findings?|breach\w*|consequences?|what happens if)\b/i,
    hint: "Size the pain: how many people, apps or audit findings are affected, and what it costs them today.",
  },
  {
    id: "value",
    done: /\b(customers?|similar|other (states|agencies|universities|counties|hospitals)|outcomes?|results?|we('ve| have) seen|case study|proof|reduc\w*)\b/i,
    hint: "Tie it to an outcome: one sentence on how a similar customer solved this, then check it matters to them.",
  },
  {
    id: "next-step",
    done: /\b(next steps?|workshop|follow[- ]?up|schedule|calendar|meet again|deep[- ]dive|session|mutual|action plan)\b/i,
    hint: "Close for a next step: propose a specific follow-up, who should attend, and a date.",
  },
];

const OBJECTION_CUE =
  /\b(already have|already (use|rolled out|bought)|not sure why|why would we|another (vendor|platform|tool)|too expensive|can'?t afford|no budget|budget (is )?(frozen|tight|cut)|we tried|didn'?t work|concerned|skeptical|prove it)\b/i;

const STOPWORDS = new Set(
  "about after again also before being from have into just learner more only over plain language product than that their them then they this until what when where which while with without would your".split(" "),
);

function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [])].filter((word) => !STOPWORDS.has(word));
}

/** A goal counts as touched when the learner used at least half of its key words (matched on their first five letters). */
export function goalTouched(goal: string, learnerText: string): boolean {
  const words = keywords(goal);
  if (!words.length) return false;
  const said = new Set(keywords(learnerText).map((word) => word.slice(0, 5)));
  const hits = words.filter((word) => said.has(word.slice(0, 5))).length;
  return hits >= Math.ceil(words.length / 2);
}

function isHintRequest(message: string) {
  return /^\s*HINT\s*:/i.test(message);
}

/**
 * The "Next move" line in Live coaching. In order:
 * 1. The AI's answer to the learner's latest HINT: request, until the learner replies again.
 * 2. When the buyer just pushed back, how to handle the objection.
 * 3. The first discovery move (open roleplay) or scoring goal the learner has not touched yet.
 */
export function nextMoveHint(messages: TranscriptEntry[], criteria: RubricCriterion[]): NextMoveHint {
  let lastLearner = -1;
  let lastCoach = -1;
  messages.forEach((entry, index) => {
    if (entry.speaker === "se" && !isHintRequest(entry.message)) lastLearner = index;
    if (entry.speaker === "coach" && !splitCoachMessage(entry.message).note) lastCoach = index;
  });
  if (lastCoach > lastLearner) {
    const reply = splitCoachMessage(messages[lastCoach]!.message).reply;
    if (reply) return { text: reply, source: "coach" };
  }

  const learnerText = messages
    .filter((entry) => entry.speaker === "se" && !isHintRequest(entry.message))
    .map((entry) => entry.message)
    .join("\n");
  const last = messages[messages.length - 1];

  if (last?.speaker === "persona" && OBJECTION_CUE.test(last.message)) {
    return {
      text: "They just pushed back. Acknowledge the concern in their words, ask what is behind it, then reframe with one proof point.",
      source: "objection",
    };
  }

  const isOpenRoleplay = criteria.some((item) => item.label === "Executive storyline");
  if (isOpenRoleplay || !criteria.length) {
    const move = ROLEPLAY_MOVES.find((item) => !item.done.test(learnerText));
    return move
      ? { text: move.hint, source: "move" }
      : { text: "You have covered the core discovery moves. Confirm the next step, then select End & get feedback.", source: "done" };
  }

  const remaining = criteria.filter((item) => !goalTouched(`${item.label} ${item.description}`, learnerText));
  const goal = remaining[0];
  if (!goal) {
    return { text: "You have touched every scoring goal. Wrap up, then select End & get feedback.", source: "done" };
  }
  const touched = criteria.length - remaining.length;
  const progress = touched ? ` (${touched} of ${criteria.length} goals touched)` : "";
  const detail = goal.description ? ` ${goal.description}` : "";
  return { text: `Next goal: ${goal.label}.${detail}${progress}`, source: "goal" };
}
