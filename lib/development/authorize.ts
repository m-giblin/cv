import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { getAccessTier } from "@/lib/auth/rbac";

export async function canViewUserDevelopmentPlan(targetUserId: string) {
  const { data } = await getDashboardData();
  const viewerId = data.currentUser.id;

  if (viewerId === targetUserId) {
    return true;
  }

  const tier = getAccessTier(data.currentUser.role);

  if (tier === "admin") {
    return data.profiles.some((profile) => profile.id === targetUserId);
  }

  if (tier === "manager") {
    return data.myOrg.some((profile) => profile.id === targetUserId);
  }

  return false;
}
