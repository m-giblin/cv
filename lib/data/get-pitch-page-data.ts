import { cache } from "react";
import { getDemoDashboardData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Notification, Profile } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import type { DataSource } from "@/lib/data/get-dashboard-data";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

function mapProfile(
  row: Pick<DbProfile, "id" | "email" | "full_name" | "role" | "level" | "manager_id" | "avatar_url" | "created_at">,
): Profile {
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

export type PitchPageData = {
  currentUser: Profile;
  notifications: Notification[];
};

async function fetchSupabasePitchPageData(): Promise<PitchPageData | null> {
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

  const [profileResult, notificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

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
    currentUser: mapProfile(profileResult.data),
    notifications,
  };
}

export const getPitchPageData = cache(async (): Promise<{ data: PitchPageData; source: DataSource }> => {
  try {
    const live = await fetchSupabasePitchPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  const demo = getDemoDashboardData();
  return {
    data: { currentUser: demo.currentUser, notifications: demo.notifications },
    source: "demo",
  };
});
