import "server-only";

import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantWebhook } from "@/lib/tenant/types";

type WebhookRow = {
  id: string;
  tenant_id: string;
  url: string;
  secret_ciphertext: string | null;
  events: string[] | null;
  enabled: boolean;
  created_at: string;
};

function mapWebhook(row: WebhookRow): TenantWebhook {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    url: row.url,
    hasSecret: Boolean(row.secret_ciphertext),
    events: row.events ?? [],
    enabled: row.enabled,
    createdAt: row.created_at,
  };
}

export async function listTenantWebhooks(tenantId: string): Promise<TenantWebhook[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("tenant_webhooks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => mapWebhook(row as WebhookRow));
}

export type CreateTenantWebhookInput = {
  url: string;
  secret?: string | null;
  events: string[];
  enabled?: boolean;
};

export async function createTenantWebhook(
  tenantId: string,
  input: CreateTenantWebhookInput,
  actorId: string,
): Promise<TenantWebhook> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data, error } = await admin
    .from("tenant_webhooks")
    .insert({
      tenant_id: tenantId,
      url: input.url,
      secret_ciphertext: input.secret ? encryptSecret(input.secret) : null,
      events: input.events,
      enabled: input.enabled ?? true,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create webhook");

  await logAuditEvent(actorId, {
    action: "tenant.webhook_created",
    targetType: "tenant_webhook",
    targetId: data.id,
    tenantId,
    details: { url: input.url, events: input.events },
  });

  return mapWebhook(data as WebhookRow);
}

export async function deleteTenantWebhook(
  tenantId: string,
  webhookId: string,
  actorId: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { error } = await admin
    .from("tenant_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  await logAuditEvent(actorId, {
    action: "tenant.webhook_deleted",
    targetType: "tenant_webhook",
    targetId: webhookId,
    tenantId,
    details: {},
  });
}

/** Internal use only — decrypts the webhook secret for outbound signing. Never expose over the API. */
export async function getTenantWebhookSecret(webhookId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("tenant_webhooks")
    .select("secret_ciphertext")
    .eq("id", webhookId)
    .maybeSingle();

  if (!data?.secret_ciphertext) return null;
  return decryptSecret(data.secret_ciphertext);
}
