import { describe, expect, it } from "vitest";
import { getSubtree } from "@/lib/demo-data";
import type { Profile } from "@/lib/types";

describe("getSubtree", () => {
  it("stops when two people manage each other", () => {
    const people = [
      { id: "a", managerId: "b" },
      { id: "b", managerId: "a" },
    ] as unknown as Profile[];
    expect(getSubtree("a", people).map((person) => person.id)).toEqual(["b"]);
  });
});
