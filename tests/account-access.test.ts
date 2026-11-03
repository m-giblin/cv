import { describe, expect, it } from "vitest";
import {
  ACTIVATION_MAX_ATTEMPTS,
  checkActivation,
  newActivation,
  newActivationCode,
  newTemporaryPassword,
  normalizeActivationCode,
  passwordProblem,
} from "@/lib/auth/account-access";
import { isApiRoutePublic } from "@/lib/auth/api-route-policy";
import { allowedBeforePasswordChange, isPublicApiRoute } from "@/lib/auth/routes";

// Codes are hashed with the server secret; tests use a stand-in.
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-secret";

describe("activation codes", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");

  it("are eight digits shown as two groups", () => {
    for (let i = 0; i < 20; i += 1) expect(newActivationCode()).toMatch(/^\d{4}-\d{4}$/);
  });

  it("accept the code however it's typed, only for the person it was issued to", () => {
    const { code, state } = newActivation("user-1", now);
    expect(checkActivation(state, "user-1", code, now)).toBe("ok");
    expect(checkActivation(state, "user-1", code.replace("-", " "), now)).toBe("ok");
    expect(checkActivation(state, "user-1", normalizeActivationCode(code), now)).toBe("ok");
    expect(checkActivation(state, "user-2", code, now)).toBe("wrong");
    expect(checkActivation(state, "user-1", "0000-0000", now)).not.toBe("ok");
  });

  it("expire after three days and lock after too many wrong tries", () => {
    const { code, state } = newActivation("user-1", now);
    expect(checkActivation(state, "user-1", code, now + 71 * 3_600_000)).toBe("ok");
    expect(checkActivation(state, "user-1", code, now + 73 * 3_600_000)).toBe("expired");
    expect(checkActivation({ ...state, attempts: ACTIVATION_MAX_ATTEMPTS }, "user-1", code, now)).toBe("locked");
    expect(checkActivation(null, "user-1", code, now)).toBe("missing");
  });

  it("are never stored as the code itself", () => {
    const { code, state } = newActivation("user-1", now);
    expect(state.hash).not.toContain(normalizeActivationCode(code));
  });
});

describe("passwords", () => {
  it("makes temporary passwords that pass the rules", () => {
    const password = newTemporaryPassword();
    expect(passwordProblem(password)).toBeNull();
    expect(password).not.toBe(newTemporaryPassword());
  });

  it("asks for at least eight characters", () => {
    expect(passwordProblem("short")).toMatch(/8/);
    expect(passwordProblem("long enough")).toBeNull();
  });
});

describe("sign-in rules", () => {
  it("lets anyone reach the activation endpoint", () => {
    expect(isPublicApiRoute("/api/auth/activate")).toBe(true);
    expect(isApiRoutePublic("/api/auth/activate")).toBe(true);
    expect(isApiRoutePublic("/api/account/password")).toBe(false);
  });

  it("keeps someone on a temporary password on the set-password page", () => {
    expect(allowedBeforePasswordChange("/account/change-password")).toBe(true);
    expect(allowedBeforePasswordChange("/api/account/password")).toBe(true);
    expect(allowedBeforePasswordChange("/auth/signout")).toBe(true);
    expect(allowedBeforePasswordChange("/dashboard")).toBe(false);
    expect(allowedBeforePasswordChange("/api/admin/users")).toBe(false);
  });
});
