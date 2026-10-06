import "server-only";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/crypto/secret-box";

/**
 * OAuth tokens for third-party integrations are stored encrypted at rest, the same way
 * platform AI keys (platform_settings.api_key_ciphertext) and outbound webhook secrets
 * (tenant_webhooks.secret_ciphertext) already are.
 *
 * Reads tolerate legacy plaintext rows written before this was introduced, so existing
 * connections keep working until they are re-authorised or migrated.
 */
export function sealOAuthToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (isEncryptedSecret(token)) return token;
  return encryptSecret(token);
}

export function openOAuthToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncryptedSecret(stored)) {
    // Legacy plaintext row.
    return stored;
  }
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}
