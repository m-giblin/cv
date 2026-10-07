/**
 * Objection-practice turns come back as one block: the buyer's in-character reply, a
 * "PART 2 — COACHING NOTE: 6/10. …" note, then "--- Next objection (in character): …".
 * Split it so the chat shows only what the buyer says and the coaching goes to the side rail.
 */
export type CoachMessageParts = {
  /** What the buyer says back (in character). */
  reply: string;
  /** The coaching note, without its score. */
  note: string | null;
  /** "3/10" style score from the note. */
  score: { value: number; outOf: number } | null;
  /** The buyer's next objection (in character). */
  nextObjection: string | null;
};

const NOTE_MARKER = /\bPART\s*2\s*[—–-]+\s*COACHING NOTE\s*:?/i;

function clean(text: string) {
  return text
    .replace(/^\s*(?:PART\s*1\s*[—–-]+\s*)?IN CHARACTER\s*:\s*/i, "")
    .replace(/^\s*-{3,}\s*/, "")
    .replace(/\s*-{3,}\s*$/, "")
    .trim();
}

export function splitCoachMessage(message: string): CoachMessageParts {
  const noteAt = message.search(NOTE_MARKER);
  if (noteAt === -1) return { reply: clean(message), note: null, score: null, nextObjection: null };

  const reply = clean(message.slice(0, noteAt));
  let rest = message.slice(noteAt).replace(NOTE_MARKER, "");
  let nextObjection: string | null = null;
  const nextAt = rest.search(/\bNext objection\s*\(in character\)\s*:/i);
  if (nextAt !== -1) {
    nextObjection = clean(rest.slice(nextAt).replace(/^\s*Next objection\s*\(in character\)\s*:\s*/i, ""));
    rest = rest.slice(0, nextAt);
  } else {
    const dashAt = rest.search(/\s-{3,}\s/);
    if (dashAt !== -1) {
      nextObjection = clean(rest.slice(dashAt)) || null;
      rest = rest.slice(0, dashAt);
    }
  }

  const scoreMatch = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\.?\s*/.exec(rest);
  const score = scoreMatch ? { value: Number(scoreMatch[1]), outOf: Number(scoreMatch[2]) } : null;
  const note = clean(scoreMatch ? rest.slice(scoreMatch[0].length) : rest) || null;
  return { reply, note, score, nextObjection: nextObjection || null };
}
