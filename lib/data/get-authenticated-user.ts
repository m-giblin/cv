import { createClient } from "@/lib/supabase/server";

/** Returns the signed-in user when Supabase auth is available; otherwise null. */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
