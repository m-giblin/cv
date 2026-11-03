/** Account access rules and shapes, safe for the browser (account-access.ts holds the crypto). */

/** How long an activation code works, and how many wrong tries before it's void. */
export const ACTIVATION_TTL_HOURS = 72;
export const ACTIVATION_MAX_ATTEMPTS = 5;
export const PASSWORD_MIN_LENGTH = 8;

export type ActivationState = { hash: string; expiresAt: string; attempts: number };

/** What we keep in app_metadata. `must_change_password` is read by middleware from the session. */
export type AccessMetadata = { activation?: ActivationState | null; must_change_password?: boolean };

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  return null;
}
