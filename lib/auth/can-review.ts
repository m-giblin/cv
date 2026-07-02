import { getAccessTier } from "@/lib/auth/rbac";
import { getDashboardData } from "@/lib/data/get-dashboard-data";

export async function canReviewUserWork(targetUserId: string) {
  const { data } = await getDashboardData();
  const reviewerId = data.currentUser.id;

  if (reviewerId === targetUserId) {
    return false;
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
