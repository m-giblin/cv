import { SAILPOINT_CHALLENGE_LIBRARY } from "@/lib/challenges/sailpoint-challenge-library";
import { isAgenticChallenge } from "@/lib/challenges/challenge-library-utils";
import type { Challenge } from "@/lib/types";
import { MARKET_PULSE_WEEKLY } from "@/lib/market-pulse/quiz";

export type PulseReinforcementChallenge = {
  id: string;
  title: string;
  reason: string;
};

function challengeAsChallenge(entry: (typeof SAILPOINT_CHALLENGE_LIBRARY)[number]): Challenge {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    steps: entry.steps,
    difficulty: entry.difficulty,
    estimatedMinutes: entry.estimatedMinutes,
    linkedSolutions: entry.linkedSolutions,
    linkedResources: entry.linkedResources,
    successCriteria: entry.successCriteria,
    targetLevel: entry.targetLevel,
    isAiGenerated: false,
    createdBy: "library",
  };
}

export function reinforceChallengesForAnswers(
  answers: Record<string, number>,
): PulseReinforcementChallenge[] {
  const missed = MARKET_PULSE_WEEKLY.filter((q) => answers[q.id] !== q.correctIndex);
  const topics = new Set(missed.map((q) => q.topic));
  const recommendations: PulseReinforcementChallenge[] = [];

  for (const entry of SAILPOINT_CHALLENGE_LIBRARY) {
    const challenge = challengeAsChallenge(entry);
    let reason: string | null = null;

    if ((topics.has("agentic") || topics.has("sailpoint")) && isAgenticChallenge(challenge)) {
      reason = "Reinforce Agentic / ISC positioning from this week's pulse";
    } else if (topics.has("competitive") && /competitive|objection|differentiat/i.test(entry.title)) {
      reason = "Sharpen competitive talk track after a missed competitive question";
    } else if (topics.has("genai") && /genai|agentic/i.test(entry.title)) {
      reason = "Clarify GenAI vs Agentic AI after a missed pulse question";
    }

    if (reason && !recommendations.some((item) => item.id === entry.id)) {
      recommendations.push({ id: entry.id, title: entry.title, reason });
    }
  }

  if (recommendations.length === 0 && missed.length > 0) {
    const fallback = SAILPOINT_CHALLENGE_LIBRARY[0];
    if (fallback) {
      recommendations.push({
        id: fallback.id,
        title: fallback.title,
        reason: "General reinforcement from missed pulse questions",
      });
    }
  }

  return recommendations.slice(0, 3);
}
