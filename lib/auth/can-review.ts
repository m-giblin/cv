import { getAccessTier } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

function isInManagerOrg(
  profiles: Array<{ id: string; manager_id: string | null }>,
  managerId: string,
  targetUserId: string,
) {
  let current = profiles.find((profile) => profile.id === targetUserId)?.manager_id ?? null;

  while (current) {
    if (current === managerId) {
      return true;
    }
    current = profiles.find((profile) => profile.id === current)?.manager_id ?? null;
  }

  return false;
}

export async function canReviewUserWork(targetUserId: string) {
  const supabase = await createClient();
  if (!supabase) {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === targetUserId) {
    return false;
  }

  const { data: profiles, error } = await supabase.from("profiles").select("id, role, manager_id");

  if (error || !profiles?.length) {
    return false;
  }

  const reviewer = profiles.find((profile) => profile.id === user.id);
  if (!reviewer) {
    return false;
  }

  const tier = getAccessTier(reviewer.role as ProfileRole);

  if (tier === "admin") {
    return profiles.some((profile) => profile.id === targetUserId);
  }

  if (tier === "manager") {
    return isInManagerOrg(profiles, user.id, targetUserId);
  }

  return false;
}
