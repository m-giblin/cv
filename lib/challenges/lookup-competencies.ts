import type { Challenge } from "@/lib/types";

export function competencyNamesForChallenge(challenge: Pick<Challenge, "id" | "competencyNames">): string[] {
  return challenge.competencyNames ?? [];
}

export function certificationHrefForCompetency(competencyName: string) {
  const normalized = competencyName.toLowerCase();
  if (normalized.includes("agentic") || normalized.includes("ais")) {
    return "/readiness/certification";
  }
  if (normalized.includes("executive") || normalized.includes("demo")) {
    return "/readiness/certification";
  }
  return "/readiness";
}
