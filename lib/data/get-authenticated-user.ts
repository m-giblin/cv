import { cache } from "react";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user when Supabase auth is available; otherwise null.
 * Cached per request so the layout and page loaders share one check. The token is verified
 * locally (see getVerifiedUser), not with a round trip to the auth server.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  return getVerifiedUser(supabase);
});
