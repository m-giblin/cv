import { describe, expect, it } from "vitest";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODELS, resolveModelName } from "@/lib/ai/models";

describe("AI model defaults", () => {
  it("defaults xAI to a current model, not grok-3-mini", () => {
    expect(DEFAULT_AI_MODELS.xai).toBe("grok-4.5");
    expect(AI_MODEL_OPTIONS.xai).not.toContain("grok-3-mini");
    expect(AI_MODEL_OPTIONS.xai[0]).toBe(DEFAULT_AI_MODELS.xai);
  });

  it("remaps retired or empty models to the provider default", () => {
    expect(resolveModelName("xai", "grok-3-mini")).toBe("grok-4.5");
    expect(resolveModelName("xai", "grok-beta")).toBe("grok-4.5");
    expect(resolveModelName("xai", "")).toBe("grok-4.5");
    expect(resolveModelName("openai", null)).toBe("gpt-4.1-mini");
  });

  it("keeps a supported model a tenant chose", () => {
    expect(resolveModelName("xai", "grok-4.7")).toBe("grok-4.7");
    expect(resolveModelName("openai", "gpt-4o")).toBe("gpt-4o");
  });
});
