import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * The signed-in user, verified from the session token's signature instead of a round trip to the
 * auth server. The project signs tokens with an asymmetric key, so getClaims() checks them locally
 * against the cached public key (and still refreshes an expired session). The code only reads id
 * and email from the auth user; everything else comes from profiles.
 */
export async function getVerifiedUser(supabase: SupabaseClient<never> | SupabaseClient): Promise<User | null> {
  const { data, error } = await (supabase as SupabaseClient).auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    phone: typeof claims.phone === "string" ? claims.phone : undefined,
    aud: typeof claims.aud === "string" ? claims.aud : "authenticated",
    role: typeof claims.role === "string" ? claims.role : undefined,
    app_metadata: (claims.app_metadata as User["app_metadata"]) ?? {},
    user_metadata: (claims.user_metadata as User["user_metadata"]) ?? {},
    is_anonymous: Boolean(claims.is_anonymous),
    created_at: "",
  };
}
