import "server-only";

import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_TTL_DAYS } from "@/lib/tenant/tenants";
import type { TenantAdminInvite } from "@/lib/tenant/types";

type InviteRow = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  last_sent_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
};

function mapInvite(row: InviteRow): TenantAdminInvite {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    status: row.status as TenantAdminInvite["status"],
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    lastSentAt: row.last_sent_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
  };
}

/** Flip any pending invites whose expires_at has passed to "revoked". */
export async function expirePendingInvites(tenantId?: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  let query = admin
    .from("tenant_admin_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("expirePendingInvites failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function revokeTenantInvite(
  inviteId: string,
  actorId: string,
): Promise<TenantAdminInvite> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data: existing, error: fetchError } = await admin
    .from("tenant_admin_invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (fetchError || !existing) throw new Error("Invite not found");
  if (existing.status === "accepted") {
    throw new Error("Cannot revoke an invite that has already been accepted.");
  }

  const { data, error } = await admin
    .from("tenant_admin_invites")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: actorId,
    })
    .eq("id", inviteId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to revoke invite");

  await logAuditEvent(actorId, {
    action: "tenant.admin_invite_revoked",
    targetType: "tenant_admin_invite",
    targetId: inviteId,
    tenantId: data.tenant_id,
    details: { email: data.email },
  });

  return mapInvite(data as InviteRow);
}

export async function resendTenantInvite(
  inviteId: string,
  actorId: string,
): Promise<TenantAdminInvite> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data: existing, error: fetchError } = await admin
    .from("tenant_admin_invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (fetchError || !existing) throw new Error("Invite not found");
  if (existing.status === "accepted") {
    throw new Error("Invite has already been accepted.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error: sendError } = await admin.auth.resetPasswordForEmail(existing.email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  if (sendError) throw new Error(sendError.message);

  const { data, error } = await admin
    .from("tenant_admin_invites")
    .update({
      status: "pending",
      last_sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
      revoked_by: null,
    })
    .eq("id", inviteId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to resend invite");

  await logAuditEvent(actorId, {
    action: "tenant.admin_invite_resent",
    targetType: "tenant_admin_invite",
    targetId: inviteId,
    tenantId: data.tenant_id,
    details: { email: data.email },
  });

  return mapInvite(data as InviteRow);
}
