import { redirect } from "next/navigation";
import { canAccessRoute, getHomeRoute } from "@/lib/auth/rbac";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
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
import {
  getSimulationsPageData,
  getSimulationsPageDataForTier,
  simulationsPageDataAsDashboardSlice,
} from "@/lib/data/get-simulations-page-data";
import type { AccessTier } from "@/lib/auth/rbac";
import type { ChallengesPageData } from "@/lib/data/get-challenges-page-data";
import type { SimulationsPageData } from "@/lib/data/get-simulations-page-data";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import type { DashboardData, ProfileRole } from "@/lib/types";

async function resolvePageTier(role: ProfileRole, profileTenantId: string | null): Promise<AccessTier> {
  const access = await getEffectiveAccess(role, profileTenantId);
  return access.tier;
}

export async function requireMyPracticePageAccess() {
  const { data, source } = await getDashboardPageData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/my-practice")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireDashboardPageAccess() {
  const { data, source } = await getDashboardPageData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/dashboard")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireManagerPageAccess() {
  const { data, source } = await getManagerPageData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/manager")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireAppAccess(pathname: string) {
  const { data, source } = await getDashboardData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, pathname)) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireAdminPageAccess() {
  const { data, source } = await getAdminPageData();
  const access = await getEffectiveAccess(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(access.tier, "/admin")) {
    redirect(getHomeRoute(access.tier));
  }

  return {
    data,
    source,
    tier: access.tier,
    role: data.currentUser.role as ProfileRole,
    tenantId: access.tenantId,
    isShadowing: access.isShadowing,
  };
}

export async function requireLabPageAccess() {
  const { data, source } = await getLabPageData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/lab")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requirePitchPageAccess() {
  const { data, source } = await getPitchPageData();
  const tier = await resolvePageTier(data.currentUser.role, data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/pitch")) {
    redirect(getHomeRoute(tier));
  }

  return { data, source, tier, role: data.currentUser.role as ProfileRole };
}

export async function requireSimulationsPageAccess(): Promise<{
  data: SimulationsPageData;
  dashboard: DashboardData;
  source: DataSource;
  tier: AccessTier;
  role: ProfileRole;
}> {
  const probe = await getSimulationsPageData();
  const tier = await resolvePageTier(probe.data.currentUser.role, probe.data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/simulations")) {
    redirect(getHomeRoute(tier));
  }

  const { data, source } =
    tier === "se" ? probe : await getSimulationsPageDataForTier(tier === "super_admin" ? "admin" : tier);

  return {
    data,
    dashboard: simulationsPageDataAsDashboardSlice(data),
    source,
    tier,
    role: data.currentUser.role as ProfileRole,
  };
}

export async function requireChallengesPageAccess(): Promise<{
  data: ChallengesPageData;
  dashboard: DashboardData;
  source: DataSource;
  tier: AccessTier;
  role: ProfileRole;
}> {
  const probe = await getChallengesPageData();
  const tier = await resolvePageTier(probe.data.currentUser.role, probe.data.currentUser.tenantId ?? null);

  if (!canAccessRoute(tier, "/challenges")) {
    redirect(getHomeRoute(tier));
  }

  const { data, source } =
    tier === "se" ? probe : await getChallengesPageDataForTier(tier === "super_admin" ? "admin" : tier);

  return {
    data,
    dashboard: challengesPageDataAsDashboardSlice(data),
    source,
    tier,
    role: data.currentUser.role as ProfileRole,
  };
}
