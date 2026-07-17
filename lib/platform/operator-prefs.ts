import "server-only";

import { logAuditEvent } from "@/lib/audit/log-admin-action";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OperatorNotificationPrefs } from "@/lib/tenant/types";

type PrefsRow = {
  user_id: string;
  email_on_critical_support: boolean;
  email_on_new_tenant: boolean;
  email_digest_hours: number;
  channels: unknown;
  updated_at: string;
};

function mapPrefs(row: PrefsRow): OperatorNotificationPrefs {
  return {
    userId: row.user_id,
    emailOnCriticalSupport: row.email_on_critical_support,
    emailOnNewTenant: row.email_on_new_tenant,
    emailDigestHours: row.email_digest_hours,
    channels: (row.channels ?? {}) as Record<string, unknown>,
    updatedAt: row.updated_at,
  };
}

function defaultPrefs(userId: string): OperatorNotificationPrefs {
  return {
    userId,
    emailOnCriticalSupport: true,
    emailOnNewTenant: true,
    emailDigestHours: 24,
    channels: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export async function getOperatorNotificationPrefs(
  userId: string,
): Promise<OperatorNotificationPrefs> {
  const admin = createAdminClient();
  if (!admin) return defaultPrefs(userId);

  const { data } = await admin
    .from("operator_notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data ? mapPrefs(data as PrefsRow) : defaultPrefs(userId);
}

export type UpdateOperatorNotificationPrefsInput = {
  emailOnCriticalSupport?: boolean;
  emailOnNewTenant?: boolean;
  emailDigestHours?: number;
  channels?: Record<string, unknown>;
};

export async function updateOperatorNotificationPrefs(
  userId: string,
  input: UpdateOperatorNotificationPrefsInput,
): Promise<OperatorNotificationPrefs> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const existing = await getOperatorNotificationPrefs(userId);

  const payload = {
    user_id: userId,
    email_on_critical_support: input.emailOnCriticalSupport ?? existing.emailOnCriticalSupport,
    email_on_new_tenant: input.emailOnNewTenant ?? existing.emailOnNewTenant,
    email_digest_hours: input.emailDigestHours ?? existing.emailDigestHours,
    channels: (input.channels ?? existing.channels) as Json,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("operator_notification_prefs")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update notification preferences");

  await logAuditEvent(userId, {
    action: "operator.notification_prefs_updated",
    targetType: "operator_notification_prefs",
    targetId: userId,
    details: { fields: Object.keys(input) },
  });

  return mapPrefs(data as PrefsRow);
}
