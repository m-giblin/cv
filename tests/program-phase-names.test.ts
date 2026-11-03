import { describe, expect, it } from "vitest";
import { resolvePhaseNames, SEGMENT_NAMES } from "@/lib/admin/plan-builder";
import { phaseNamesForStorage } from "@/lib/plans/template-step-schema";
import { programPhases } from "@/lib/programs/program-model";

describe("program phase names", () => {
  it("use the program's own names and fall back to the defaults", () => {
    expect(resolvePhaseNames(null)).toEqual([...SEGMENT_NAMES]);
    expect(resolvePhaseNames(["Platform deep-dive", null, " ", "Sign-off"])).toEqual([
      "Platform deep-dive",
      "Field skills",
      "Advisory readiness",
      "Sign-off",
    ]);
  });

  it("drop the default description under a custom name", () => {
    const phases = programPhases({ phase_names: ["Platform deep-dive", null, null, null] });
    expect(phases[0]).toMatchObject({ name: "Platform deep-dive", summary: "" });
    expect(phases[1]!.summary).not.toBe("");
  });

  it("store only names that differ from the defaults", () => {
    expect(phaseNamesForStorage(undefined, SEGMENT_NAMES)).toBeNull();
    expect(phaseNamesForStorage(["", "Field skills", "", ""], SEGMENT_NAMES)).toBeNull();
    expect(phaseNamesForStorage(["Platform deep-dive", "", "", ""], SEGMENT_NAMES)).toEqual(["Platform deep-dive", null, null, null]);
  });
});
