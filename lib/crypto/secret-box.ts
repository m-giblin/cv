import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const PREFIX = "v1:";
const SCRYPT_SALT = "se-platform-secrets-v1";

function resolveEncryptionKey(): Buffer {
  const raw = process.env.PLATFORM_SECRETS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("PLATFORM_SECRETS_ENCRYPTION_KEY is not configured");
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to scrypt derivation for passphrase-style values.
  }

  return scryptSync(raw, SCRYPT_SALT, 32);
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

export function encryptSecret(plaintext: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${encrypted.toString("base64url")}:${tag.toString("base64url")}`;
}

export function decryptSecret(ciphertext: string): string {
  if (!isEncryptedSecret(ciphertext)) {
    throw new Error("Secret is not in encrypted format");
  }

  const payload = ciphertext.slice(PREFIX.length);
  const [ivPart, encryptedPart, tagPart] = payload.split(":");
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error("Encrypted secret payload is malformed");
  }

  const key = resolveEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
