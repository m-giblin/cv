import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal(""), z.null()]).optional();

/** Step body for POST/PATCH /api/plans/templates. Playbook ids are null on every non-playbook step. */
export const templateStepSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  stepType: z.enum([
    "content_review",
    "challenge",
    "simulation",
    "deal_prep",
    "shadow_meeting_log",
    "mentor_review",
    "knowledge_check",
    "playbook",
    "custom",
  ]),
  playbookId: optionalUuid,
  playbookSlug: z.union([z.string().max(200), z.literal(""), z.null()]).optional(),
  dueOffsetDays: z.number().int().min(1).optional(),
  contentUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  contentAssetId: optionalUuid,
  challengeId: optionalUuid,
  simulationTemplateId: optionalUuid,
  segmentIndex: z.number().int().min(1).max(4).nullable().optional(),
  isSegmentGate: z.boolean().optional(),
  criteria: z.array(z.string().max(500)).max(20).optional(),
  evidence: z.string().max(40).nullable().optional(),
  reviewer: z.string().max(40).nullable().optional(),
  competency: z.string().max(200).nullable().optional(),
  estimatedMinutes: z.number().int().min(0).max(10000).nullable().optional(),
  questionSource: z.string().max(200).nullable().optional(),
  passScore: z.number().int().min(1).max(100).nullable().optional(),
});

export const templateStepUpdateSchema = templateStepSchema.extend({
  id: z.string().uuid().optional(),
});

export type TemplateStepInput = z.infer<typeof templateStepUpdateSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  steps: z.array(templateStepSchema).min(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  steps: z.array(templateStepUpdateSchema).min(1),
});

/** First validation issue as a sentence the publish toast can show. */
export function templateRequestError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Check the outline and try again.";
  const where = issue.path.length ? issue.path.join(".") : "outline";
  return `${where}: ${issue.message}`;
}
