import { redirect } from "next/navigation";
import { canAccessRoute, getAccessTier, getHomeRoute } from "@/lib/auth/rbac";
import { getAdminPageData } from "@/lib/data/get-admin-page-data";
import {
  challengesPageDataAsDashboardSlice,
  getChallengesPageData,
  getChallengesPageDataForTier,
} from "@/lib/data/get-challenges-page-data";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { getDashboardPageData } from "@/lib/data/get-dashboard-page-data";
import { getManagerPageData } from "@/lib/data/get-manager-page-data";
import { getLabPageData } from "@/lib/data/get-lab-page-data";
import { getPitchPageData } from "@/lib/data/get-pitch-page-data";
import type { ChallengesPageData } from "@/lib/data/get-challenges-page-data";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import type { DashboardData, ProfileRole } from "@/lib/types";

export async function requireDashboardPageAccess() {
  const { data, source } = await getDashboardPageData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, "/dashboard")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireManagerPageAccess() {
  const { data, source } = await getManagerPageData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, "/manager")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireAppAccess(pathname: string) {
  const { data, source } = await getDashboardData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, pathname)) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireAdminPageAccess() {
  const { data, source } = await getAdminPageData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, "/admin")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireLabPageAccess() {
  const { data, source } = await getLabPageData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, "/lab")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requirePitchPageAccess() {
  const { data, source } = await getPitchPageData();
  const tier = getAccessTier(data.currentUser.role);

  if (!canAccessRoute(tier, "/pitch")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireChallengesPageAccess(): Promise<{
  data: ChallengesPageData;
  dashboard: DashboardData;
  source: DataSource;
  tier: "se" | "manager" | "admin";
  role: ProfileRole;
}> {
  const probe = await getChallengesPageData();
  const tier = getAccessTier(probe.data.currentUser.role);

  if (!canAccessRoute(tier, "/challenges")) {
    redirect(getHomeRoute(tier));
  }

  const { data, source } = tier === "se" ? probe : await getChallengesPageDataForTier(tier);

  return {
    data,
    dashboard: challengesPageDataAsDashboardSlice(data),
    source,
    tier,
    role: data.currentUser.role as ProfileRole,
  };
}
