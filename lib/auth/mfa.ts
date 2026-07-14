import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export type MfaStatus =
  | { state: "no_session" }
  | { state: "aal2" }
  | { state: "needs_enrollment" }
  | { state: "needs_verification" };

export async function getMfaStatus(
  supabase: SupabaseClient<Database>,
  existingUser?: User | null,
): Promise<MfaStatus> {
  const user =
    existingUser ??
    (
      await supabase.auth.getUser()
    ).data.user;

  if (!user) {
    return { state: "no_session" };
  }

  const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || !aal) {
    return { state: "needs_enrollment" };
  }

  if (aal.currentLevel === "aal2") {
    return { state: "aal2" };
  }

  if (aal.nextLevel === "aal2") {
    return { state: "needs_verification" };
  }

  return { state: "needs_enrollment" };
}

export function mfaRedirectPath(status: MfaStatus): string | null {
  switch (status.state) {
    case "no_session":
      return AUTH_ROUTES.login;
    case "needs_enrollment":
      return AUTH_ROUTES.mfaEnroll;
    case "needs_verification":
      return AUTH_ROUTES.mfaVerify;
    case "aal2":
      return null;
  }
}
