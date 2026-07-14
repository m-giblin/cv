import type { SEProfile } from "../types";

export function buildMailto(se: SEProfile, noteText: string): string {
  const subject = encodeURIComponent(
    `Coaching session notes — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  );
  const body = encodeURIComponent(
    `Hi ${se.name},\n\nHere are notes from our coaching session today:\n\n${noteText.trim()}\n\nLet me know if you have any questions.\n\nThanks`,
  );
  return `mailto:${se.email || ""}?subject=${subject}&body=${body}`;
}
