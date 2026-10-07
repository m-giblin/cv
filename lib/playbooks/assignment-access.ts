import { getAccessTier } from "@/lib/auth/rbac";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { ProfileRole } from "@/lib/types";

export type AssignablePerson = { id: string; name: string; role: ProfileRole };

/**
 * People a viewer may assign playbooks to (and whose progress they may see): admins and operators
 * reach everyone in the tenant; managers reach everyone in their reporting line, at any depth.
 */
export async function loadAssignablePeople(tenantId: string, viewerId: string, viewerRole: ProfileRole): Promise<AssignablePerson[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("id, full_name, role, manager_id").eq("tenant_id", tenantId).order("full_name");
  const profiles = (data ?? []) as { id: string; full_name: string; role: ProfileRole; manager_id: string | null }[];
  const others = profiles.filter((profile) => profile.id !== viewerId);

  const tier = getAccessTier(viewerRole);
  const wholeTenant = tier === "admin" || tier === "super_admin";
  const managerOf = new Map(profiles.map((profile) => [profile.id, profile.manager_id]));
  const reportsTo = (personId: string) => {
    const seen = new Set<string>();
    let current = managerOf.get(personId) ?? null;
    while (current && !seen.has(current)) {
      if (current === viewerId) return true;
      seen.add(current);
      current = managerOf.get(current) ?? null;
    }
    return false;
  };

  return others
    .filter((profile) => wholeTenant || reportsTo(profile.id))
    .map((profile) => ({ id: profile.id, name: profile.full_name, role: profile.role }));
}
