import { generateObject, generateText, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
import { docSourcesFrom, stripCitations } from "@/lib/help/sailpoint-docs";
import type { PlaybookBody } from "@/lib/playbooks/types";
import type { BankQuestion, QuestionStats } from "@/lib/question-bank/model";

/** AI drafting for the question bank. Every draft is reviewed by an admin before anyone sees it. */

export const draftQuestionSchema = z.object({
  stem: z.string().min(10).max(400),
  choices: z.array(z.string().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(600),
  difficulty: z.enum(["easy", "medium", "hard"]),
  competency: z.string().max(60),
  /** For docs questions: the page the answer comes from. */
  sourceUrl: z.string().max(500).optional(),
});

export type DraftQuestion = z.infer<typeof draftQuestionSchema>;

const draftSetSchema = z.object({ questions: z.array(draftQuestionSchema).min(1).max(15) });

const WRITING_RULES = `Rules for every question:
- Multiple choice, exactly 4 options, exactly one correct.
- Test understanding a sales engineer needs in front of a customer, not trivia like page numbers or exact wording.
- Wrong options must be plausible to someone who skimmed, and similar in length to the right one. No "all of the above" or "none of the above".
- The explanation says why the right answer is right, in one or two sentences, using only the source.
- Mix difficulties: roughly a third easy, a third medium, a third hard.
- competency is a short label such as "platform", "discovery", "objection handling", "identity governance" or "integration".
- Never repeat or lightly reword a question from the "already asked" list.`;

function avoidList(existing: string[]) {
  if (!existing.length) return "";
  return `\n\nAlready asked (write different questions):\n${existing.slice(0, 60).map((stem) => `- ${stem}`).join("\n")}`;
}

/** The playbook as plain text, in reading order. */
export function playbookText(title: string, body: PlaybookBody) {
  const lines: string[] = [`# ${title}`, body.subtitle, body.whereFits];
  lines.push(...body.objectives, body.problem.title, ...body.problem.paragraphs);
  lines.push(...body.costs.map((cost) => cost.text));
  lines.push(body.solution.title, ...body.solution.intro);
  for (const part of body.solution.parts) lines.push(`## ${part.title}`, ...part.paragraphs);
  lines.push(body.motion.teach, body.motion.tailor, body.motion.takeControl);
  for (const pitch of body.pitches) lines.push(`Pitch, ${pitch.title}: ${pitch.text}`);
  lines.push(...body.discoveryQuestions.map((item) => `Discovery question: ${item}`));
  lines.push(...body.buyingTriggers.map((item) => `Buying trigger: ${item}`));
  for (const objection of body.objections) lines.push(`Objection: ${objection.objection} Response: ${objection.response}`);
  for (const mistake of body.mistakes) lines.push(`Mistake: ${mistake.title}. ${mistake.body}`);
  lines.push(...body.takeaways, ...body.retrievalCheck);
  return lines.filter((line) => typeof line === "string" && line.trim()).join("\n").slice(0, 24_000);
}

export async function draftFromPlaybook(input: {
  model: LanguageModel;
  title: string;
  body: PlaybookBody;
  count: number;
  existing: string[];
}) {
  const result = await generateObject({
    model: input.model,
    schema: draftSetSchema,
    prompt: `Write ${input.count} quiz questions that check whether a SailPoint sales engineer understood this field guide chapter. Use only facts in the chapter.

${WRITING_RULES}${avoidList(input.existing)}

Chapter:
${playbookText(input.title, input.body)}`,
    maxOutputTokens: 4000,
    temperature: 0.7,
  });
  return { questions: result.object.questions, usage: result.usage };
}

/**
 * Docs questions in two passes: first a web search limited to SailPoint's docs (or developer portal)
 * gathers study notes with their pages, then the questions are written from those notes alone.
 */
export async function draftFromDocs(input: {
  searchModel: LanguageModel;
  searchTools: ToolSet;
  model: LanguageModel;
  site: "docs" | "developer";
  topic: string;
  /** The SailPoint solution or developer area, to steer the search. */
  area?: string;
  count: number;
  existing: string[];
}) {
  const domain = input.site === "docs" ? "documentation.sailpoint.com" : "developer.sailpoint.com";
  const research = await generateText({
    model: input.searchModel,
    tools: input.searchTools,
    system: `You research SailPoint Identity Security Cloud on ${domain} only. Never use other sites or memory.`,
    prompt: `Search ${domain} for "${input.topic}"${input.area ? ` in ${input.area}` : ""}. Write detailed study notes: what it is, how it works, key settings or API details, limits, and how a customer would use it. After each fact, put the full URL of the page it came from in parentheses.`,
    maxOutputTokens: 3000,
    temperature: 0.2,
  });
  const notes = stripCitations(research.text);
  const pages = docSourcesFrom(research.sources as { sourceType?: string; url?: string; title?: string }[], 8);
  if (notes.trim().length < 200) {
    return { questions: [] as DraftQuestion[], pages, usage: [research.usage] };
  }

  const written = await generateObject({
    model: input.model,
    schema: draftSetSchema,
    prompt: `Write ${input.count} quiz questions about "${input.topic}" in SailPoint Identity Security Cloud, using only these study notes from ${domain}. Set sourceUrl to the ${domain} page each answer comes from.

${WRITING_RULES}${avoidList(input.existing)}

Study notes:
${notes.slice(0, 20_000)}

Pages found:
${pages.map((page) => `- ${page.title}: ${page.url}`).join("\n")}`,
    maxOutputTokens: 4000,
    temperature: 0.7,
  });
  return { questions: written.object.questions, pages, usage: [research.usage, written.usage] };
}

/** Rewrites a question the stats say is weak, keeping what it tests. */
export async function draftImprovement(input: { model: LanguageModel; question: BankQuestion; stats: QuestionStats; problem: string }) {
  const { question, stats } = input;
  const result = await generateObject({
    model: input.model,
    schema: z.object({ question: draftQuestionSchema }),
    prompt: `This quiz question needs improving. Problem: ${input.problem}.

Question: ${question.stem}
Options:
${question.choices.map((choice, index) => `${index + 1}. ${choice}${index === question.correctIndex ? " (marked correct)" : ""} - picked ${stats.picks[index] ?? 0} times`).join("\n")}
Explanation: ${question.explanation}
Answered ${stats.shown} times, ${stats.correct} correct.

Rewrite it to test the same idea fairly: clearer wording, plausible wrong options, one clearly right answer. If the marked answer looks wrong given the explanation, fix the answer key. Keep difficulty "${question.difficulty}" unless the problem says it is too easy or too hard.${question.sourceUrl ? ` Keep sourceUrl ${question.sourceUrl}.` : ""}

${WRITING_RULES}`,
    maxOutputTokens: 1200,
    temperature: 0.4,
  });
  return { question: result.object.question, usage: result.usage };
}
