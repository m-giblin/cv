/** Shortest step evidence the workbench lets an SE submit: about a sentence. */
export const MIN_EVIDENCE_CHARS = 10;

/** Who reviews a submitted step, as the submit toast names them. Gates go to the manager. */
export function submitReviewerName(input: { isSegmentGate?: boolean; mentorName?: string | null }): string {
  if (input.isSegmentGate) return "your manager";
  return input.mentorName?.trim() || "your manager";
}

/** The gentle note when some Done-when boxes are unticked at submit. Never a block. */
export function uncheckedNote(checked: number, total: number, reviewer: string): string {
  const who = reviewer === "your manager" ? "Your manager" : reviewer;
  return `${checked} of ${total} checked. You can still submit; ${who} sees your evidence either way and can send it back if something's missing.`;
}
