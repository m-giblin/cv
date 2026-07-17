import { describe, expect, it } from "vitest";
import { resolveEffectiveAccess } from "@/lib/auth/shadow-tenant";
import {
  defaultHatsForRole,
  enterModeForWorkspaceHat,
  pathRequiresWorkspaceHat,
  pickDefaultWorkspace,
  resolveActiveWorkspace,
  resolveSessionWorkspaceHats,
  resolveWorkspaceHats,
} from "@/lib/auth/workspace";

describe("workspace hats", () => {
  it("gives super admin platform only by default", () => {
    expect(defaultHatsForRole("super_admin")).toEqual(["platform"]);
  });

  it("gives managers manager + user hats", () => {
    expect(defaultHatsForRole("manager")).toEqual(["manager", "se"]);
  });

  it("gives plain users only the user hat", () => {
    expect(defaultHatsForRole("basic_se")).toEqual(["se"]);
  });

  it("gives tenant admin manager and user hats", () => {
    expect(defaultHatsForRole("admin")).toEqual(["tenant_admin", "manager", "se"]);
  });

  it("respects stored multi-hat designations", () => {
    expect(
      resolveWorkspaceHats("super_admin", ["platform", "tenant_admin", "manager"]),
    ).toEqual(["platform", "tenant_admin", "manager"]);
  });

  it("expands hats by enter mode", () => {
    expect(
      resolveSessionWorkspaceHats("super_admin", null, {
        enteredTenant: true,
        enterMode: "admin",
      }),
    ).toEqual(["platform", "tenant_admin", "manager", "se"]);

    expect(
      resolveSessionWorkspaceHats("super_admin", null, {
        enteredTenant: true,
        enterMode: "manager",
      }),
    ).toEqual(["platform", "manager", "se"]);

    expect(
      resolveSessionWorkspaceHats("super_admin", null, {
        enteredTenant: true,
        enterMode: "se",
      }),
    ).toEqual(["platform", "se"]);
  });

  it("maps hats to enter modes", () => {
    expect(enterModeForWorkspaceHat("tenant_admin")).toBe("admin");
    expect(enterModeForWorkspaceHat("manager")).toBe("manager");
    expect(enterModeForWorkspaceHat("se")).toBe("se");
    expect(enterModeForWorkspaceHat("platform")).toBeNull();
  });

  it("resolves manager enter mode to manager tier", () => {
    const access = resolveEffectiveAccess(
      "super_admin",
      null,
      "00000000-0000-4000-8000-000000000099",
      "Acme",
      "manager",
    );
    expect(access.tier).toBe("manager");
    expect(access.shadowMode).toBe("manager");
  });

  it("lets path select Super Admin even while entered into a tenant", () => {
    expect(
      resolveActiveWorkspace({
        hats: ["platform", "manager", "se"],
        cookieValue: "manager",
        pathname: "/platform",
        shadowMode: "manager",
      }),
    ).toBe("platform");
  });

  it("defaults to manager when entered as manager without a matching path", () => {
    expect(
      resolveActiveWorkspace({
        hats: ["platform", "manager", "se"],
        cookieValue: null,
        shadowMode: "manager",
      }),
    ).toBe("manager");
  });

  it("picks platform as default when available", () => {
    expect(pickDefaultWorkspace(["se", "platform", "manager"])).toBe("platform");
  });

  it("requires platform hat for /platform", () => {
    expect(pathRequiresWorkspaceHat("/platform")).toBe("platform");
    expect(pathRequiresWorkspaceHat("/admin?tab=users")).toBe("tenant_admin");
    expect(pathRequiresWorkspaceHat("/manager?section=program")).toBe("manager");
  });
});
