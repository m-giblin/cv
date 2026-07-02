import { z } from "zod";

export const generatedChallengeSchema = z.object({
  title: z.string().min(8),
  description: z.string().min(40),
  steps: z.array(z.string().min(10)).min(3),
  successCriteria: z.array(z.string().min(10)).min(3),
  estimatedMinutes: z.number().int().min(10).max(180),
  linkedResources: z.array(z.string()).default([]),
  linkedSolutions: z.array(z.string()).min(1),
  difficulty: z.enum(["foundational", "intermediate", "advanced"]),
});

export const coachingCardSchema = z.object({
  strengths: z.array(z.string().min(8)).min(1),
  gaps: z.array(z.string().min(8)).min(1),
  recommendedImprovements: z.array(z.string().min(8)).min(1),
  score: z.number().int().min(0).max(100),
  linkedCompetencies: z.array(z.string()).min(1),
  recommendedNextPractice: z.string().min(10),
  managerSummary: z.string().min(20),
});

export const simulationTurnSchema = z.object({
  personaResponse: z.string().min(10),
  coachingHint: z.string().min(10).optional(),
  objectionLevel: z.enum(["low", "medium", "high"]),
});

export type GeneratedChallenge = z.infer<typeof generatedChallengeSchema>;
export type CoachingCardOutput = z.infer<typeof coachingCardSchema>;
export type SimulationTurn = z.infer<typeof simulationTurnSchema>;
