import { cache } from "react";
import { getDemoDashboardData, getSubtree } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLog, DashboardData, Notification, Profile } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import { fetchPlansBundle } from "@/lib/data/fetch-plans-bundle";

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
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export type AdminPageData = Pick<
  DashboardData,
  "currentUser" | "myOrg" | "profiles" | "plans" | "activity" | "notifications"
>;

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

  const [profilesResult, activityResult, notificationsResult, plans] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at"),
    supabase
      .from("activity_logs")
      .select("id, user_id, event_type, title, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    fetchPlansBundle(supabase),
  ]);

  if (profilesResult.error || !profilesResult.data?.length) {
    return null;
  }

  const profiles = profilesResult.data.map(mapProfile);
  const currentUser = profiles.find((profile) => profile.id === user.id) ?? profiles[0];

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
    myOrg: getSubtree(currentUser.id, profiles),
    profiles,
    plans,
    activity,
    notifications,
  };
}

export const getAdminPageData = cache(async (): Promise<{ data: AdminPageData; source: DataSource }> => {
  try {
    const live = await fetchSupabaseAdminPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // Fall through to demo data.
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
