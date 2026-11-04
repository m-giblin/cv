import { describe, expect, it } from "vitest";
import {
  isWorkspaceMember,
  normalizeWorkspaceMembership,
  workspaceMemberFilter,
  workspaceTenantIds,
} from "@/lib/tenant/workspace-members";
import { viewerTenantId } from "@/lib/mentoring/mentor-records";

const A = "a0d586aa-dcd4-401f-bf74-4966b0b5f385";
const S = "00000000-0000-4000-8000-000000000001";

describe("workspace membership", () => {
  it("counts tenant, home and extra workspaces, home first, no duplicates", () => {
    expect(workspaceTenantIds({ tenant_id: null, home_tenant_id: S, member_tenant_ids: [S, A] })).toEqual([S, A]);
    expect(workspaceTenantIds({ tenant_id: A })).toEqual([A]);
    expect(workspaceTenantIds(null)).toEqual([]);
  });

  it("knows who is in a workspace", () => {
    const superAdmin = { tenant_id: null, home_tenant_id: S, member_tenant_ids: [S, A] };
    expect(isWorkspaceMember(superAdmin, A)).toBe(true);
    expect(isWorkspaceMember(superAdmin, "11111111-1111-4111-8111-111111111111")).toBe(false);
    expect(isWorkspaceMember(superAdmin, null)).toBe(false);
  });

  it("builds a filter that matches members as well as the tenant's own people", () => {
    expect(workspaceMemberFilter(A)).toBe(`tenant_id.eq.${A},home_tenant_id.eq.${A},member_tenant_ids.cs.{${A}}`);
  });

  it("always keeps the default workspace in the list", () => {
    expect(normalizeWorkspaceMembership([A, A], S)).toEqual({ memberTenantIds: [S, A], homeTenantId: S });
    expect(normalizeWorkspaceMembership([A], null)).toEqual({ memberTenantIds: [A], homeTenantId: A });
    expect(normalizeWorkspaceMembership([], null)).toEqual({ memberTenantIds: [], homeTenantId: null });
  });

  it("uses the workspace a super admin is in for mentoring, if they belong to it", () => {
    const viewer = { role: "super_admin", tenant_id: null, home_tenant_id: S, member_tenant_ids: [S, A] };
    expect(viewerTenantId(viewer, A)).toBe(A);
    expect(viewerTenantId(viewer, "11111111-1111-4111-8111-111111111111")).toBe(S);
    expect(viewerTenantId(viewer)).toBe(S);
    expect(viewerTenantId({ role: "manager", tenant_id: A }, S)).toBe(A);
  });
});
