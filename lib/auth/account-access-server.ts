import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVATION_MAX_ATTEMPTS,
  checkActivation,
  newActivation,
  newTemporaryPassword,
  passwordProblem,
  type AccessMetadata,
} from "@/lib/auth/account-access";

type Admin = SupabaseClient;

/** Issues a new activation code (replacing any earlier one) and returns it once. */
export async function issueActivationCode(admin: Admin, userId: string) {
  const { code, state } = newActivation(userId);
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { activation: state } satisfies AccessMetadata });
  if (error) throw new Error(error.message);
  return { code, expiresAt: state.expiresAt };
}

/** Sets a temporary password the person must replace at first sign-in, and returns it once. */
export async function setTemporaryPassword(admin: Admin, userId: string, password = newTemporaryPassword()) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    // A temporary password also ends any activation code still out there.
    app_metadata: { must_change_password: true, activation: null } satisfies AccessMetadata,
  });
  if (error) throw new Error(error.message);
  return { password };
}

/** Same message for every failure, so the form can't be used to find out who has an account. */
export const ACTIVATION_FAILED = "That email and code don't match an account waiting to be activated, or the code has expired. Ask your admin for a new code.";

/**
 * Checks an activation code and, if it's right, sets the person's own password and voids the code.
 * Wrong codes count toward ACTIVATION_MAX_ATTEMPTS.
 */
export async function redeemActivationCode(admin: Admin, input: { email: string; code: string; password: string }) {
  const problem = passwordProblem(input.password);
  if (problem) return { ok: false as const, error: problem };

  const { data: profile } = await admin.from("profiles").select("id").eq("email", input.email.trim().toLowerCase()).maybeSingle();
  const userId = (profile as { id: string } | null)?.id;
  if (!userId) return { ok: false as const, error: ACTIVATION_FAILED };
  const { data } = await admin.auth.admin.getUserById(userId);
  const metadata = (data.user?.app_metadata ?? {}) as AccessMetadata;
  const result = checkActivation(metadata.activation, userId, input.code);

  if (result === "wrong") {
    const attempts = (metadata.activation?.attempts ?? 0) + 1;
    await admin.auth.admin.updateUserById(userId, { app_metadata: { activation: { ...metadata.activation!, attempts } } satisfies AccessMetadata });
    return {
      ok: false as const,
      error: attempts >= ACTIVATION_MAX_ATTEMPTS ? "Too many wrong tries. Ask your admin for a new code." : ACTIVATION_FAILED,
    };
  }
  if (result === "locked") return { ok: false as const, error: "Too many wrong tries. Ask your admin for a new code." };
  if (result !== "ok") return { ok: false as const, error: ACTIVATION_FAILED };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: input.password,
    app_metadata: { activation: null, must_change_password: false } satisfies AccessMetadata,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, userId };
}

/**
 * Replaces a temporary password with the person's own and lifts the first-sign-in block. Only for
 * people on a temporary password: everyone else changes theirs through the MFA step-up on the
 * account page, which this would otherwise skip.
 */
export async function completePasswordChange(admin: Admin, userId: string, password: string) {
  const problem = passwordProblem(password);
  if (problem) return { ok: false as const, error: problem };
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!(data.user?.app_metadata as AccessMetadata | undefined)?.must_change_password) {
    return { ok: false as const, error: "Change your password from your account page." };
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    app_metadata: { must_change_password: false } satisfies AccessMetadata,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
