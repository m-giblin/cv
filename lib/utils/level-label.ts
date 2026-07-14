import { Profile, SeLevel } from "@/lib/types";

export function profileLevelLabel(profile: Pick<Profile, "level" | "role">): SeLevel {
  if (profile.level) {
    return profile.level;
  }

  switch (profile.role) {
    case "senior_se":
      return "Senior";
    case "advisory_solutions_consultant":
      return "Advisory";
    default:
      return "Basic";
  }
}

export function difficultyForLevel(level: SeLevel): "foundational" | "intermediate" | "advanced" {
  switch (level) {
    case "Advisory":
      return "advanced";
    case "Senior":
      return "intermediate";
    default:
      return "foundational";
  }
}
