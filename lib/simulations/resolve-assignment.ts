import { SimulationAssignment } from "@/lib/types";
import { defaultSledPromptSnapshot } from "@/lib/simulations/prompt-template";

export function createPracticeSimulation(userId: string): SimulationAssignment {
  const solutionFocus = "SailPoint Agent Identity Security (AIS)";
  const vertical = "SLED";
  const difficulty = "intermediate" as const;

  return {
    id: "practice-local",
    assignedTo: userId,
    assignedBy: "system",
    persona: "Dynamic (AI-generated buyer)",
    vertical,
    solutionFocus,
    difficulty,
    status: "not_started",
    transcript: [],
    aiRoleplay: true,
    promptSnapshot: defaultSledPromptSnapshot({ solutionFocus, vertical, difficulty }),
    practiceRoundsRequired: 1,
    practiceRoundsCompleted: 0,
  };
}

export function resolveSimulationAssignment(
  simulations: SimulationAssignment[],
  userId: string,
): { assignment: SimulationAssignment; isPractice: boolean } {
  const assigned = simulations.find((simulation) => simulation.assignedTo === userId) ?? null;

  if (assigned) {
    return { assignment: assigned, isPractice: false };
  }

  return { assignment: createPracticeSimulation(userId), isPractice: true };
}
