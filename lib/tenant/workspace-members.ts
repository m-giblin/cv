/**
 * Who belongs to a workspace (tenant). Ordinary people have one tenant_id. A super admin has no
 * tenant_id but can be a member of several workspaces: home_tenant_id (their default) plus
 * member_tenant_ids (the full list). These helpers keep every "people in this workspace" query
 * and check the same.
 */

export type WorkspaceMemberRow = {
  tenant_id?: string | null;
  home_tenant_id?: string | null;
  member_tenant_ids?: string[] | null;
};

/** PostgREST `or` filter for everyone in a workspace, members included. */
export function workspaceMemberFilter(tenantId: string): string {
  return `tenant_id.eq.${tenantId},home_tenant_id.eq.${tenantId},member_tenant_ids.cs.{${tenantId}}`;
}

/** The same filter before the member_tenant_ids column exists (home workspace only). */
export function legacyWorkspaceMemberFilter(tenantId: string): string {
  return `tenant_id.eq.${tenantId},home_tenant_id.eq.${tenantId}`;
}

/** Every workspace this person belongs to, home first. */
export function workspaceTenantIds(row: WorkspaceMemberRow | null | undefined): string[] {
  if (!row) return [];
  const ids = [row.tenant_id, row.home_tenant_id, ...(row.member_tenant_ids ?? [])].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  return [...new Set(ids)];
}

export function isWorkspaceMember(row: WorkspaceMemberRow | null | undefined, tenantId: string | null | undefined): boolean {
  if (!tenantId) return false;
  return workspaceTenantIds(row).includes(tenantId);
}

/**
 * Clean a requested list of workspaces for saving: unique, and the home workspace is always in it.
 * Returns the home too, cleared when it's no longer one of the workspaces.
 */
export function normalizeWorkspaceMembership(
  memberTenantIds: string[],
  homeTenantId: string | null,
): { memberTenantIds: string[]; homeTenantId: string | null } {
  const members = [...new Set(memberTenantIds.filter(Boolean))];
  if (homeTenantId && !members.includes(homeTenantId)) members.unshift(homeTenantId);
  const home = homeTenantId ?? members[0] ?? null;
  return { memberTenantIds: members, homeTenantId: home };
}
