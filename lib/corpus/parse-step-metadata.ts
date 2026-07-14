export type PlanStepSegmentMeta = {
  segmentIndex: number | null;
  isSegmentGate: boolean;
  dueOffsetDays: number | null;
};

export function parsePlanStepMetadata(metadata: unknown, sortOrder: number): PlanStepSegmentMeta {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const segmentIndex =
    typeof record.segmentIndex === "number" && record.segmentIndex >= 1 && record.segmentIndex <= 4
      ? record.segmentIndex
      : null;
  const isSegmentGate = record.isSegmentGate === true;
  const dueOffsetDays =
    typeof record.dueOffsetDays === "number" ? record.dueOffsetDays : sortOrder * 7;

  return { segmentIndex, isSegmentGate, dueOffsetDays };
}

export function isStepLockedForSegment(
  segmentIndex: number | null,
  unlockedSegmentMax: number,
): boolean {
  if (!segmentIndex) return false;
  return segmentIndex > unlockedSegmentMax;
}
