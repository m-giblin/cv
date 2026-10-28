import { describe, expect, it } from "vitest";
import { sharedRef } from "@/lib/mentoring/shared-practice";

describe("sharedRef", () => {
  it("links a shared simulation by its coaching card and a pitch by its session", () => {
    expect(sharedRef({ event_type: "simulation_shared_with_mentor", metadata: { coachingCardId: "c1" } })).toBe("sim:c1");
    expect(sharedRef({ event_type: "pitch_shared_with_mentor", metadata: { practiceSessionId: "p1" } })).toBe("pitch:p1");
  });

  it("ignores rows without a reference", () => {
    expect(sharedRef({ event_type: "simulation_shared_with_mentor", metadata: {} })).toBeNull();
    expect(sharedRef({ event_type: "manager_feedback_received", metadata: { coachingCardId: "c1" } })).toBeNull();
  });
});
