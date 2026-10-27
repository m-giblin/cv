import { describe, expect, it } from "vitest";
import { isPublicHttpUrl } from "@/lib/security/public-url";

describe("isPublicHttpUrl", () => {
  it("accepts public http(s) hosts", () => {
    expect(isPublicHttpUrl("https://documentation.sailpoint.com/x")).toBe(true);
    expect(isPublicHttpUrl("http://example.com")).toBe(true);
  });
  it("rejects internal, metadata and non-http targets", () => {
    for (const url of ["http://localhost:3000", "http://127.0.0.1", "http://169.254.169.254/latest", "http://10.0.0.5", "http://192.168.1.1", "http://172.20.1.1", "http://[::1]/", "http://db.internal/", "file:///etc/passwd", "ftp://example.com", "not a url"]) {
      expect(isPublicHttpUrl(url), url).toBe(false);
    }
  });
});
