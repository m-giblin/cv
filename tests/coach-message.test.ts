import { describe, expect, it } from "vitest";
import { splitCoachMessage } from "@/lib/simulations/coach-message";

describe("splitCoachMessage", () => {
  it("splits the block format with blank lines and a divider", () => {
    const parts = splitCoachMessage(
      'IN CHARACTER: It mostly works for our core systems.\n\nPART 2 — COACHING NOTE: 3/10. You missed the coverage idea. Instead try: "That is usually true."\n\n---\n\nNext objection (in character): Look, we can\'t afford a whole platform.',
    );
    expect(parts.reply).toBe("It mostly works for our core systems.");
    expect(parts.score).toEqual({ value: 3, outOf: 10 });
    expect(parts.note).toBe('You missed the coverage idea. Instead try: "That is usually true."');
    expect(parts.nextObjection).toBe("Look, we can't afford a whole platform.");
  });

  it("splits the run-on format", () => {
    const parts = splitCoachMessage(
      "IN CHARACTER: We connect it to roughly 40-50 systems. PART 2 — COACHING NOTE: 6/10. You landed the right idea. --- Next objection (in character): Even if the coverage is incomplete, we still can't afford it.",
    );
    expect(parts.reply).toBe("We connect it to roughly 40-50 systems.");
    expect(parts.score?.value).toBe(6);
    expect(parts.note).toBe("You landed the right idea.");
    expect(parts.nextObjection).toBe("Even if the coverage is incomplete, we still can't afford it.");
  });

  it("leaves ordinary buyer messages alone", () => {
    expect(splitCoachMessage("Hi, I'm Maria Lopez, CISO.")).toEqual({ reply: "Hi, I'm Maria Lopez, CISO.", note: null, score: null, nextObjection: null });
  });
});
