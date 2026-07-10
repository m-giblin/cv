import { cache } from "react";
import { getDemoDashboardData, getSubtree } from "@/lib/demo-data";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { getAccessTier } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { ActivityLog, DashboardData, Notification, Profile } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

function mapProfile(row: Pick<DbProfile, "id" | "email" | "full_name" | "role" | "level" | "manager_id" | "avatar_url" | "created_at">): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    level: row.level,
    managerId: row.manager_id,
    tenantId: (row as { tenant_id?: string | null }).tenant_id ?? null,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export type AdminPageData = Pick<
  DashboardData,
  "currentUser" | "myOrg" | "profiles" | "plans" | "activity" | "notifications"
>;

async function fetchSupabaseAdminPageDataForTenant(
  tenantId: string,
  userId: string,
): Promise<AdminPageData | null> {
  const admin = getTenantAdminClient();
  const supabase = await createClient();

  if (!admin || !supabase) {
    return null;
  }

  const [profilesResult, activityResult, notificationsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("tenant_id", tenantId),
    admin
      .from("activity_logs")
      .select("id, user_id, event_type, title, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (profilesResult.error) {
    return null;
  }

  const profiles = (profilesResult.data ?? []).map(mapProfile);
  const { data: operatorProfile } = await admin
    .from("profiles")
    .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!operatorProfile) {
    return null;
  }

  const currentUser = profiles.find((profile) => profile.id === userId) ?? mapProfile(operatorProfile);
  const userIds = profiles.map((profile) => profile.id);
  const plans = userIds.length > 0 ? await fetchPlansForUsers(admin, userIds, tenantId) : [];

  const activity: ActivityLog[] = ((activityResult.data ?? []) as DbActivityLog[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as ActivityLog["eventType"],
    title: row.title,
    metadata: (row.metadata as Record<string, string | number | boolean | null>) ?? {},
    createdAt: row.created_at,
  }));

  const notifications: Notification[] = ((notificationsResult.data ?? []) as DbNotification[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  return {
    currentUser,
    myOrg: profiles.length > 0 ? getSubtree(currentUser.id, profiles) : [],
    profiles,
    plans,
    activity,
    notifications,
  };
}

async function fetchSupabaseAdminPageData(): Promise<AdminPageData | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: operatorProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!operatorProfile) {
    return null;
  }

  const currentUser = mapProfile(operatorProfile);
  const access = await getEffectiveAccess(currentUser.role, currentUser.tenantId ?? null);
  const tenantId = access.tenantId ?? currentUser.tenantId;

  if (!tenantId) {
    return null;
  }

  if (!access.isShadowing && getAccessTier(currentUser.role) !== "admin") {
    return null;
  }

  return fetchSupabaseAdminPageDataForTenant(tenantId, user.id);
}

export const getAdminPageData = cache(async (): Promise<{ data: AdminPageData; source: DataSource }> => {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  try {
    const live = await fetchSupabaseAdminPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // Fall through to empty or demo data.
  }

  if (user && supabase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return {
        data: {
          currentUser: mapProfile(profile),
          myOrg: [],
          profiles: [],
          plans: [],
          activity: [],
          notifications: [],
        },
        source: "supabase",
      };
    }
  }

  const demo = getDemoDashboardData();
  return {
    data: {
      currentUser: demo.currentUser,
      myOrg: demo.myOrg,
      profiles: demo.profiles,
      plans: demo.plans,
      activity: demo.activity,
      notifications: demo.notifications,
    },
    source: "demo",
  };
});
