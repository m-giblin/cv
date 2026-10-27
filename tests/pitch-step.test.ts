import { describe, expect, it } from "vitest";
import { sharedPracticeNotice } from "@/lib/mentoring/share-with-mentor";
import {
  isPitchResourceUrl,
  isPitchStep,
  overallPitchScore,
  pitchScenarioFromUrl,
  pitchSnippet,
  pitchStepNotes,
  pitchStudioHref,
  pitchTileSummary,
  readPitchSavedMetadata,
} from "@/lib/pitch/pitch-step";
import { submitReviewerName, uncheckedNote } from "@/lib/plans/step-submit-copy";

const SCENARIO = "d7d5c792-464f-49e6-823a-19101cd19ef8";
const STEP = "0b6d3c8e-2f4a-4c1e-9a77-5c1d2e3f4a5b";

describe("pitch step detection", () => {
  it("treats a content_review step that links to Pitch Studio as a pitch step", () => {
    expect(isPitchStep({ type: "content_review", resourceUrl: `/practice/pitch?scenario=${SCENARIO}` })).toBe(true);
    expect(isPitchStep({ type: "content_review", resourceUrl: "/practice/pitch" })).toBe(true);
  });

  it("leaves reading steps and other step types alone", () => {
    expect(isPitchStep({ type: "content_review", resourceUrl: "/learn/library/abc" })).toBe(false);
    expect(isPitchStep({ type: "content_review", resourceUrl: "/practice/pitchy" })).toBe(false);
    expect(isPitchStep({ type: "content_review" })).toBe(false);
    expect(isPitchStep({ type: "simulation", resourceUrl: `/practice/pitch?scenario=${SCENARIO}` })).toBe(false);
    expect(isPitchResourceUrl(null)).toBe(false);
  });

  it("reads the scenario and builds the Pitch Studio link with the assignment step", () => {
    expect(pitchScenarioFromUrl(`/practice/pitch?scenario=${SCENARIO}`)).toBe(SCENARIO);
    expect(pitchScenarioFromUrl("/practice/pitch")).toBeNull();
    expect(pitchStudioHref({ resourceUrl: `/practice/pitch?scenario=${SCENARIO}`, assignmentStepId: STEP })).toBe(
      `/practice/pitch?scenario=${SCENARIO}&step=${STEP}`,
    );
    expect(pitchStudioHref({ resourceUrl: "/practice/pitch" })).toBe("/practice/pitch");
  });
});

describe("pitch scoring and summaries", () => {
  it("averages the rubric rows into one score", () => {
    expect(overallPitchScore([{ label: "a", score: 70 }, { label: "b", score: 80 }, { label: "c", score: 76 }])).toBe(75);
    expect(overallPitchScore([])).toBeNull();
    expect(overallPitchScore(null)).toBeNull();
    expect(overallPitchScore([{ label: "a" }])).toBeNull();
  });

  it("clips long pitches to a snippet", () => {
    expect(pitchSnippet("one two three", 5)).toBe("one two three");
    expect(pitchSnippet("one two three four", 2)).toBe("one two…");
    expect(pitchSnippet(null)).toBe("");
  });

  it("uses the reflection as step notes, or says what was done", () => {
    expect(pitchStepNotes({ reflection: "  I'd lead with the audit finding. ", score: 75, responseMode: "text" })).toBe(
      "I'd lead with the audit finding.",
    );
    expect(pitchStepNotes({ score: 75, responseMode: "text" })).toBe("Typed in Pitch Studio, AI score 75.");
    expect(pitchStepNotes({ score: null, responseMode: "voice" })).toBe("Recorded (voice) in Pitch Studio, not scored yet.");
  });

  it("reads the step link from activity metadata", () => {
    expect(readPitchSavedMetadata({ practiceSessionId: "p1", assignmentStepId: STEP, score: 75, submitted: true, coachingNote: "Lead with pain" })).toEqual({
      practiceSessionId: "p1",
      assignmentStepId: STEP,
      score: 75,
      coachingNote: "Lead with pain",
      submitted: true,
    });
    expect(readPitchSavedMetadata(null)).toEqual({ practiceSessionId: null, assignmentStepId: null, score: null, coachingNote: null, submitted: false });
  });

  it("counts typed pitches on the Practice hub tile", () => {
    expect(pitchTileSummary(0, null)).toBe("No pitches yet");
    expect(pitchTileSummary(1, "Oct 27")).toBe("1 pitch saved, last Oct 27");
    expect(pitchTileSummary(3, null)).toBe("3 pitches saved");
  });
});

describe("step submit copy", () => {
  it("names the mentor as the reviewer, and the manager for gates", () => {
    expect(submitReviewerName({ mentorName: "Matt Giblin" })).toBe("Matt Giblin");
    expect(submitReviewerName({ mentorName: "Matt Giblin", isSegmentGate: true })).toBe("your manager");
    expect(submitReviewerName({})).toBe("your manager");
  });

  it("notes unticked boxes without blocking", () => {
    expect(uncheckedNote(2, 3, "Matt Giblin")).toMatch(/^2 of 3 checked\. You can still submit; Matt Giblin/);
    expect(uncheckedNote(0, 3, "your manager")).toMatch(/Your manager sees/);
  });
});

describe("share with mentor", () => {
  it("writes the notification with the score and a quote", () => {
    expect(sharedPracticeNotice({ menteeName: "Steve Rogers", kind: "pitch", title: "The Atlas story", score: 75, snippet: "Identity is" })).toEqual({
      title: "Steve shared a pitch with you",
      body: 'The Atlas story, AI score 75. "Identity is"',
    });
    expect(sharedPracticeNotice({ menteeName: "", kind: "simulation", title: "CISO call", score: null }).title).toBe(
      "Your mentee shared a simulation with you",
    );
  });
});
