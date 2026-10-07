import { z } from "zod";

/**
 * Capability playbooks: a sales field guide stored as structured content, one playbook per
 * capability chapter. Learn shows them to every role; Content › Playbooks is where admins import
 * a guide (.docx), review each chapter and publish it.
 */

export const STORY_SEGMENTS = ["state_local", "higher_ed", "general"] as const;
export type StorySegment = (typeof STORY_SEGMENTS)[number];

export const STORY_SEGMENT_LABELS: Record<StorySegment, string> = {
  state_local: "State & Local",
  higher_ed: "Higher Education",
  general: "General",
};

const text = z.string().trim();
const segmentText = z.object({ segment: z.enum(STORY_SEGMENTS), text });

export const playbookBodySchema = z.object({
  subtitle: text.default(""),
  /** Cold-open hook lines (the guide's "90-Second Hook"), in order. */
  hook: z.array(text).default([]),
  objectives: z.array(text).default([]),
  preview: z.array(text).default([]),
  whereFits: text.default(""),
  problem: z
    .object({ title: text.default(""), paragraphs: z.array(text).default([]) })
    .default(() => ({ title: "", paragraphs: [] })),
  costs: z.array(segmentText).default([]),
  solution: z
    .object({
      title: text.default(""),
      intro: z.array(text).default([]),
      parts: z.array(z.object({ title: text, paragraphs: z.array(text).default([]) })).default([]),
    })
    .default(() => ({ title: "", intro: [], parts: [] })),
  motion: z
    .object({ teach: text.default(""), tailor: text.default(""), takeControl: text.default("") })
    .default(() => ({ teach: "", tailor: "", takeControl: "" })),
  pitches: z.array(z.object({ title: text, text })).default([]),
  discoveryQuestions: z.array(text).default([]),
  buyingTriggers: z.array(text).default([]),
  stories: z.array(segmentText).default([]),
  objections: z.array(z.object({ objection: text, response: text })).default([]),
  mistakes: z.array(z.object({ title: text, body: text.default("") })).default([]),
  takeaways: z.array(text).default([]),
  retrievalCheck: z.array(text).default([]),
  fastTrack: z
    .object({ pitch: text, questions: z.array(text).default([]), objection: text.default(""), response: text.default("") })
    .nullable()
    .default(null),
});

export type PlaybookBody = z.infer<typeof playbookBodySchema>;

export const guideBodySchema = z.object({
  audience: text.default(""),
  /** The guide's "which chapter for this deal" table. */
  routing: z.array(z.object({ chapter: z.number().int(), capability: text, leadWhen: text })).default([]),
  /** Front matter, part openers and the conclusion, shown on the guide overview. */
  sections: z.array(z.object({ title: text, paragraphs: z.array(text).default([]) })).default([]),
});

export type GuideBody = z.infer<typeof guideBodySchema>;

export type PlaybookStatus = "draft" | "published";

export type PlaybookGuide = {
  id: string;
  title: string;
  segment: string;
  segmentLabel: string | null;
  edition: string | null;
  sourceName: string | null;
  body: GuideBody;
  createdAt: string;
  updatedAt: string;
};

export type CapabilityPlaybook = {
  id: string;
  guideId: string;
  chapter: number;
  slug: string;
  title: string;
  status: PlaybookStatus;
  version: number;
  body: PlaybookBody;
  publishedAt: string | null;
  updatedAt: string;
};

export type ParsedGuide = {
  title: string;
  segment: string;
  segmentLabel: string;
  edition: string;
  body: GuideBody;
  playbooks: { chapter: number; slug: string; title: string; body: PlaybookBody }[];
  /** Chapters or sections the importer couldn't find; shown to the admin before publishing. */
  warnings: string[];
};

/** A fresh, fully empty body (built literally so no list is ever shared between playbooks). */
export function emptyPlaybookBody(): PlaybookBody {
  return {
    subtitle: "",
    hook: [],
    objectives: [],
    preview: [],
    whereFits: "",
    problem: { title: "", paragraphs: [] },
    costs: [],
    solution: { title: "", intro: [], parts: [] },
    motion: { teach: "", tailor: "", takeControl: "" },
    pitches: [],
    discoveryQuestions: [],
    buyingTriggers: [],
    stories: [],
    objections: [],
    mistakes: [],
    takeaways: [],
    retrievalCheck: [],
    fastTrack: null,
  };
}
