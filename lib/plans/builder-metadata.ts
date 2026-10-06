/** Plan builder step fields persisted in `plan_steps.metadata`; only keys that were sent are written. */
export function builderMetadata(step: {
  criteria?: string[];
  evidence?: string | null;
  reviewer?: string | null;
  competency?: string | null;
  estimatedMinutes?: number | null;
}): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (step.criteria !== undefined) meta.criteria = step.criteria.map((item) => item.trim()).filter(Boolean);
  if (step.evidence !== undefined) meta.evidence = step.evidence;
  if (step.reviewer !== undefined) meta.reviewer = step.reviewer;
  if (step.competency !== undefined) meta.competency = step.competency;
  if (step.estimatedMinutes !== undefined) meta.estimatedMinutes = step.estimatedMinutes;
  return meta;
}
