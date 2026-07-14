function coachingCardScore(structuredOutput: unknown): number {
  if (!structuredOutput || typeof structuredOutput !== "object" || Array.isArray(structuredOutput)) {
    return 0;
  }
  const score = (structuredOutput as { score?: unknown }).score;
  return typeof score === "number" ? score : 0;
}

export { coachingCardScore };
