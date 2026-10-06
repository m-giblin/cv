import { describe, expect, it } from "vitest";
import { AI_MODEL_OPTIONS, AI_PRICES_PER_MILLION, DEFAULT_AI_MODELS, estimateAiCostUsd, formatUsd, resolveModelName } from "@/lib/ai/models";

describe("AI model defaults", () => {
  it("defaults xAI to a current model, not grok-3-mini", () => {
    expect(DEFAULT_AI_MODELS.xai).toBe("grok-4.3");
    expect(AI_MODEL_OPTIONS.xai).not.toContain("grok-3-mini");
    expect(AI_MODEL_OPTIONS.xai[0]).toBe(DEFAULT_AI_MODELS.xai);
  });

  it("remaps retired or empty models to the provider default", () => {
    expect(resolveModelName("xai", "grok-3-mini")).toBe("grok-4.3");
    expect(resolveModelName("xai", "grok-beta")).toBe("grok-4.3");
    expect(resolveModelName("xai", "")).toBe("grok-4.3");
    expect(resolveModelName("openai", null)).toBe("gpt-4.1-mini");
  });

  it("keeps a supported model a tenant chose", () => {
    expect(resolveModelName("xai", "grok-4.7")).toBe("grok-4.7");
    expect(resolveModelName("openai", "gpt-4o")).toBe("gpt-4o");
  });
});

describe("AI cost estimates", () => {
  it("prices input and output tokens per million", () => {
    // grok-4.3: $1.25 in, $2.50 out per million tokens.
    expect(estimateAiCostUsd("grok-4.3", 1_000_000, 0)).toBeCloseTo(1.25);
    expect(estimateAiCostUsd("grok-4.3", 400_000, 200_000)).toBeCloseTo(0.5 + 0.5);
    expect(estimateAiCostUsd("grok-4.5", 0, 1_000_000)).toBeCloseTo(6);
  });

  it("prices every selectable model and falls back to the default for unknown ones", () => {
    for (const model of [...AI_MODEL_OPTIONS.xai, ...AI_MODEL_OPTIONS.openai]) {
      expect(AI_PRICES_PER_MILLION[model]).toBeDefined();
    }
    expect(estimateAiCostUsd("mystery-model", 1_000_000, 0)).toBeCloseTo(AI_PRICES_PER_MILLION[DEFAULT_AI_MODELS.xai]!.input);
  });

  it("formats small and large amounts", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.004)).toBe("<$0.01");
    expect(formatUsd(3.456)).toBe("$3.46");
    expect(formatUsd(1234.5)).toBe("$1,235");
  });
});
