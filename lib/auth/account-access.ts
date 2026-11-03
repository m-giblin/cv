import { createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Getting a new person into their account without email: corporate filters quarantine Supabase's
 * emails or open their one-time links before the person can. Instead an admin hands over either
 * an activation code (the person sets their own password at /login/activate) or a temporary
 * password (they must replace it at first sign-in). Both live in the auth user's app_metadata,
 * which only the service role can write.
 */

import { ACTIVATION_MAX_ATTEMPTS, ACTIVATION_TTL_HOURS, type ActivationState } from "@/lib/auth/account-access-rules";

export {
  ACTIVATION_MAX_ATTEMPTS,
  ACTIVATION_TTL_HOURS,
  PASSWORD_MIN_LENGTH,
  passwordProblem,
  type AccessMetadata,
  type ActivationState,
} from "@/lib/auth/account-access-rules";

function secret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET;
  if (!key) throw new Error("No server secret is configured for activation codes.");
  return `account-activation:${key}`;
}

/** Only a keyed hash of the code is stored, bound to the person it was issued for. */
export function hashActivationCode(userId: string, code: string) {
  return createHmac("sha256", secret()).update(`${userId}:${normalizeActivationCode(code)}`).digest("base64url");
}

/** People type codes with spaces or dashes ("4829 1375", "4829-1375"). */
export function normalizeActivationCode(code: string) {
  return code.replace(/\D/g, "");
}

/** Eight digits, shown as "4829-1375". */
export function newActivationCode() {
  const digits = String(randomInt(0, 100_000_000)).padStart(8, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function newActivation(userId: string, now = Date.now()): { code: string; state: ActivationState } {
  const code = newActivationCode();
  return {
    code,
    state: { hash: hashActivationCode(userId, code), expiresAt: new Date(now + ACTIVATION_TTL_HOURS * 3_600_000).toISOString(), attempts: 0 },
  };
}

export type ActivationCheck = "ok" | "missing" | "expired" | "locked" | "wrong";

export function checkActivation(state: ActivationState | null | undefined, userId: string, code: string, now = Date.now()): ActivationCheck {
  if (!state?.hash) return "missing";
  if (Date.parse(state.expiresAt) < now) return "expired";
  if (state.attempts >= ACTIVATION_MAX_ATTEMPTS) return "locked";
  const expected = Buffer.from(state.hash);
  const given = Buffer.from(hashActivationCode(userId, code));
  return expected.length === given.length && timingSafeEqual(expected, given) ? "ok" : "wrong";
}

/** A readable temporary password: 14 characters with a digit and a symbol. */
export function newTemporaryPassword() {
  return `${randomBytes(9).toString("base64url").replace(/[-_]/g, "x")}7!`;
}

/** A password nobody knows, for accounts that will be activated with a code. */
export function unusablePassword() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}
