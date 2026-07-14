import { ELEVATOR_PITCH_TEMPLATE, SLED_ROLEPLAY_TEMPLATE } from "@/lib/simulations/prompt-template";

export const SIMULATION_TEMPLATE_PRESETS = {
  sledRoleplay: {
    name: "SLED Sales Roleplay",
    persona: "Dynamic (AI-generated buyer)",
    vertical: "SLED",
    solutionFocus: "SailPoint Agent Identity Security (AIS)",
    promptBody: SLED_ROLEPLAY_TEMPLATE,
  },
  elevatorPitch: {
    name: "SLED Elevator Pitch (Marcus Reid)",
    persona: "Marcus Reid — CIO, State of Ohio",
    vertical: "SLED",
    solutionFocus: "SailPoint Agent Identity Security (AIS)",
    promptBody: ELEVATOR_PITCH_TEMPLATE,
  },
} as const;
