import type { SimulationAssignment } from "@/lib/types";
import { LEGACY_SIMULATION_START_MESSAGE, SIMULATION_START_MESSAGE } from "@/lib/simulations/prompt-template";

type TranscriptEntry = SimulationAssignment["transcript"][number];

/** The buyer's visible identity. Everything else on the card (fear, priority, opening move) stays hidden. */
export type PersonaCard = { name: string; title: string | null; org: string | null };

const BEGINS_MARKER = /\**\s*-{2,}\s*ROLEPLAY BEGINS\s*-{2,}\s*\**/i;
const CARD_HEADING = /^\s*[#*\s]*(?:STEP\s*1\s*[—–-]+\s*)?PERSONA CARD\b/i;
/** Labels the AI uses on the card. Only these lines are dropped when there is no ROLEPLAY BEGINS marker. */
const CARD_FIELD =
  /^\s*[-*\s]*(name|title|org(?:anization|anisation)?(?: type)?|top priority[^:]*|attitude[^:]*|secret fear|opening move|background|personality|current stack|hot buttons|trigger phrase|role|step\s*\d[^:]*)\s*\**\s*:/i;
const STEP_LINE = /^\s*[#*\s]*STEP\s*\d\b.*$/i;

function plain(text: string) {
  return text.replace(/\*\*/g, "").replace(/__/g, "").trim();
}

/** Reads name, title and org from a printed persona card, in any of the shapes the AI has used. */
export function parsePersonaCard(text: string): PersonaCard | null {
  const head = text.split(BEGINS_MARKER)[0] ?? text;
  // Short form the current prompt asks for: "PERSONA: Name | Title | Org type".
  const short = /^\s*\**\s*PERSONA\s*\**\s*:\s*\**\s*(.+)$/im.exec(head);
  if (short && !/\b(?:Name|Title)\s*:/i.test(short[1]!)) {
    const [name, title, org] = plain(short[1]!).split("|").map((part) => part.trim());
    return name ? { name, title: title || null, org: org || null } : null;
  }

  const fields = new Map<string, string>();
  for (const segment of plain(head).split(/\s*\|\s*|\n/)) {
    const match = /^\s*[-*\s]*([A-Za-z][A-Za-z /&]*?)\s*:\s*(.+?)\s*$/.exec(segment);
    if (match) fields.set(match[1]!.toLowerCase(), match[2]!);
  }
  const name = fields.get("name");
  if (!name) return null;
  const org = fields.get("org type") ?? fields.get("org") ?? fields.get("organization") ?? fields.get("organisation") ?? null;
  return { name, title: fields.get("title") ?? null, org };
}

/** "Marcus Hale, CISO, State agency" for the persona panel and chat header. */
export function personaCardLabel(card: PersonaCard): string {
  const parts = [card.name, card.title];
  if (card.org && !(card.title ?? "").toLowerCase().includes(card.org.toLowerCase())) parts.push(card.org);
  return parts.filter(Boolean).join(", ");
}

/**
 * The persona's first message, minus the card the AI printed before the roleplay.
 * Keeps only what the buyer says after "--- ROLEPLAY BEGINS ---". Without the marker, drops a
 * leading "STEP 1 — PERSONA CARD" block line by line. Hidden fields never reach the learner.
 */
export function stripPersonaCard(text: string): string {
  const marker = BEGINS_MARKER.exec(text);
  if (marker) {
    const after = text.slice(marker.index + marker[0].length).trim();
    if (after) return after;
    return openingMoveFallback(text) ?? "";
  }

  const lines = text.split("\n");
  const looksLikeCard =
    CARD_HEADING.test(lines[0] ?? "") || /^\s*\**\s*PERSONA\s*\**\s*:/i.test(lines[0] ?? "") || /^\s*\**\s*Name\s*\**\s*:/i.test(lines[0] ?? "");
  if (!looksLikeCard) return text;

  let lastCardLine = 0;
  lines.forEach((line, index) => {
    if (CARD_HEADING.test(line) || CARD_FIELD.test(line) || STEP_LINE.test(line) || /^\s*\**\s*PERSONA\s*\**\s*:/i.test(line)) {
      lastCardLine = index;
    }
  });
  const rest = lines.slice(lastCardLine + 1).join("\n").trim();
  return rest || openingMoveFallback(text) || "";
}

/** When the AI printed only the card, its Opening Move is the line the buyer would have said. */
function openingMoveFallback(text: string): string | null {
  const match = /Opening Move\s*\**\s*:\s*\**\s*(.+?)\s*(?:\||\n|$)/i.exec(text);
  if (!match) return null;
  return plain(match[1]!).replace(/^["“]|["”]$/g, "").trim() || null;
}

/** True when a message still carries a printed persona card. */
export function hasPersonaCard(text: string): boolean {
  return stripPersonaCard(text) !== text;
}

/** Transcript ready to show: the first persona message loses its card. Later turns are untouched. */
export function transcriptForDisplay(transcript: TranscriptEntry[]): TranscriptEntry[] {
  const first = transcript[0];
  if (!first || first.speaker === "se" || !hasPersonaCard(first.message)) return transcript;
  return [{ ...first, message: stripPersonaCard(first.message) }, ...transcript.slice(1)];
}

/**
 * What the session view needs before it opens: the transcript without the card, the buyer's
 * name and title in place of "Dynamic (AI-generated buyer)", and the current opening instruction
 * for runs created when the start message still asked the AI to print the full card.
 */
export function assignmentForSession(
  assignment: SimulationAssignment,
  storedTranscript: TranscriptEntry[] | null,
): SimulationAssignment {
  const raw = storedTranscript ?? assignment.transcript ?? [];
  const firstPersona = raw[0] && raw[0].speaker !== "se" ? raw[0].message : null;
  const card = firstPersona ? parsePersonaCard(firstPersona) : null;
  const printsCard = Boolean(assignment.promptSnapshot?.includes("STEP 1 — PERSONA CARD"));
  const startMessage =
    assignment.startMessage === LEGACY_SIMULATION_START_MESSAGE || (!assignment.startMessage && printsCard)
      ? SIMULATION_START_MESSAGE
      : assignment.startMessage;

  return {
    ...assignment,
    transcript: transcriptForDisplay(raw),
    persona: card ? personaCardLabel(card) : assignment.persona,
    ...(startMessage ? { startMessage } : {}),
  };
}
