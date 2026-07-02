import { redirect } from "next/navigation";
import { AccessTier, canAccessRoute, getAccessTier, getHomeRoute } from "@/lib/auth/rbac";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { ProfileRole } from "@/lib/types";

export async function requireAppAccess(pathname: string) {
  const { data, source } = await getDashboardData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, pathname)) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}
