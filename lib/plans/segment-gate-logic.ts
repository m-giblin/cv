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
