import { describe, expect, it } from "vitest";
import { firstOverlap } from "@/lib/manager/one-on-ones";
import { applyNotificationsRead } from "@/lib/notifications/read-events";
import { isObjectionPractice, withNewHireEasyMode } from "@/lib/simulations/new-hire-practice";
import type { Notification } from "@/lib/types";

describe("firstOverlap", () => {
  const booked = [
    { userId: "susan", actorId: "kathy", start: "2026-10-29T14:00:00.000Z", minutes: 30, label: "Thu 10:00", mentorId: "matt" },
  ];
  it("finds a 1:1 at the same time", () => {
    expect(firstOverlap(booked, "2026-10-29T14:00:00.000Z", 30)?.userId).toBe("susan");
  });
  it("finds a partial overlap", () => {
    expect(firstOverlap(booked, "2026-10-29T14:15:00.000Z", 30)?.userId).toBe("susan");
  });
  it("lets back-to-back 1:1s through", () => {
    expect(firstOverlap(booked, "2026-10-29T14:30:00.000Z", 30)).toBeNull();
    expect(firstOverlap(booked, "2026-10-29T13:30:00.000Z", 30)).toBeNull();
  });
});

describe("new hire objection practice", () => {
  it("treats objection drills as objection practice, not discovery calls that mention objections", () => {
    expect(isObjectionPractice('Objection-handling drill. OBJECTION TO PRACTICE: "x". Debrief on objection handling only.')).toBe(true);
    expect(isObjectionPractice("Run a discovery call. Raise an objection if the rep pitches too early. Note any objection.")).toBe(false);
  });
  it("adds the easy override once", () => {
    const once = withNewHireEasyMode("Stay in character as a skeptical buyer. Push back twice.");
    expect(once).toContain("DIFFICULTY OVERRIDE: EASY");
    expect(once).toContain("Push back at most once");
    expect(withNewHireEasyMode(once)).toBe(once);
  });
});

describe("applyNotificationsRead", () => {
  const item = (id: string, actionUrl: string): Notification =>
    ({ id, userId: "kathy", title: id, body: "", actionUrl, readAt: null, createdAt: "2026-10-28T00:00:00Z" }) as Notification;
  const items = [item("a", "/manager/inbox"), item("b", "/manager?profile=1"), item("c", "/manager/inbox?x=1")];

  it("marks only the Inbox's notices when given its prefix", () => {
    const read = applyNotificationsRead(items, { actionUrlPrefix: "/manager/inbox" });
    expect(read.filter((row) => row.readAt).map((row) => row.id)).toEqual(["a", "c"]);
  });
  it("marks one by id, or all", () => {
    expect(applyNotificationsRead(items, { ids: ["b"] }).filter((row) => row.readAt).map((row) => row.id)).toEqual(["b"]);
    expect(applyNotificationsRead(items, { all: true }).every((row) => row.readAt)).toBe(true);
  });
});
