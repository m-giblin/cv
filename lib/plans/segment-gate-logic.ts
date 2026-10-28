export function shouldUnlockNextSegment(input: {
  segmentIndex: number | null;
  isSegmentGate: boolean;
  unlockedSegmentMax: number;
  segmentStepStatuses: Array<{ isGate: boolean; status: string }>;
  maxSegments?: number;
}): boolean {
  const maxSegments = input.maxSegments ?? 4;

  if (!input.segmentIndex || !input.isSegmentGate) {
    return false;
  }

  if (input.segmentIndex < input.unlockedSegmentMax) {
    return false;
  }

  const allReviewed = input.segmentStepStatuses.every((step) => step.status === "reviewed");
  if (!allReviewed) {
    return false;
  }

  const nextSegment = Math.min(maxSegments, input.segmentIndex + 1);
  return nextSegment > input.unlockedSegmentMax;
}

/**
 * The part a gate opens: the next part number the stage actually uses. Stages number their parts by
 * phase (Days 61–90 has parts 1 and 3), so "current + 1" can name a part that doesn't exist and
 * leave the real one locked. Null when nothing comes after this part.
 */
export function nextPartIndex(partIndexes: Array<number | null | undefined>, current: number): number | null {
  const later = partIndexes.filter((index): index is number => typeof index === "number" && index > current);
  return later.length ? Math.min(...later) : null;
}
