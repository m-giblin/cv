import "server-only";

import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantSsoConfig, TenantSsoProvider } from "@/lib/tenant/types";

type SsoRow = {
  tenant_id: string;
  enabled: boolean;
  provider: string;
  sso_domain: string | null;
  metadata: unknown;
  metadata_ciphertext: string | null;
  updated_at: string;
};

/**
 * Metadata is encrypted at rest (it commonly embeds IdP certs/secrets), but
 * unlike webhook secrets it needs to be readable by the authorized operator
 * to edit — so this decrypts rather than masking. Falls back to the legacy
 * plaintext `metadata` column for rows saved before the encryption migration
 * that haven't been re-saved since.
 */
function resolveMetadata(row: SsoRow): Record<string, unknown> {
  if (row.metadata_ciphertext) {
    try {
      return JSON.parse(decryptSecret(row.metadata_ciphertext)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (row.metadata ?? {}) as Record<string, unknown>;
}

function mapSsoConfig(row: SsoRow): TenantSsoConfig {
  return {
    tenantId: row.tenant_id,
    enabled: row.enabled,
    provider: (row.provider as TenantSsoProvider) ?? "saml",
    ssoDomain: row.sso_domain,
    metadata: resolveMetadata(row),
    updatedAt: row.updated_at,
  };
}

const DEFAULT_SSO_CONFIG = (tenantId: string): TenantSsoConfig => ({
  tenantId,
  enabled: false,
  provider: "saml",
  ssoDomain: null,
  metadata: {},
  updatedAt: new Date(0).toISOString(),
});

export async function getTenantSsoConfig(tenantId: string): Promise<TenantSsoConfig> {
  const admin = createAdminClient();
  if (!admin) return DEFAULT_SSO_CONFIG(tenantId);

  const { data } = await admin
    .from("tenant_sso_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data ? mapSsoConfig(data as SsoRow) : DEFAULT_SSO_CONFIG(tenantId);
}

export type UpdateTenantSsoInput = {
  enabled?: boolean;
  provider?: TenantSsoProvider;
  ssoDomain?: string | null;
  metadata?: Record<string, unknown>;
};

export async function updateTenantSsoConfig(
  tenantId: string,
  input: UpdateTenantSsoInput,
  actorId: string,
): Promise<TenantSsoConfig> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data: existing } = await admin
    .from("tenant_sso_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const existingMetadata = existing ? resolveMetadata(existing as SsoRow) : {};
  const nextMetadata = input.metadata !== undefined ? input.metadata : existingMetadata;

  const payload = {
    tenant_id: tenantId,
    enabled: input.enabled ?? existing?.enabled ?? false,
    provider: input.provider ?? (existing?.provider as TenantSsoProvider) ?? "saml",
    sso_domain: input.ssoDomain !== undefined ? input.ssoDomain : existing?.sso_domain ?? null,
    metadata: {},
    metadata_ciphertext: encryptSecret(JSON.stringify(nextMetadata)),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("tenant_sso_configs")
    .upsert(payload, { onConflict: "tenant_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update SSO configuration");

  await logAuditEvent(actorId, {
    action: "tenant.sso_updated",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    details: { enabled: payload.enabled, provider: payload.provider },
  });

  return mapSsoConfig(data as SsoRow);
}
