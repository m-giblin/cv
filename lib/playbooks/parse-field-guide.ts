import {
  emptyPlaybookBody,
  type GuideBody,
  type ParsedGuide,
  type PlaybookBody,
  type StorySegment,
} from "@/lib/playbooks/types";

/**
 * Turns a sales field guide's plain text (one paragraph per line, as mammoth or textutil produce
 * it) into a guide plus one playbook per chapter. It relies on the guide's fixed chapter template
 * ("Discovery Questions", "Objection Handling", …); anything it can't place is reported as a
 * warning so an admin can fix it in review rather than losing it silently.
 */

type SectionKey =
  | "hook"
  | "objectives"
  | "preview"
  | "problem"
  | "costs"
  | "solution"
  | "motion"
  | "pitch"
  | "discovery"
  | "triggers"
  | "stories"
  | "objections"
  | "mistakes"
  | "summary"
  | "retrieval";

const SECTION_HEADINGS: [SectionKey, RegExp][] = [
  ["hook", /^The \d+-Second Hook\b/i],
  ["objectives", /^What You Will Be Able to Do\b/i],
  ["preview", /^Chapter Preview$/i],
  ["problem", /^The Problem:/i],
  ["costs", /^What This Costs\b/i],
  ["solution", /^(The Solution\b|The Narrative\b|The [\w-]+ Capability Areas$)/i],
  ["motion", /^Selling Motion\b/i],
  ["pitch", /^(\d+-Second Elevator Pitch|Elevator Pitch(es)?)$/i],
  ["discovery", /^Discovery Questions$/i],
  ["triggers", /^Buying Triggers$/i],
  ["stories", /^Storytelling\b/i],
  ["objections", /^Objection Handling$/i],
  ["mistakes", /^Common Mistakes\b/i],
  ["summary", /^Chapter Summary$/i],
  ["retrieval", /^Retrieval Check\b/i],
];

/** Box labels and instructions that sit under headings in the guide but aren't content. */
const FILLER = [
  /^Deliver This Without Notes$/i,
  /^Use these before introducing the solution\b/i,
  /^This capability is in play when\b/i,
  /^Avoid These$/i,
  /^Key Takeaways$/i,
  /^Answer these without looking back\b/i,
];

export function normaliseLines(raw: string): string[] {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^[\s••●\-–]+(?=\S)/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Strips one pair of wrapping quotes: "…" or “…”. */
export function unquote(value: string): string {
  const trimmed = value.trim();
  const match = /^["“](.*)["”]$/s.exec(trimmed);
  return match ? match[1]!.trim() : trimmed;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function sectionOf(line: string): SectionKey | null {
  for (const [key, pattern] of SECTION_HEADINGS) if (pattern.test(line)) return key;
  return null;
}

function isFiller(line: string) {
  return FILLER.some((pattern) => pattern.test(line));
}

function storySegment(line: string): { segment: StorySegment; text: string } {
  const stateLocal = /^State (&|and) Local( Story)?\s+/i.exec(line);
  if (stateLocal) return { segment: "state_local", text: line.slice(stateLocal[0].length).trim() };
  const higherEd = /^Higher Education( Story)?\s+/i.exec(line);
  if (higherEd) return { segment: "higher_ed", text: line.slice(higherEd[0].length).trim() };
  return { segment: "general", text: line };
}

/** Sub-headings inside a solution section: "Step 1 — …", "Pillar 2 — …", or a short label line. */
function isPartHeading(line: string) {
  if (/^(Step|Pillar|Area|Movement|Phase) \d+\s*[—–-]\s*\S/i.test(line)) return true;
  if (line.length > 72 || /^["“]/.test(line)) return false;
  return !/[.?!"”]$/.test(line);
}

function parseChapter(lines: string[], warnings: string[], chapter: number): { title: string; body: PlaybookBody } {
  const body = emptyPlaybookBody();
  const title = lines[0] ?? `Chapter ${chapter}`;
  const sections = new Map<SectionKey, { heading: string; lines: string[] }>();
  let current: { heading: string; lines: string[] } | null = null;
  const preamble: string[] = [];

  for (const line of lines.slice(1)) {
    const key = sectionOf(line);
    if (key && !sections.has(key)) {
      current = { heading: line, lines: [] };
      sections.set(key, current);
      continue;
    }
    if (isFiller(line)) continue;
    (current ? current.lines : preamble).push(line);
  }

  body.subtitle = preamble[0] ?? "";
  const get = (key: SectionKey) => sections.get(key)?.lines ?? [];

  body.hook = get("hook");
  body.objectives = get("objectives");
  for (const line of get("preview")) {
    const where = /^Where this fits:\s*/i.exec(line);
    if (where) body.whereFits = line.slice(where[0].length);
    else body.preview.push(line);
  }

  const problem = sections.get("problem");
  if (problem) body.problem = { title: problem.heading.replace(/^The Problem:\s*/i, ""), paragraphs: problem.lines };
  body.costs = get("costs").map(storySegment);

  const solution = sections.get("solution");
  if (solution) {
    body.solution.title = solution.heading.replace(/^The Solution:\s*/i, "");
    for (const line of solution.lines) {
      if (isPartHeading(line)) body.solution.parts.push({ title: line.replace(/:$/, ""), paragraphs: [] });
      else if (body.solution.parts.length) body.solution.parts.at(-1)!.paragraphs.push(line);
      else body.solution.intro.push(line);
    }
  }

  for (const line of get("motion")) {
    const match = /^(Teach|Tailor|Take Control)\s+/i.exec(line);
    const value = match ? unquote(line.slice(match[0].length)) : line;
    const key = !match ? null : match[1]!.toLowerCase() === "teach" ? "teach" : match[1]!.toLowerCase() === "tailor" ? "tailor" : "takeControl";
    if (key) body.motion[key] = value;
  }

  for (const line of get("pitch")) {
    const named = /^Pitch \d+\s*[—–-]\s*(.+)$/i.exec(line);
    if (named) body.pitches.push({ title: named[1]!.trim(), text: "" });
    else if (body.pitches.length && !body.pitches.at(-1)!.text) body.pitches.at(-1)!.text = unquote(line);
    else if (body.pitches.length && body.pitches.at(-1)!.title !== "Elevator pitch" && body.pitches.at(-1)!.text)
      body.pitches.at(-1)!.text += `\n\n${unquote(line)}`;
    else body.pitches.push({ title: "Elevator pitch", text: unquote(line) });
  }

  body.discoveryQuestions = get("discovery").map(unquote);
  body.buyingTriggers = get("triggers");
  body.stories = get("stories").map(storySegment);

  for (const line of get("objections")) {
    const objection = /^Objection:\s*/i.exec(line);
    const response = /^Your response:\s*/i.exec(line);
    if (objection) body.objections.push({ objection: unquote(line.slice(objection[0].length)), response: "" });
    else if (response && body.objections.length) body.objections.at(-1)!.response = unquote(line.slice(response[0].length));
    else if (body.objections.length) {
      const last = body.objections.at(-1)!;
      last.response = last.response ? `${last.response}\n\n${line}` : unquote(line);
    }
  }

  // Each mistake is a short title line followed by its explanation.
  const mistakeLines = get("mistakes");
  for (let index = 0; index < mistakeLines.length; index += 2) {
    body.mistakes.push({ title: mistakeLines[index]!, body: mistakeLines[index + 1] ?? "" });
  }

  body.takeaways = get("summary");
  body.retrievalCheck = get("retrieval").map((line) => line.replace(/^\d+[.)]\s*/, ""));

  const missing: [boolean, string][] = [
    [!body.pitches.length, "elevator pitch"],
    [!body.discoveryQuestions.length, "discovery questions"],
    [!body.objections.length, "objections"],
    [!body.takeaways.length, "summary"],
  ];
  for (const [isMissing, label] of missing) {
    if (isMissing && chapter > 0) warnings.push(`Chapter ${chapter} (${title}): no ${label} found.`);
  }
  return { title, body };
}

function parseRouting(lines: string[]): GuideBody["routing"] {
  const start = lines.findIndex((line) => /^Lead with this when/i.test(line));
  if (start < 0) return [];
  const rows: GuideBody["routing"] = [];
  for (let index = start + 1; index + 2 < lines.length + 1; index += 3) {
    if (!/^\d+$/.test(lines[index] ?? "")) break;
    rows.push({ chapter: Number(lines[index]), capability: lines[index + 1] ?? "", leadWhen: lines[index + 2] ?? "" });
  }
  return rows;
}

function parseFastTrack(lines: string[]): Map<number, NonNullable<PlaybookBody["fastTrack"]>> {
  const cards = new Map<number, NonNullable<PlaybookBody["fastTrack"]>>();
  let chapter: number | null = null;
  let mode: "pitch" | "ask" | "objection" | null = null;
  let objectionLines: string[] = [];

  const flush = () => {
    if (chapter === null) return;
    const card = cards.get(chapter);
    if (card && objectionLines.length) {
      card.objection = unquote(objectionLines[0]!);
      card.response = unquote(objectionLines.slice(1).join("\n\n"));
    }
    objectionLines = [];
  };

  for (const line of lines) {
    const header = /^CH\s*(\d+)\s+(.+)$/i.exec(line);
    if (header) {
      flush();
      chapter = Number(header[1]);
      cards.set(chapter, { pitch: "", questions: [], objection: "", response: "" });
      mode = null;
      continue;
    }
    if (chapter === null) continue;
    if (/^The Pitch$/i.test(line)) mode = "pitch";
    else if (/^Ask These$/i.test(line)) mode = "ask";
    else if (/^Top Objection$/i.test(line)) mode = "objection";
    else if (mode === "pitch") cards.get(chapter)!.pitch = unquote(line);
    else if (mode === "ask") cards.get(chapter)!.questions.push(unquote(line.replace(/\s*\(.*\)\s*$/, "")));
    else if (mode === "objection") objectionLines.push(line);
  }
  flush();
  return cards;
}

export function parseFieldGuide(raw: string): ParsedGuide {
  const lines = normaliseLines(raw);
  const warnings: string[] = [];

  // Front page: everything before the table of contents.
  const front = lines.slice(0, Math.max(0, lines.findIndex((line) => /^Contents$/i.test(line))) || 12);
  const edition = front.map((line) => /^Edition\s+([\w.]+)/i.exec(line)?.[1]).find(Boolean) ?? "";
  const segmentLine = front.find((line) => /\(([A-Z]{2,})\)$/.test(line)) ?? "";
  const segment = (/\(([A-Z]{2,})\)$/.exec(segmentLine)?.[1] ?? "general").toLowerCase();
  const title = front.find((line) => /guide/i.test(line)) ?? front[0] ?? "Field guide";
  const audience = front.find((line) => /^For\s+/i.test(line)) ?? "";

  // The body starts at the first chapter heading; the table of contents above it repeats titles.
  const start = lines.findIndex((line) => /^CHAPTER \d+$/i.test(line));
  if (start < 0) {
    return {
      title,
      segment,
      segmentLabel: segmentLine,
      edition,
      body: { audience, routing: [], sections: [] },
      playbooks: [],
      warnings: ["No chapters found. Is this a field guide with \"CHAPTER 1\" style headings?"],
    };
  }

  type Block = { kind: "chapter" | "section" | "appendix"; chapter?: number; title: string; lines: string[] };
  const blocks: Block[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]!;
    const chapter = /^CHAPTER (\d+)$/i.exec(line);
    const part = /^Part (One|Two|Three|Four|Five)$/i.exec(line);
    if (chapter) {
      blocks.push({ kind: "chapter", chapter: Number(chapter[1]), title: "", lines: [] });
    } else if (part) {
      const name = lines[index + 1] ?? "";
      blocks.push({ kind: "section", title: `Part ${titleCase(part[1]!)}: ${titleCase(name)}`, lines: [] });
      index += 1;
    } else if (/^(Foreword|Introduction|Conclusion)\b.*:/i.test(line)) {
      blocks.push({ kind: "section", title: line, lines: [] });
    } else if (/^Appendix$/i.test(line)) {
      blocks.push({ kind: "appendix", title: "Appendix", lines: [] });
    } else {
      blocks.at(-1)?.lines.push(line);
    }
  }

  const sections: GuideBody["sections"] = [];
  let routing: GuideBody["routing"] = [];
  let fastTrack = new Map<number, NonNullable<PlaybookBody["fastTrack"]>>();
  const playbooks: ParsedGuide["playbooks"] = [];

  for (const block of blocks) {
    if (block.kind === "appendix") {
      fastTrack = parseFastTrack(block.lines);
    } else if (block.kind === "section") {
      sections.push({ title: block.title, paragraphs: block.lines });
    } else if (block.chapter === 0) {
      routing = parseRouting(block.lines);
      const routingStart = block.lines.findIndex((line) => /^Which Chapter/i.test(line));
      const routingEnd = block.lines.findIndex((line) => /^Two Rules/i.test(line));
      const intro = block.lines.slice(1).filter((_, index) => routingStart < 0 || index + 1 < routingStart || index + 1 >= routingEnd);
      sections.unshift({ title: block.lines[0] ?? "How to use this guide", paragraphs: intro });
    } else {
      const { title: chapterTitle, body } = parseChapter(block.lines, warnings, block.chapter!);
      playbooks.push({ chapter: block.chapter!, slug: slugify(chapterTitle), title: chapterTitle, body });
    }
  }

  for (const playbook of playbooks) {
    playbook.body.fastTrack = fastTrack.get(playbook.chapter) ?? null;
    if (!playbook.body.fastTrack) warnings.push(`Chapter ${playbook.chapter} (${playbook.title}): no Fast Track card found.`);
  }

  return { title, segment, segmentLabel: segmentLine, edition, body: { audience, routing, sections }, playbooks, warnings };
}
