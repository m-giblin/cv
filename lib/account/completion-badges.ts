import type { Challenge, CoachingCard, SimulationAssignment } from "@/lib/types";

export type CompletionBadge = {
  id: string;
  kind: "challenge" | "simulation";
  emoji: string;
  funTitle: string;
  subtitle: string;
  earnedAt: string;
  tone: "gold" | "blue" | "magenta" | "green" | "purple";
};

const CHALLENGE_EMOJI_RULES: Array<{ match: RegExp; emoji: string; funTitle: string }> = [
  { match: /search|orphan|stale/i, emoji: "🔍", funTitle: "Search Sleuth" },
  { match: /workflow|jml|lifecycle|leaver|joiner/i, emoji: "⚡", funTitle: "Workflow Warrior" },
  { match: /transform|concat|reference|lower/i, emoji: "🧬", funTitle: "Transform Tinkerer" },
  { match: /certif|sod|governance|audit/i, emoji: "🛡️", funTitle: "Governance Guardian" },
  { match: /entra|ad connect|aggregation|correlation/i, emoji: "☁️", funTitle: "Cloud Connector Pro" },
  { match: /access request|access profile|role/i, emoji: "🗝️", funTitle: "Access Architect" },
  { match: /cli|spconfig|sp config/i, emoji: "🛠️", funTitle: "CLI Craftsman" },
  { match: /form/i, emoji: "📝", funTitle: "Forms Finisher" },
  { match: /executive|cio|ciso|briefing|workshop/i, emoji: "🎤", funTitle: "Executive Storyteller" },
  { match: /saas|connector/i, emoji: "🔌", funTitle: "Connector Champion" },
  { match: /agent identity|ais|shadow ai/i, emoji: "🤖", funTitle: "Agent Identity Ace" },
  { match: /non-employee|contractor/i, emoji: "👥", funTitle: "Contingent Workforce Pro" },
  { match: /inventory|mapping|walkthrough/i, emoji: "🗺️", funTitle: "Discovery Navigator" },
];

const LEVEL_EMOJI: Record<string, { emoji: string; tone: CompletionBadge["tone"] }> = {
  Basic: { emoji: "🌱", tone: "green" },
  Senior: { emoji: "🔥", tone: "blue" },
  Advisory: { emoji: "👑", tone: "gold" },
};

function challengeTone(targetLevel?: string | null): CompletionBadge["tone"] {
  if (targetLevel === "Advisory") return "gold";
  if (targetLevel === "Senior") return "magenta";
  return "blue";
}

export function funChallengeBadge(challenge: Challenge): Pick<CompletionBadge, "emoji" | "funTitle" | "tone"> {
  for (const rule of CHALLENGE_EMOJI_RULES) {
    if (rule.match.test(challenge.title) || rule.match.test(challenge.description)) {
      return { emoji: rule.emoji, funTitle: rule.funTitle, tone: challengeTone(challenge.targetLevel) };
    }
  }

  const level = challenge.targetLevel ? LEVEL_EMOJI[challenge.targetLevel] : null;
  const words = challenge.title.split(/[:\-–]/)[0]?.trim() ?? challenge.title;
  const short = words.split(" ").slice(0, 3).join(" ");

  return {
    emoji: level?.emoji ?? "🏆",
    funTitle: short.length > 28 ? `${short.slice(0, 25)}…` : short,
    tone: level?.tone ?? challengeTone(challenge.targetLevel),
  };
}

const PERSONA_EMOJI_RULES: Array<{ match: RegExp; emoji: string; funTitle: string }> = [
  { match: /ciso/i, emoji: "🛡️", funTitle: "CISO Convinced" },
  { match: /cio/i, emoji: "💼", funTitle: "CIO Cleared" },
  { match: /architect/i, emoji: "🏗️", funTitle: "Architect Won Over" },
  { match: /director|vp/i, emoji: "🎯", funTitle: "Director Delivered" },
  { match: /healthcare/i, emoji: "🏥", funTitle: "Healthcare Hero" },
  { match: /sled|education|university/i, emoji: "🎓", funTitle: "SLED Standout" },
  { match: /finance|bank/i, emoji: "💰", funTitle: "Finance Fluent" },
];

export function funSimulationBadge(
  card: CoachingCard,
  assignment?: SimulationAssignment,
): Pick<CompletionBadge, "emoji" | "funTitle" | "tone"> {
  const persona = card.simulationContext?.persona ?? assignment?.persona ?? "";
  const vertical = card.simulationContext?.vertical ?? assignment?.vertical ?? "";
  const haystack = `${persona} ${vertical} ${assignment?.solutionFocus ?? ""}`;

  for (const rule of PERSONA_EMOJI_RULES) {
    if (rule.match.test(haystack)) {
      return { emoji: rule.emoji, funTitle: rule.funTitle, tone: "purple" };
    }
  }

  const difficulty = card.simulationContext?.difficulty ?? assignment?.difficulty;
  if (difficulty === "advanced") {
    return { emoji: "🎭", funTitle: "Tough Persona Tamed", tone: "gold" };
  }
  if (difficulty === "intermediate") {
    return { emoji: "🎭", funTitle: "Roleplay Rockstar", tone: "magenta" };
  }

  return { emoji: "🎭", funTitle: "Simulation Cleared", tone: "blue" };
}

export function buildChallengeCompletionBadge(
  submissionId: string,
  challenge: Challenge,
  earnedAt: string,
): CompletionBadge {
  const flair = funChallengeBadge(challenge);

  return {
    id: `challenge-${submissionId}`,
    kind: "challenge",
    emoji: flair.emoji,
    funTitle: flair.funTitle,
    subtitle: challenge.title,
    earnedAt,
    tone: flair.tone,
  };
}

export function buildSimulationCompletionBadge(
  card: CoachingCard,
  assignment: SimulationAssignment | undefined,
  earnedAt: string,
): CompletionBadge {
  const flair = funSimulationBadge(card, assignment);

  const subtitle =
    card.simulationContext?.persona ??
    assignment?.persona ??
    assignment?.solutionFocus ??
    "Customer simulation";

  return {
    id: `simulation-${card.id}`,
    kind: "simulation",
    emoji: flair.emoji,
    funTitle: flair.funTitle,
    subtitle,
    earnedAt,
    tone: flair.tone,
  };
}
