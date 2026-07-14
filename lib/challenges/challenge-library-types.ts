import type { GeneratedChallenge } from "@/lib/ai/schemas";
import type { SeLevel } from "@/lib/types";

export type ChallengeLibraryEntry = GeneratedChallenge & {
  id: string;
  targetLevel: SeLevel;
  competencyNames?: string[];
};
