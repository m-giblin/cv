import { redirect } from "next/navigation";
import { getAccessTier, getHomeRoute } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import type { ProfileRole } from "@/lib/types";

export async function requireSuperAdminPageAccess() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, level, manager_id, tenant_id, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileRow) {
    redirect("/login");
  }

  const currentUser = mapProfile(profileRow);
  const tier = getAccessTier(currentUser.role);

  if (tier !== "super_admin") {
    redirect(getHomeRoute(tier));
  }

  return { currentUser, tier, role: currentUser.role as ProfileRole };
}
