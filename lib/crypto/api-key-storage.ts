import "server-only";

import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/crypto/secret-box";

export function sealApiKey(plaintext: string): string {
  return encryptSecret(plaintext.trim());
}

export function openApiKey(stored: string | null | undefined): string | null {
  if (!stored?.trim()) {
    return null;
  }

  if (isEncryptedSecret(stored)) {
    return decryptSecret(stored);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Legacy plaintext API key detected in production — re-save AI settings to encrypt.");
    return null;
  }

  console.warn(
    "platform_settings.api_key_ciphertext contains a legacy plaintext key; re-save AI settings to encrypt it.",
  );
  return stored;
}

export function hasStoredApiKey(stored: string | null | undefined): boolean {
  return Boolean(stored?.trim());
}
