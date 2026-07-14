import { describe, expect, it } from "vitest";
import { guessMimeType, resolveUploadContentType } from "@/lib/forge/attachments";

describe("forge attachments", () => {
  it("guesses MIME types from file extensions", () => {
    expect(guessMimeType("screenshot.png")).toBe("image/png");
    expect(guessMimeType("photo.JPG")).toBe("image/jpeg");
    expect(guessMimeType("notes.pdf")).toBe("application/pdf");
  });

  it("falls back to extension when blob type is empty", () => {
    const blob = new Blob(["x"], { type: "" });
    expect(resolveUploadContentType(blob, "capture.webp")).toBe("image/webp");
  });

  it("prefers explicit blob type when present", () => {
    const blob = new Blob(["x"], { type: "image/png" });
    expect(resolveUploadContentType(blob, "file.bin")).toBe("image/png");
  });
});
