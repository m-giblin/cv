import { describe, expect, it } from "vitest";
import { supportSlaStatus } from "@/lib/platform/support-sla";

describe("mission control", () => {
  it("computes SLA breach for old critical tickets", () => {
    const created = new Date();
    created.setHours(created.getHours() - 3);
    const sla = supportSlaStatus(created.toISOString(), "critical", "open", null);
    expect(sla.breached).toBe(true);
  });

  it("mission control migration exists", async () => {
    const fs = await import("fs/promises");
    const sql = await fs.readFile(
      "supabase/migrations/20260811150000_platform_mission_control.sql",
      "utf8",
    );
    expect(sql).toContain("assigned_to");
    expect(sql).toContain("maintenance_mode");
    expect(sql).toContain("operator_reply");
  });

  it("mission control API route exists", async () => {
    const fs = await import("fs/promises");
    const source = await fs.readFile("app/api/platform/mission-control/route.ts", "utf8");
    expect(source).toContain("getMissionControlBundle");
  });

  it("middleware checks maintenance mode", async () => {
    const fs = await import("fs/promises");
    const source = await fs.readFile("middleware.ts", "utf8");
    expect(source).toContain("getTenantMaintenanceState");
  });
});
