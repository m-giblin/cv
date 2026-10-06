import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user when Supabase auth is available; otherwise null.
 * Cached per request: getUser() is a network round trip to the auth server, and the layout and
 * page loaders each need it, so they share one call.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
